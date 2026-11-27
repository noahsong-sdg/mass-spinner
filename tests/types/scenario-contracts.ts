/** Compile-only regressions: tsc must reject each marked invalid contract. */
import {
 captureScenario, readScenario, validateScenario,
 type Scenario, type ScenarioDraft, type FuelRunState,
} from '../../src/scenario-state.js';
import {createBaselineStore, type BaselineSnapshot} from '../../src/baseline-state.js';

declare const document: Document;
declare const externalValue: unknown;
declare const shouldValidate: boolean;

const history: FuelRunState = {
 initialCurrentA: .03, events: [{timeS: .5, currentA: .04}], mode: 'spin', timeS: 1,
};
const legacy: Scenario = {version: 2, level: '1', controls: {field: .1}};
const replayable: Scenario = {
 version: 3, level: '2', controls: {'marathon-apparatus': 'centrifuge', 'fuel-durationS': 1}, fuelRun: history,
};
void [legacy, replayable];

// @ts-expect-error Unknown JSON cannot be used as an already validated scenario.
const unvalidated: Scenario = externalValue;
validateScenario(externalValue);
const validated: Scenario = externalValue;
void [unvalidated, validated];

// @ts-expect-error Drive histories belong to the Marathon playground.
const wrongLevel: Scenario = {version: 3, level: '1', controls: {}, fuelRun: history};
// @ts-expect-error Version 3 requires its drive history.
const missingHistory: Scenario = {version: 3, level: '2', controls: {}};
// @ts-expect-error Legacy links cannot claim a version 3 run history.
const legacyWithHistory: Scenario = {version: 2, level: '2', controls: {}, fuelRun: history};
// @ts-expect-error Playback mode is a closed set.
const wrongMode: FuelRunState = {...history, mode: 'arbitrary'};
// @ts-expect-error Physical times are numeric.
const wrongTime: FuelRunState = {...history, timeS: '1'};
void [wrongLevel, missingHistory, legacyWithHistory, wrongMode, wrongTime];

const accepted: Scenario = captureScenario(document, '2');
const draft: ScenarioDraft = captureScenario(document, '2', {validate: false});
// @ts-expect-error An unfinished draft cannot promise a validated version/history pairing.
const draftAsAccepted: Scenario = draft;
// @ts-expect-error A dynamic validation option cannot guarantee validation ran.
const conditionalAsAccepted: Scenario = captureScenario(document, '2', {validate: shouldValidate});
void [accepted, draftAsAccepted, conditionalAsAccepted];

const parsed = readScenario('?v=2');
if (parsed.scenario) {
 // @ts-expect-error Legacy scenarios have no drive history; narrow the version first.
 parsed.scenario.fuelRun;
 if (parsed.scenario.version === 3) {
  const time: number = parsed.scenario.fuelRun.timeS;
  void time;
 }
}

const snapshot: BaselineSnapshot = {
 scenario: replayable,
 identity: {model: 'centrifuge', observable: 'rotation', xUnit: 's', yUnit: 'rad/s', version: 1},
 curves: [{label: 'Ions', x: [0, 1], y: [0, null], xLabel: 'Time', yLabel: 'Rotation', color: '#abc'}],
};
const store = createBaselineStore();
const pinned = store.pin(snapshot);
// @ts-expect-error A pinned snapshot cannot be modified after acceptance.
pinned.identity.model = 'other';
// @ts-expect-error Curve arrays are deeply immutable too.
pinned.curves[0].x.push(2);
// @ts-expect-error Frozen run histories cannot be edited through the baseline.
if (pinned.scenario.version === 3) pinned.scenario.fuelRun.events.push({timeS: 2, currentA: .1});
const restored = store.scenario();
if (restored?.version === 3) restored.fuelRun.events.push({timeS: 2, currentA: .1});
const compared = store.compare(snapshot);
const compatible: boolean = compared.compatible;
const samples: (number | null)[] | undefined = compared.curves[0]?.y;
void [compatible, samples];
