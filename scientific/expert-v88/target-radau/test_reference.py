"""Domain, stale-data, conservation and analytic controls; run in safe-dev."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
import numpy as np
import reference as r


FIXTURE=json.loads((r.HERE/'cases.json').read_bytes())


def model(**changes):
    beam=deepcopy(FIXTURE['beam']); config=deepcopy(FIXTURE['config'])
    beam.update(changes.pop('beam',{})); config.update(changes)
    return r.Model(beam,config)


class RadauControls(unittest.TestCase):
    def test_invalid_domain_rejected_without_floors(self):
        for change in ({'filmConductivityWMK':0},{'diffusivityM2S':-1},{'pulseDuty':1.1},
                {'implantationWeights':[0,0]},{'beam':{'targetColumnM2':-1}},
                {'beam':{'beamEnergyKeV':.5}},{'depthCells':3}):
            with self.subTest(change=change),self.assertRaises(ValueError): model(**change)
        for energy in (0,.8,501,np.nan):
            with self.assertRaises(ValueError): r.atomic(energy,1,2)

    def test_native_atomic_values_match_retained_cpp_execution(self):
        fixture=json.loads((r.ROOT/'scientific/marathon-v35/material/reference/atomic-reference.json').read_bytes())
        for row in fixture:
            expected=row['electronicKeVM2']+row['nuclearKeVM2']
            self.assertAlmostEqual(r.atomic(row['energyKeV'],row['z'],row['massU'])/expected,1.,places=13)

    def test_beam_partition_closes_without_thermal_solver(self):
        m=model(); y=m.initial.copy(); y[:2]=[.2,.7]; y[2:4]=[.5,.2]; y[4:6]=[.3,.1]
        reaction,heat,neutron,escape=m.beam(y)
        self.assertAlmostEqual((sum(heat)+neutron+escape)/(m.b['beamEnergyKeV']+17600*sum(reaction)),1.,places=13)

    def test_full_rhs_species_projectile_and_heat_derivative_identities(self):
        m=model(); y=m.initial.copy(); y[3*m.n:m.offset]=[410,500,440,330]
        derivative=m.rhs(y,True); q=dict(zip(r.LEDGERS,derivative[m.offset:])); n=m.n
        self.assertAlmostEqual(np.mean(derivative[:n])+q['fused']+q['releasedT']-q['addedT'],0.,places=13)
        self.assertAlmostEqual(np.mean(derivative[n:2*n])+q['releasedD']-q['retained']-q['addedD'],0.,places=13)
        self.assertAlmostEqual(q['incident']-q['fused']-q['retained']-q['unretained'],0.,places=13)
        np.testing.assert_allclose(sum(derivative[i*n:(i+1)*n] for i in range(3)),0,atol=1e-14)
        thermal=m.capacity@derivative[3*n:m.offset]
        self.assertLess(abs(thermal+q['coolantEnergy']-q['depositedEnergy'])/q['depositedEnergy'],1e-13)
        self.assertLess(abs(q['incidentEnergy']+q['nuclearEnergy']-q['depositedEnergy']-q['neutronEnergy']-q['escapingAlphaEnergy'])/q['incidentEnergy'],1e-13)

    def test_closed_diffusion_transfers_without_creating_species_or_energy(self):
        m=model(beam={'beamCurrentA':0},renewalRateS=0,releaseAttemptRateS=0,
            surfaceReleaseVelocityMS=0,backPermeationVelocityMS=0,backHeatTransferWM2K=0)
        y=m.initial.copy(); y[:2]=[.8,.2]; y[2:4]=[.2,.8]
        rhs=m.rhs(y,False)
        self.assertLess(rhs[0],0); self.assertGreater(rhs[1],0)
        self.assertAlmostEqual(sum(rhs[:2]),0.,places=14)
        np.testing.assert_array_equal(rhs[6:m.offset],0.)

    def test_radau_release_matches_analytic_and_self_refines(self):
        m=model(beam={'beamCurrentA':0},renewalRateS=0,diffusivityM2S=0,
            releaseAttemptRateS=.7,releaseActivationEV=0,surfaceReleaseVelocityMS=0,
            backPermeationVelocityMS=0,backHeatTransferWM2K=0)
        history=[{'timeS':0,'beamOn':False},{'timeS':1,'beamOn':False}]
        coarse,_=r.integrate(m,history,1e-5); fine,_=r.integrate(m,history,1e-9)
        exact=.6*np.exp(-.7)
        self.assertLess(abs(fine[-1,0]-exact),abs(coarse[-1,0]-exact))
        self.assertLess(abs(fine[-1,0]-exact),1e-10)
        self.assertTrue(m.budgets(fine[-1])['passed'])

    def test_budget_rejects_corruption_and_negative_saved_populations(self):
        m=model(); y=m.initial.copy(); self.assertTrue(m.budgets(y)['passed'])
        for index,value in ((0,-.1),(4,-.1),(m.offset,1),(m.offset+11,100)):
            bad=y.copy(); bad[index]+=value
            self.assertFalse(m.budgets(bad)['passed'])

    def test_radau_pulse_clock_does_not_trust_browser_on_flag(self):
        m=model(); history=[{'timeS':0,'beamOn':False},{'timeS':.01,'beamOn':False}]
        states,_=r.integrate(m,history,1e-7)
        self.assertGreater(states[-1,m.offset+1],0)
        self.assertAlmostEqual(states[-1,m.offset+8],.01,places=13)

    def test_stale_producer_source_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); p=root/'source.ts'; p.write_bytes(b'old')
            packet={'sourceSHA256':{'source.ts':r.sha(p.read_bytes())}}
            p.write_bytes(b'new')
            with self.assertRaisesRegex(ValueError,'Stale source'): r.admit(packet,FIXTURE,root)


if __name__=='__main__': unittest.main()
