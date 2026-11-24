import type {EquationGroupId} from './equation-plots.js';

type Step={text:string;math:string};
type Derivation={title:string;why:string;symbols:string;assumptions:string;steps:readonly Step[]};
const step=(text:string,math:string):Step=>({text,math});
const math=String.raw;
const neutral='Assume ideal neutral gas, rigid rotation, uniform temperature and diffusive equilibrium. There is no net radial flow. This is not a charged-plasma equilibrium.';
const radial:Derivation={
 title:'Radial force balance and density',
 why:'Circular motion needs an inward force. The required pressure change sets how gas density changes from the axis to the wall.',
 symbols:'r is radius; Ω is angular speed; p is pressure; ρ is mass density. For species s, nₛ is number density and mₛ is particle mass. T is temperature; kB is Boltzmann’s constant.',
 assumptions:neutral,
 steps:[
  step('Take outward as positive. Newton’s second law gives inward acceleration for circular motion. The pressure force per volume is minus the pressure gradient.',math`a_r=-\frac{v_\theta^2}{r},\qquad -\frac{dp}{dr}=\rho a_r`),
  step('For rigid rotation, speed is radius times angular speed. Substitute this speed and cancel the minus signs.',math`v_\theta=\Omega r,\qquad \frac{dp}{dr}=\rho\Omega^2r`),
  step('At diffusive equilibrium, use each neutral species’ ideal partial pressure and mass density. Temperature is uniform.',math`p_s=n_sk_BT,\quad \rho_s=m_sn_s,\qquad k_BT\frac{dn_s}{dr}=m_sn_s\Omega^2r`),
  step('Divide by number density and integrate from the axis to the selected radius. Constant temperature and angular speed can move outside the integral.',math`\int_{n_s(0)}^{n_s(r)}\frac{dn_s}{n_s}=\frac{m_s\Omega^2}{k_BT}\int_0^r r'\,dr'=\frac{m_s\Omega^2r^2}{2k_BT}`),
  step('The left side is a logarithm. Apply the exponential to get the density ratio. A larger mass gives a steeper curve.',math`\ln\frac{n_s(r)}{n_s(0)}=\frac{m_s\Omega^2r^2}{2k_BT},\qquad \frac{n_s(r)}{n_s(0)}=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right)`),
 ],
};

