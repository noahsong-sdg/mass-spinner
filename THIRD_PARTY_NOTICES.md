# Third-party sources and attribution

Mass Spinner is an independent personal learning project. It is not affiliated
with or endorsed by Marathon Fusion. Apparatus meshes are conceptual models,
not manufacturer CAD or verified engineering dimensions.

- **Geant4:** This product includes software developed by Members of the Geant4
  Collaboration (https://geant4.web.cern.ch/). `src/deuteron-stopping.ts` adapts
  mean atomic stopping formulas and tables from Geant4 v11.4.0, commit
  `b4a16de652ec244f7a0ecc0a5cacfee21930bf75`. The retained
  [Geant4 license](web-assets/GEANT4-LICENSE.txt) applies to that adaptation.
  Reference fixtures preserve their source metadata. This is not a full Geant4
  transport calculation or measured lithium-tritide stopping data.
- **Three.js:** Installed through npm under its MIT license; see the upstream
  [license](https://github.com/mrdoob/three.js/blob/dev/LICENSE). Other npm
  dependencies retain their respective upstream licenses.
- **Nuclear data:** `web-assets/marathon-reference/h1-endfb81-v35.json` records
  its ENDF/B-VIII.1 source, extraction method, units and source-file hash.
  See the [NNDC release](https://www.nndc.bnl.gov/endf-releases/). Other reference
  packets identify their sources individually. Extraction is not experimental
  validation of the simulator.
- **Neutral argon transport:** `src/fuel-neutral-transport.ts` uses the Ar–Ar
  Q22 values and explicit pi multiplier from Mutation++ v1.0.5's
  [collision database](https://github.com/mutationpp/Mutationpp/blob/v1.0.5/data/transport/collisions.xml),
  attributed there to Wright 2005. No Mutation++ solver is bundled.
- **Research literature:** Source papers are cited in the model documentation.
  Full downloaded papers and extracted article text are excluded from this
  repository. Derived benchmark markers are identified as digitized/reproduced
  observations rather than raw instrument data.

No project-wide software license has been selected. Public availability does not
replace the licenses or attribution requirements of third-party material.
