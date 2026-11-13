"""Independent analytic / SciPy references; no FESTIM assembly imported."""
import numpy as np
from scipy.integrate import quad, solve_ivp
from scipy.sparse import diags
from scipy.sparse.linalg import expm_multiply

KB = 8.6173303e-5  # Match the pinned FESTIM constant; not fitted material data.


def profiles(kind, x, t):
    if kind == "heat-eigenmode":
        return {"temperature": 300 + 50*np.sin(np.pi*x)*np.exp(-.1*np.pi**2*t)}
    if kind == "isotope-shared-trap":
        def rhs(_, y):
            vacancy = .3-y[2]-y[3]
            r = 2*y[:2]*vacancy-.5*y[2:]
            return np.r_[-r, r]
        a = solve_ivp(rhs, [0, .1], [.4, .2, 0, 0], method="Radau",
                      rtol=1e-11, atol=1e-13, dense_output=True)
        b = solve_ivp(rhs, [0, .1], [.4, .2, 0, 0], method="DOP853",
                      rtol=1e-11, atol=1e-13, dense_output=True)
        if not a.success or not b.success:
            raise ArithmeticError("Independent trap oracle failed")
        if np.max(abs(a.sol(t)-b.sol(t))) > 1e-8:
            raise ArithmeticError("Independent trap integrators disagree")
        return {name: np.full_like(x, value) for name, value in
                zip(["D", "T", "D_trapped", "T_trapped"], a.sol(t))}
    integral = (.1*t if kind == "sealed-dt-diffusion" else
                quad(lambda s: 4*np.exp(-.05/(KB*(300+1000*s))), 0, t,
                     epsabs=1e-13, epsrel=1e-13)[0])
    mode = .2*np.cos(np.pi*x)*np.exp(-np.pi**2*integral)
    result = {"D": .6+mode, "T": .4-mode}
    if kind == "thermal-diffusion-coupling":
        result["temperature"] = np.full_like(x, 300+1000*t)
    return result


def fv_reference_check():
    """Independent sparse FV exponential, Richardson checked against exact mode."""
    answers = {}
    for kind in ["sealed-dt-diffusion", "heat-eigenmode"]:
        amplitudes = []
        for n in [128, 256, 512]:
            x, rate = (np.arange(n)+.5)/n, .1*n*n
            mode = np.cos(np.pi*x) if kind == "sealed-dt-diffusion" else np.sin(np.pi*x)
            diagonal = np.full(n, -2*rate)
            diagonal[[0, -1]] = -rate if kind == "sealed-dt-diffusion" else -3*rate
            operator = diags([np.full(n-1, rate), diagonal, np.full(n-1, rate)],
                             [-1, 0, 1], format="csr")
            advanced = expm_multiply(.1*operator, mode, traceA=.1*sum(diagonal))
            amplitudes.append(float(advanced@mode/(mode@mode)))
        richardson = (4*amplitudes[-1]-amplitudes[-2])/3
        error = abs(richardson-np.exp(-.01*np.pi**2))
        answers[kind] = {"amplitudes": amplitudes, "richardsonError": error}
        if error > 1e-8:
            raise ArithmeticError("Sparse FV exponential oracle failed")
    return answers
