/** Compile-only regressions for the shared plot and precision-control APIs. */
import {renderPlots, reducedConfig, type PlotCurve, type PlotOptions} from '../../src/laboratory.js';
import {setupPreciseControls, type RangeDescriptor} from '../../src/precise-controls.js';
import type {IonSpecies} from '../../src/physics.js';
import type {TransportConfig} from '../../src/transport.js';
import type {Curve} from '../../src/ensemble.js';
import type {FuelSceneTools, NumericFuelControlKey} from '../../src/fuel-scene-tools.js';

declare const document: Document;
declare const host: HTMLElement;
declare const ions: readonly IonSpecies[];
declare const arrivalCurve: Curve;
declare const fuelScene: FuelSceneTools;

// Plotting reads frozen scientific samples; missing observations remain nullable.
const curve: PlotCurve = {
 label: 'Rotation', x: [0, 1, 2] as const, y: [0, null, 3] as const,
 low: [0, null, 2] as const, high: [0, null, 4] as const,
 xLabel: 'Time (s)', yLabel: 'Rotation (rad/s)', xDomain: [0, 2] as const,
};
const controller = renderPlots(host, [curve] as const, {
 announce: false,
 onSelect(x) {const selected: number = x; void selected;},
});
controller.setCursor(1);
controller.setCursor(undefined);
// Ordinary core interfaces need no open index signature to feed the shared plotter.
renderPlots(host, [arrivalCurve]);
// @ts-expect-error Read-only plot samples cannot be modified by a renderer consumer.
curve.x.push(3);
// @ts-expect-error Plot ordinates must be numeric or explicitly missing.
const invalidSample: PlotCurve = {...curve, y: ['3']};
// @ts-expect-error An axis domain has exactly two numeric endpoints.
const invalidDomain: PlotCurve = {...curve, xDomain: [0, 1, 2]};
// @ts-expect-error Selection coordinates use the numeric plot abscissa.
const invalidSelection: PlotOptions = {onSelect: (x: string) => {void x;}};
// @ts-expect-error Cursor positions cannot be formatted strings.
controller.setCursor('1 s');

const logarithmic: RangeDescriptor = {scale: 'log10', unit: 'm⁻³'};
const linear: RangeDescriptor = {scale: 'linear', integer: true};
const controls = setupPreciseControls(document, {
 describeRange(range) {
  const input: HTMLInputElement = range;
  return input.id === 'density' ? logarithmic : null;
 },
});
controls.reset(host);
setupPreciseControls(host, {describeRange: () => linear}).reset();
// @ts-expect-error Only supported physical-coordinate scales may be declared.
const invalidScale: RangeDescriptor = {scale: 'natural-log'};
// @ts-expect-error Precision controls require an actual DOM query/containment scope.
controls.reset({});

// A known transport mode preserves its specific physical configuration contract.
const diffusion: TransportConfig = reducedConfig('diffusion', ions);
// @ts-expect-error Collision closures are a closed physical-model selection.
diffusion.collisionModel = 'arbitrary';
const fieldControl: NumericFuelControlKey = 'magneticT';
fuelScene.setSpecies('light');
fuelScene.setLayer('temperature');
fuelScene.setDomains({temperature: [300, 900] as const});
// @ts-expect-error Component sliders cannot write a categorical pair selection.
const categoricalSlider: NumericFuelControlKey = 'pair';
// @ts-expect-error Species selectors must use the shared physical-species vocabulary.
fuelScene.setSpecies('ions');
// @ts-expect-error Field color domains need exactly two numeric bounds.
fuelScene.setDomains({temperature: [300, 600, 900]});
void [fieldControl, categoricalSlider];
void [invalidSample, invalidDomain, invalidSelection, invalidScale, diffusion];
