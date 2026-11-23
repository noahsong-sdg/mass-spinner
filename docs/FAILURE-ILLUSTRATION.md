# Centrifuge failure illustration

Controls → Failure limits sets three assumptions:

| Input | Default | Compared value |
| --- | ---: | --- |
| Pressure difference limit | 1,000 Pa | Outer neutral gas-cell pressure minus external pressure |
| External pressure | 0 Pa | Specified surrounding pressure |
| Liner temperature limit | 1,800 K | Hottest tungsten cell, or the lumped or prescribed liner temperature |

These values are not Marathon equipment ratings. The vessel stays still while the gas rotates. Gas speed alone does not specify a vessel burst limit.

The check uses accepted coupled-run states. It stops at the first retained state above either limit. It does not calculate the exact crossing time. Pressure equals local neutral number density times Boltzmann's constant times local gas temperature. The outer cell gives a volume average, not resolved wall traction. A coarse grid can miss the wall layer.

After the stop, the 3D display moves the existing assembly parts apart. This motion is an illustration. The model does not calculate fracture, gas release, debris speed, electron pressure, chemical reactions or external-pressure buckling. The temperature limit is not a tungsten melting point. The supported solid-property range is 300–1900 K.

Coupled spin-up and coupled separation use the same failure time. Plots and the time slider stop there. Equilibrium and flow references remain available as reference calculations. Rewind restores intact hardware before a later event. An excessive initial load requires an input change.

Pinned comparisons use the earliest failure time of either run under the selected limits. The failed run shows the burst. Export includes the limits and event beside the full closed-vessel calculation. States after the event do not describe failed equipment. Copy link includes the limits. Older links use the defaults.

A rejected solver run or invalid input does not cause a burst. It produces an error message. Changing an input starts a new run after failure. No continuation from damaged equipment is calculated.

## Basis

A pressure-vessel rating requires material, geometry, temperature, construction and qualification data. Those data are not available for Marathon hardware. See [NASA pressure-system requirements](https://ssctdpub.ssc.nasa.gov/servlet/sm.web.Fetch/SSTD-8070-0095-PRESSUR_Basic.pdf?did=107742&rhid=1000&type=released) and [thin-wall pressure-vessel relations](https://wp.optics.arizona.edu/optomech/wp-content/uploads/sites/53/2016/10/OPTI_222_W24.pdf).

The load check reuses the existing finite-volume species and thermal states. It adds no stress solver or calibrated equipment-failure prediction. No new physics qualification follows from the animation.
