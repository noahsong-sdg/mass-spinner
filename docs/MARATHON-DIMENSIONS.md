# Model dimensions and their sources

Checked 17 November 2026. A published design calculation is not a measured machine.

| Model | Supported by the checked sources | What the viewer uses |
|---|---|---|
| Centrifuge | Patent topology; conditional active-volume estimates of ~12 L for differential pumping and ~10 L for lithium separation. No chamber radius or length found. | User-selected chamber radius/length; default Ø0.24 m × 0.8 m, 36.2 L. **Assumed dimensions**, including coils, electrodes, wall thickness, ports and outer envelope. |
| Beam source | RF deuterium source → accelerator → cooled LiT target. No numeric beamline envelope, target diameter, film thickness or electrode spacing found. | **Assumed dimensions** for the reference assembly. Numerical target surfaces follow the simulator's chosen area/column inputs; those are not Marathon measurements. |
| Future blanket | Paper §4.1/Table 1: R = 4.2 m, a = 1.2 m, elongation 1.6, triangularity 0.25; W 5 mm, inner V alloy 10 mm, outer V alloy 30 mm, Eurofer97 tank 30 mm. | **Published model dimensions**, reconstructed in Blender for the paper's selected 210 mm Hg/Li channel case. Not original CAD or an as-built reactor. |

The blanket's FLiBe thickness decreases as the channel grows while the outer build stays fixed. At a 210 mm channel, the paper's scan implies **545 mm inboard** and **795 mm outboard**: 750 − (210 − 5) and 1000 − (210 − 5) mm. These are derived dimensions, not separately measured values.

The blanket's Miller contour, normal offsets and interpolation between inboard/outboard thicknesses are reconstruction choices. Plasma-to-wall clearance is unknown and omitted. A 270° presentation cutaway exposes layers; the paper instead simulates a 90° reflective sector. Magnets, cryostat, supports and services are not specified or modeled. Optical finishes are illustrative. The empty core denotes the plasma region, not another solid layer.

Dimension labels describe the displayed model, not a verified real machine.

Sources:

- [Centrifuge patent WO2026064411A1, Description §§20–29](https://patents.google.com/patent/WO2026064411A1/en): schematic drawings and topology, without numeric chamber dimensions.
- [WO2026136752A2, original description reproduced by Patsnap, §§53–56](https://eureka.patsnap.com/patent/WO2026136752A2): ~12 L estimate at 50 Pa / 1 eV, ~10 L lithium estimate at 1 torr / 0.3 eV, both at rotational-energy ratio ~5. Neither fixes shape. Section 43's 1–5 m refers to a divertor-to-pump duct path, **not chamber length**.
- [Marathon beam-driven fusion architecture](https://www.marathonfusion.com/beam-driven-fusion/): component sequence, not dimensioned drawings. Photos and separate power/flux claims do not establish geometry.
- [Alchemy paper, §4.1, Table 1 and selected case, pp.12–14](https://www.marathonfusion.com/alchemy.pdf#page=12): proposed blanket neutronics model. It approximates an ARC-class tokamak; it is separate from the compact beam source and centrifuge.

Authoritative reconstruction inputs: [marathon-blanket-dimensions.json](../web-assets/marathon-blanket-dimensions.json). Builder: [build_paper_blanket.py](../blender/build_paper_blanket.py). No rotation, transport, stopping or neutronics predictions were recalibrated to this geometry.
