import copy
import gzip
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import compare86 as comparison


def flow_fixture():
    names=['linear-finite-te1','linear-finite-te2.5-source','quadratic-finite-te1','quadratic-finite-te2.5-source']
    return dict(scenarios=[dict(name=s) for s in names],cases=[
        dict(label=f'{s}-a{a}-r{n}',scenario=s,anodeCenterM=a,nr=n,maxDtS=1e-7,completed=True)
        for s in names for a in (.07,.08) for n in (32,64)])


def index_fixture(flow):
    return dict(groups=[dict(label=label,**{k:v for k,v in meta.items() if k!='flowCompleted'},completed=True)
        for label,meta in comparison.expected_groups(flow).items()])


def optical_fixture():
    locations=[dict(id='a',radiusM=.01),dict(id='b',radiusM=.03)]
    closures=[]
    for c in ('linear','sqrt'):
        spectra=[]
        for t in comparison.optical86.TEMPERATURES:
            for g in comparison.optical86.INSTRUMENTS:
                for i,p in enumerate(locations):
                    spectra.append(dict(id=p['id'],temperatureK=t,instrumentSigmaMS=g,
                        spectralGate=True,fluxGate=True,opticalSpectrumMeshGate=True,losQuadratureGate=True,
                        refinements=[dict(binWidthMS=d,centroidMS=10.+i,modeMS=10.+i) for d in (10.,5.,2.5)],
                        losQuadrature=[dict(order=n) for n in (2,4,8)]))
        closures.append(dict(edgeClosure=c,spectra=spectra,centroidMeshes=[dict(mesh=n,velocityMS=[10.,11.]) for n in (64,128,256)]))
    return dict(locations=locations,brightness=[dict(radiusM=0.,brightness=1.)],targetVelocityRead=False,
        experimentalQualification=False,cases=[dict(beta='meridional-current',voltageV=None,refinement=4,closures=closures)])


class OpticalComparisonControls(unittest.TestCase):
    def test_all_fixed_groups_and_times_are_required(self):
        flow=flow_fixture(); expected=comparison.expected_groups(flow)
        self.assertEqual(len(expected),64)
        self.assertEqual({e['timeS'] for e in expected.values()},set(comparison.TIMES))
        self.assertEqual(comparison.validate_index(flow,index_fixture(flow)),expected)
        for mutate in ('missing','duplicate','wrongtime'):
            index=index_fixture(flow)
            if mutate=='missing': index['groups'].pop()
            elif mutate=='duplicate': index['groups'][-1]=copy.deepcopy(index['groups'][0])
            else: index['groups'][0]['timeS']=3e-6
            with self.assertRaises(ValueError): comparison.validate_index(flow,index)

    def test_duplicate_or_missing_flow_branch_is_rejected(self):
        for mutate in ('missing','duplicate','unknown'):
            flow=flow_fixture()
            if mutate=='missing': flow['cases'].pop()
            elif mutate=='duplicate': flow['cases'][-1]=copy.deepcopy(flow['cases'][0])
            else: flow['cases'][-1]['scenario']='not-a-frozen-scenario'
            with self.assertRaises(ValueError): comparison.expected_groups(flow)

    def test_failed_flow_requires_each_fixed_time_and_cannot_become_completed_optics(self):
        flow=flow_fixture(); flow['cases'][0]['completed']=False
        index=index_fixture(flow)
        with self.assertRaises(ValueError): comparison.validate_index(flow,index)
        labels={flow['cases'][0]['label']+f'-t{i}' for i in range(4)}
        for e in index['groups']:
            if e['label'] in labels: e.update(completed=False,error='Flow failed: explicit retained failure')
        comparison.validate_index(flow,index)
        self.assertEqual(sum(not e['completed'] for e in index['groups']),4)

    def test_alternatives_pair_by_identity_not_position(self):
        rows=[dict(zip(('edgeClosure','temperatureK','instrumentSigmaMS','estimator'),o),predictionMS=[i+1.])
              for i,o in enumerate(sorted(comparison.OPTIONS,key=str))]
        old=comparison.keyed(rows); reordered=comparison.keyed(list(reversed(rows)))
        self.assertEqual(old,reordered)
        for bad in (rows[:-1],rows+[rows[0]],rows[:-1]+[rows[0]]):
            with self.assertRaises(ValueError): comparison.keyed(bad)

    def test_spectra_reordered_to_fixed_point_identity_before_frozen_scoring(self):
        value=optical_fixture(); locations=copy.deepcopy(value['locations']); brightness=copy.deepcopy(value['brightness'])
        for closure in value['cases'][0]['closures']: closure['spectra'].reverse()
        ordered=comparison.canonical(value,brightness,locations)
        scorer=comparison.optical86.load('compare80_test86',comparison.V80/'compare.py')
        points=[dict(**p,velocityMS=10.+i,extractionUnderFivePercent=True) for i,p in enumerate(locations)]
        rows=scorer.score(ordered,points)['cases']; comparison.keyed(rows)
        self.assertEqual(len(rows),72)
        self.assertTrue(all(r['predictionMS']==[10.,11.] and r['allPointGate'] for r in rows))

    def test_missing_duplicate_or_wrong_spectral_point_is_rejected(self):
        for mutate in ('missing','duplicate','unknown','bintime'):
            value=optical_fixture(); spectra=value['cases'][0]['closures'][0]['spectra']
            if mutate=='missing': spectra.pop()
            elif mutate=='duplicate': spectra[-1]=copy.deepcopy(spectra[0])
            elif mutate=='unknown': spectra[0]['id']='wrong-location'
            else: spectra[0]['refinements'][0]['binWidthMS']=20.
            with self.assertRaises(ValueError): comparison.canonical(value,value['brightness'],value['locations'])

    def test_stale_payload_and_escaping_payload_are_rejected(self):
        with tempfile.TemporaryDirectory() as directory:
            home=Path(directory); raw=json.dumps(dict(example=1)).encode(); packed=gzip.compress(raw)
            (home/'state.gz').write_bytes(packed)
            entry=dict(path='state.gz',sha256=comparison.sha(packed),rawSHA256=comparison.sha(raw))
            self.assertEqual(comparison.load(home,entry),dict(example=1))
            entry['rawSHA256']='0'*64
            with self.assertRaises(ValueError): comparison.load(home,entry)
            entry['path']='../elsewhere.gz'
            with self.assertRaises(ValueError): comparison.load(home,entry)

    def test_stale_flow_producer_seal_is_rejected_before_any_optical_scoring(self):
        with patch.object(comparison,'sources',return_value={'source':'new'}):
            with self.assertRaises(ValueError): comparison.check_flow(dict(sourceSHA256={'source':'old'}))


if __name__=='__main__': unittest.main()