export const equationDerivations={
 'plant-electricity':{
  title:'From recoverable heat to net electricity',why:'Fusion energy release does not give electric output directly. Conversion losses and internal electric use reduce the power available to the grid.',
  symbols:'Pth is recoverable thermal power delivered to the converter. η is conversion efficiency. Pgross is generated electricity; Pplant is internal electric use. Pnet is net electric output.',
  assumptions:'Use the same system boundary and averaging interval for all powers. Thermal power already includes its deposited energy sources. No measured Marathon performance is assumed.',
  steps:[step('Multiply recoverable thermal power by conversion efficiency to find gross electricity.',math`P_{\rm gross}=\eta P_{\rm th}`),step('The converter rejects the thermal power that does not become electricity. This is not the complete site heat account.',math`P_{\rm reject,converter}=(1-\eta)P_{\rm th}`),step('Subtract all internal electric use. Negative net output means the plant imports electricity.',math`P_{\rm net}=P_{\rm gross}-P_{\rm plant}=\eta P_{\rm th}-P_{\rm plant}`)],
 },
 'radial-balance':radial,
 pressure:radial,
 density:radial,
 speed:{
  title:'Speed at a radius',why:'Gas farther from the axis travels a longer distance during each turn. Its speed must be larger at the same angular speed.',
  symbols:'s is distance along a circle; r is radius; θ is angle in radians; t is time. Ω is angular speed; vθ is tangential speed.',
  assumptions:'Follow circular bulk motion at a fixed radius. Rigid rotation means the same angular speed at all radii.',
  steps:[step('The arc length equals radius times angle.',math`s=r\theta`),step('Differentiate with respect to time at a fixed radius.',math`v_\theta=\frac{ds}{dt}=r\frac{d\theta}{dt},\qquad \Omega=\frac{d\theta}{dt}`),step('Substitute angular speed. At twice the radius, the speed is twice as large.',math`v_\theta(r)=\Omega r`)],
 },
 composition:{
  title:'Local isotope composition',why:'Density tells us how many particles occupy a volume. Composition tells us what fraction of those particles belong to one isotope.',
  symbols:'ΔV is a small local volume; nℓ and nh are light and heavy number densities. N counts particles; xℓ is local light number fraction.',
  assumptions:'Count two species in the same small volume. Total local density must be positive. Global inventories set the density scales.',
  steps:[step('Convert the two local densities to particle counts in the same volume.',math`N_\ell=n_\ell\Delta V,\qquad N_h=n_h\Delta V`),step('Divide the local light count by the total local count. The common volume cancels.',math`x_\ell=\frac{N_\ell}{N_\ell+N_h}=\frac{n_\ell\Delta V}{(n_\ell+n_h)\Delta V}=\frac{n_\ell}{n_\ell+n_h}`),step('Multiply by 100 for a percentage. This denominator counts all local particles, not all light particles in the vessel.',math`\text{local light percentage}=100x_\ell`)],
 },
 'gas-law':{
  title:'From partial pressure to density',why:'Force balance gives a pressure gradient. The ideal-gas law connects that gradient to a density gradient.',
  symbols:'pₛ is partial pressure; nₛ is number density; ρₛ is mass density; mₛ is particle mass. T is temperature; kB is Boltzmann’s constant; Ω is angular speed; r is radius.',
  assumptions:neutral,
  steps:[step('Use the ideal-gas law for partial pressure. Multiply particle mass by number density to obtain mass density.',math`p_s=n_sk_BT,\qquad \rho_s=m_sn_s`),step('Substitute these relations into the equilibrium pressure balance. Uniform temperature gives the derivative on the left.',math`\frac{dp_s}{dr}=\rho_s\Omega^2r\quad\Longrightarrow\quad k_BT\frac{dn_s}{dr}=m_sn_s\Omega^2r`),step('Divide by nₛkBT. The derivative of a logarithm is the relative density gradient.',math`\frac{1}{n_s}\frac{dn_s}{dr}=\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}`)],
 },
 separation:{
  title:'Equilibrium separation factor',why:'Both isotope densities can increase strongly while their proportions change little. Compare their relative density increases to isolate separation.',
  symbols:'α is separation factor; R is vessel radius; mℓ and mh are particle masses. Ω is angular speed; vwall is gas speed at the stationary wall. T is temperature; kB is Boltzmann’s constant; nₛ is number density.',
  assumptions:neutral+' Both species must be present to define their ratio.',
  steps:[step('Use the equilibrium density ratio for each species at the wall.',math`\frac{n_s(R)}{n_s(0)}=\exp\!\left(\frac{m_s\Omega^2R^2}{2k_BT}\right)`),step('Divide the heavy density increase by the light density increase. Exponents subtract.',math`\alpha=\frac{[n_h/n_\ell]_R}{[n_h/n_\ell]_0}=\exp\!\left(\frac{(m_h-m_\ell)\Omega^2R^2}{2k_BT}\right)`),step('Take the logarithm and substitute the wall speed. Equal masses or zero rotation give α = 1.',math`\Delta m=m_h-m_\ell,\quad v_{\rm wall}=\Omega R,\qquad \ln\alpha=\frac{\Delta m\,v_{\rm wall}^2}{2k_BT}`)],
 },
 'magnetic-force':{
  title:'Magnetic force on a charge',why:'The drive needs a force around the cylinder. The magnetic force turns moving charges across the field.',
  symbols:'q is signed electric charge; v is particle velocity; B is magnetic field. θ is the angle between v and B. × is the vector cross product.',
  assumptions:'The magnetic part of the Lorentz force is an experimentally established law. It is the starting law, not a result of Newton’s law alone.',
  steps:[step('Start with the magnetic part of the Lorentz force law.',math`\mathbf F_B=q\,\mathbf v\times\mathbf B`),step('Only the velocity perpendicular to the field contributes. The cross product sets a direction perpendicular to both vectors.',math`v_\perp=v\sin\theta,\qquad |\mathbf F_B|=|q|vB\sin\theta`),step('The force has no component along the instantaneous velocity. It changes direction but supplies no direct particle work. The electrical supply provides energy.',math`P_B=\mathbf F_B\cdot\mathbf v=q(\mathbf v\times\mathbf B)\cdot\mathbf v=0`)],
 },
 'force-density':{
  title:'From particle force to force per volume',why:'The gas contains ions and electrons. Add their magnetic forces to find the force that turns the charged population.',
  symbols:'nₛ is number density; qₛ is signed charge; uₛ is mean species velocity. J is current density; B is magnetic field; fB is magnetic force per volume.',
  assumptions:'The field is approximately uniform within the small volume. This equation gives the magnetic term; electric and pressure forces are separate terms.',
  steps:[step('Multiply each species’ mean force by its number density. Add the species forces.',math`\mathbf f_B=\sum_s n_sq_s\,\mathbf u_s\times\mathbf B`),step('Current density is the sum of charge times number density times mean velocity.',math`\mathbf J=\sum_s n_sq_s\mathbf u_s`),step('Take the common field outside the sum. Radial current across an axial field gives tangential force.',math`\mathbf f_B=\left(\sum_s n_sq_s\mathbf u_s\right)\times\mathbf B=\mathbf J\times\mathbf B`)],
 },
 momentum:{
  title:'Torque and angular momentum',why:'A force changes motion over time. Angular momentum lets us account for torque and changes in the mass distribution.',
  symbols:'L is angular momentum; ℐ is moment of inertia; Ω is angular speed. dm is a small mass at radius r; vθ is tangential speed. τ is torque; t is time.',
  assumptions:'Each population has one angular speed. The relation L = ℐΩ still holds when its mass distribution changes.',
  steps:[step('A small mass has angular momentum equal to radius times tangential momentum.',math`dL=r v_\theta\,dm=\Omega r^2\,dm`),step('Add all small masses. The integral of mass times radius squared defines moment of inertia.',math`\mathcal I=\int r^2\,dm,\qquad L=\Omega\int r^2\,dm=\mathcal I\Omega`),step('Apply angular momentum conservation with external torques. Include the inertia derivative if mass moves between radii.',math`\frac{dL}{dt}=\tau_{\rm in}-\tau_{\rm loss}=\mathcal I\frac{d\Omega}{dt}+\Omega\frac{d\mathcal I}{dt}`)],
 },
 coupled:{
  title:'Ion and neutral angular momentum',why:'The drive acts on charged gas first. Collisions transfer angular momentum to neutral gas; the stationary wall removes it.',
  symbols:'Li and Ln are ion and neutral angular momenta; Ωi and Ωn are their angular speeds. Γ is collision coefficient; τdrive is drive torque; τwall is wall torque.',
  assumptions:'The reduced model uses collision torque Γ(Ωi − Ωn), with Γ ≥ 0. The reference plots use fixed inertias and coefficients, from rest.',
  steps:[step('Define the speed difference. The linear collision model transfers torque from the faster population to the slower population.',math`\Delta\Omega=\Omega_i-\Omega_n,\qquad \tau_c=\Gamma\Delta\Omega`),step('Subtract collision torque from ions and add it to neutrals. Include drive and wall torques.',math`\frac{dL_i}{dt}=\tau_{\rm drive}-\tau_c,\qquad \frac{dL_n}{dt}=\tau_c-\tau_{\rm wall}`),step('Substitute the collision model to obtain the two equations.',math`\frac{dL_i}{dt}=\tau_{\rm drive}-\Gamma(\Omega_i-\Omega_n),\qquad \frac{dL_n}{dt}=\Gamma(\Omega_i-\Omega_n)-\tau_{\rm wall}`),step('Add the equations. Collision torques cancel because they transfer momentum inside the system.',math`\frac{d(L_i+L_n)}{dt}=\tau_{\rm drive}-\tau_{\rm wall}`)],
 },
 torque:{
  title:'Torque from radial current',why:'Force farther from the axis produces more torque. Integrate the magnetic force over the driven gas region.',
  symbols:'I is inward current magnitude; B is outward axial field magnitude in the end view. H is driven length; r is radius; R and rin are outer and inner drive radii. J is current density.',
  assumptions:'Assume steady radial current, a uniform axial field and full cylindrical symmetry. The result gives positive turning torque for the stated directions.',
  steps:[step('The same current crosses each cylindrical surface. Divide current by that surface area to find current density magnitude.',math`J_r=\frac{I}{2\pi rH}`),step('Multiply tangential force density by shell volume and lever arm r.',math`dV=2\pi rH\,dr,\qquad d\tau=r(J_rB)dV=IBr\,dr`),step('Integrate between the driven radii. The driven length cancels.',math`\tau_{\rm drive}=IB\int_{r_{\rm in}}^R r\,dr=\frac{IB}{2}(R^2-r_{\rm in}^2)`)],
 },
 power:{
  title:'Mechanical and resistive power',why:'Current can produce useful rotation and heat. Separate these energy rates before comparing drive settings.',
  symbols:'W is work; θ is angle; τ is drive torque; Ωi is ion angular speed. P is power; I is current; Ve is resistive voltage; Re is electrical resistance; Fθ is tangential force.',
  assumptions:'Use the reduced drive model and an Ohmic resistance. Re excludes motion-induced voltage. The source also supplies mechanical work.',
  steps:[step('A tangential force does work through an arc. Replace radius times force with torque.',math`dW=F_\theta r\,d\theta=\tau\,d\theta`),step('Divide work by elapsed time. Angle change per time is angular speed.',math`P_{\rm mechanical}=\frac{dW}{dt}=\tau\frac{d\theta}{dt}=\tau\Omega_i`),step('Electrical power is current times voltage. Substitute Ohm’s law for the resistive voltage.',math`P_{\rm Ohmic}=IV_e,\quad V_e=IR_e\quad\Longrightarrow\quad P_{\rm Ohmic}=I^2R_e`)],
 },
 slip:{
  title:'Heat from ion–neutral slip',why:'Collisions can conserve angular momentum while removing rotational energy. The energy difference becomes heat.',
  symbols:'Ωi and Ωn are angular speeds; Γ ≥ 0 is collision coefficient. ΔΩ is their difference; Pc is collision power on rotation. τi and τn are collision torques.',
  assumptions:'Use opposite linear collision torques. For this calculation, keep both inertias fixed and isolate the collision contribution.',
  steps:[step('The torque on ions is minus the transfer torque. The torque on neutrals is plus the same transfer torque.',math`\Delta\Omega=\Omega_i-\Omega_n,\qquad \tau_i=-\Gamma\Delta\Omega,\quad \tau_n=\Gamma\Delta\Omega`),step('Add torque times angular speed for both populations.',math`P_c=\tau_i\Omega_i+\tau_n\Omega_n=-\Gamma\Delta\Omega(\Omega_i-\Omega_n)=-\Gamma(\Delta\Omega)^2`),step('The lost rotational power becomes positive heating. Equal angular speeds give zero slip heating.',math`P_{\rm slip}=-P_c=\Gamma(\Omega_i-\Omega_n)^2\geq0`)],
 },
 energy:{
  title:'The closed-vessel energy account',why:'Stronger drive can also increase temperature and weaken separation. An energy account shows storage and removal as well as input.',
  symbols:'Krotation is rotational kinetic energy; Ugas and Uwall are thermal energies. Pmechanical and POhmic are input powers; Pcooling is power removed. E is total stored energy; t is time.',
  assumptions:'Use a closed vessel with no particle flow. Include gas and wall in the system. The reference plot holds powers constant.',
  steps:[step('Add the energy stores included in the model.',math`E=K_{\rm rotation}+U_{\rm gas}+U_{\rm wall}`),step('Apply the first law: stored energy change equals external input minus removal. Internal friction transfers cancel from this total.',math`\frac{dE}{dt}=P_{\rm mechanical}+P_{\rm Ohmic}-P_{\rm cooling}`),step('For constant powers, integrate over elapsed time. Temperature needs an additional heat-capacity and heat-transfer model.',math`E(t)-E(0)=(P_{\rm mechanical}+P_{\rm Ohmic}-P_{\rm cooling})t`)],
 },
 diffusion:{
  title:'A diffusion timescale',why:'An equilibrium profile says where gas can end up. A transport timescale estimates whether particles can redistribute during a run.',
  symbols:'n is number density; t is time; r is position; D is diffusivity. R is the distance scale; td is the time scale.',
  assumptions:'Use constant-diffusivity scaling. This is an order-of-magnitude estimate, not the exact cylindrical separation time.',
  steps:[step('Start with the one-dimensional diffusion equation to estimate scales.',math`\frac{\partial n}{\partial t}=D\frac{\partial^2n}{\partial r^2}`),step('Replace a time derivative by density change over td. Replace a second spatial derivative by density change over R².',math`\frac{\Delta n}{t_d}\sim D\frac{\Delta n}{R^2}`),step('Cancel the density scale. Boundaries, geometry and rotational drift determine the missing factors.',math`t_d\sim\frac{R^2}{D}`)],
 },
 collection:{
  title:'Purity and recovery of an inner sample',why:'A sample can have a larger light percentage but contain few light particles. The two denominators answer different questions.',
  symbols:'a is sample radius; H is vessel length; nₛ is species number density. N is total vessel inventory; subscripts identify particle counts. Fₛ is the fraction of species s inside the sample. x is the whole-vessel light fraction.',
  assumptions:'Collect all gas inside a selected radius of a closed cylinder. These counts do not describe an extraction flow.',
  steps:[step('Add particle density over cylindrical shells. A shell at a larger radius has more volume.',math`dV=2\pi rH\,dr,\qquad N_{s,\rm inside}=2\pi H\int_0^a n_s(r)r\,dr`),step('Purity divides the sample light count by all sample particles. Recovery divides it by all original light particles.',math`P_\ell=\frac{N_{\ell,\rm inside}}{N_{\ell,\rm inside}+N_{h,\rm inside}},\qquad \eta_\ell=\frac{N_{\ell,\rm inside}}{N_{\ell,\rm vessel}}`),step('Write inside counts as whole-species counts times enclosed fractions. Cancel the total vessel inventory N.',math`N_{\ell,\rm inside}=NxF_\ell,\quad N_{h,\rm inside}=N(1-x)F_h,\qquad P_\ell=\frac{xF_\ell}{xF_\ell+(1-x)F_h},\quad \eta_\ell=F_\ell`),step('For example, keep 10 of 76 light particles in a 100-particle sample. An empty sample has undefined purity; an absent species has undefined recovery.',math`P_\ell=\frac{10}{100}=10\%,\qquad \eta_\ell=\frac{10}{76}\approx13.2\%`)],
 },
 conduction:{
  title:'Heat flux and temperature gradient',why:'A temperature value alone does not tell us heat flow. The temperature difference over distance sets the local conduction rate.',
  symbols:'qr is outward heat flux; k is thermal conductivity, not Boltzmann’s constant. T is temperature; r increases outward; Δr is a small radial distance.',
  assumptions:'Fourier’s law is an empirical local conduction law. Use positive isotropic conductivity. It does not describe radiation, bulk gas flow or rarefied gas effects.',
  steps:[step('Across a small layer, Fourier’s law makes heat flux proportional to the temperature difference per distance. The minus sign gives hot-to-cold flow.',math`q_r\approx-k\frac{T(r+\Delta r)-T(r)}{\Delta r}`),step('Take the limit as layer thickness tends to zero.',math`q_r=-k\frac{\partial T}{\partial r}`),step('For a temperature that decreases outward, the gradient is negative. The outward heat flux is then positive.',math`\frac{\partial T}{\partial r}<0,\quad k>0\quad\Longrightarrow\quad q_r>0`)],
 },
 pumping:{
  title:'Gas load, inlet pressure and pump speed',why:'A larger pump cannot remove the inlet restriction. These relations connect pump capacity to the pressure needed upstream.',
  symbols:'Q is gas load in Pa·m³/s; S is pump speed; C is inlet conductance, both in m³/s. pw, pa and pu are wall, axis and upstream pressures.',
  assumptions:'Use steady gas load with a linear inlet conductance. Hold the rotating wall and axis pressures fixed; assume negligible pump outlet pressure.',
  steps:[step('Pump speed is volume removed per time at the pump inlet pressure. The inlet restriction carries the same steady gas load.',math`Q=Sp_w,\qquad Q=C(p_u-p_a)`),step('Solve the inlet relation for upstream pressure.',math`p_u=p_a+\frac{Q}{C}=p_a+\frac{Sp_w}{C}`),step('Effective speed uses upstream pressure. At a large gas load relative to Cpa, this speed approaches C.',math`S_{\rm eff}=\frac{Q}{p_u}=\frac{Q}{p_a+Q/C}\longrightarrow C`)],
 },
 fuel:{
  title:'Tritium consumption and exhaust inventory',why:'A low burn fraction sends much more tritium through processing than fusion consumes. Processing time determines how much remains there.',
  symbols:'Pf is fusion thermal power; EDT is energy per D–T reaction. ṄT is consumed tritium atoms per second; fb is single-pass burn fraction. τp is mean processing time; mT is tritium atom mass. Mexhaust is exhaust mass in processing.',
  assumptions:'Assume steady D–T operation and 0 < fb ≤ 1. Count only unburned exhaust in processing; exclude breeding, losses and other plant stores.',
  steps:[step('Each reaction uses one tritium atom and releases 17.6 MeV. Convert reaction energy to joules. Divide thermal power by energy per reaction.',math`E_{DT}=17.6\,\mathrm{MeV}\approx2.82\times10^{-12}\,\mathrm{J},\qquad \dot N_T=\frac{P_f}{E_{DT}}`),step('Only fraction fb of injected tritium burns. Subtract consumed flow from injected flow to obtain unburned exhaust.',math`\dot N_{\rm injected}=\frac{\dot N_T}{f_b},\qquad \dot N_{\rm exhaust}=\dot N_T\left(\frac{1}{f_b}-1\right)`),step('At steady flow, particles in processing equal exhaust rate times mean processing time. Multiply by mass per atom.',math`M_{\rm exhaust}=m_T\dot N_{\rm exhaust}\tau_p=m_T\dot N_T\left(\frac{1}{f_b}-1\right)\tau_p`)],
 },
 normalization:{
  title:'Keep each species’ particle count fixed',why:'Rotation changes where particles are, not their total number. Normalize the exponential over cylindrical volume to preserve each species’ inventory.',
  symbols:'R and H are vessel radius and length; v is wall gas speed; Ω is angular speed. βₛ is a dimensionless exponent; y is volume coordinate; Z is its normalization integral; b denotes an exponent. mₛ is particle mass; T is temperature; kB is Boltzmann’s constant.',
  assumptions:neutral+' The cylinder extends to the axis. Each species has a prescribed total particle count.',
  steps:[step('Replace radius with y = r²/R². Equal intervals of y have equal cylindrical volume.',math`y=\frac{r^2}{R^2},\quad dV=2\pi rH\,dr=\pi R^2H\,dy`),step('Write the centrifugal exponent as βₛ times y. βₛ compares rotational and thermal energy.',math`v=\Omega R,\qquad \beta_s=\frac{m_s v^2}{2k_BT},\qquad \frac{m_s\Omega^2r^2}{2k_BT}=\beta_s y`),step('Integrate the density shape over the volume coordinate. At zero exponent, the integrand equals 1.',math`Z(b)=\int_0^1e^{by}\,dy=\frac{e^b-1}{b}\ (b\ne0),\qquad Z(0)=1`),step('Divide the exponential by Z to obtain a shape with volume average 1.',math`q_s(y)=\frac{e^{\beta_s y}}{Z(\beta_s)},\qquad \int_0^1q_s(y)\,dy=1`)],
 },
 'species-density':{
  title:'Species densities from fixed inventories',why:'An axis-to-wall density ratio has no absolute density scale. The prescribed particle counts supply that scale and determine local composition.',
  symbols:'N is total particle inventory; x is whole-vessel light fraction; V = πR²H is volume. R is radius; H is length. qₛ is a density shape with volume average 1; nₛ is species number density.',
  assumptions:neutral+' Both species keep their own inventories. The local composition needs positive total density.',
  steps:[step('Split the total inventory into light and heavy counts.',math`N_L=Nx,\qquad N_H=N(1-x)`),step('Multiply each normalized density shape by its own average number density. This preserves its particle count.',math`n_s(r)=\frac{N_s}{V}q_s(r),\qquad \int_Vn_s\,dV=\frac{N_s}{V}\int_Vq_s\,dV=N_s`),step('Substitute the two species inventories. Divide local light density by total local density to obtain local composition.',math`n_L=\frac{Nx}{V}q_L,\qquad n_H=\frac{N(1-x)}{V}q_H,\qquad X_L(r)=\frac{n_L}{n_L+n_H}`)],
 },
 'species-cut':{
  title:'Species fraction inside a selected radius',why:'A radial composition value does not tell us how many particles a sample contains. Integrate density over its volume.',
  symbols:'c is sample radius divided by vessel radius R. βₛ is the species centrifugal exponent; y = r²/R² is volume coordinate. Fₛ is its enclosed inventory fraction; H is cylinder length. nₛ is species number density.',
  assumptions:neutral+' Use 0 ≤ c ≤ 1. Fₛ describes the normalized shape; recovery of an absent species is undefined.',
  steps:[step('Divide enclosed inventory by whole-vessel inventory. Common density and volume factors cancel.',math`F_s(c)=\frac{\int_0^{cR}n_s(r)\,2\pi rH\,dr}{\int_0^Rn_s(r)\,2\pi rH\,dr}=\frac{\int_0^{c^2}e^{\beta_s y}\,dy}{\int_0^1e^{\beta_s y}\,dy}`),step('For nonzero βₛ, evaluate both integrals. Their common factor 1/βₛ cancels.',math`F_s(c)=\frac{(e^{\beta_s c^2}-1)/\beta_s}{(e^{\beta_s}-1)/\beta_s}=\frac{e^{\beta_s c^2}-1}{e^{\beta_s}-1}`),step('At zero rotation, density is uniform. The enclosed fraction equals the volume fraction, not the radius fraction.',math`\beta_s=0:\quad F_s(c)=\frac{\pi(cR)^2H}{\pi R^2H}=c^2`)],
 },
} satisfies Record<EquationGroupId,Derivation>;
