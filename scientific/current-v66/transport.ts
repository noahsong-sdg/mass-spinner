import {writeFileSync} from 'node:fs';
import {fuelArgonNeutralTransport} from '../../src/fuel-neutral-transport.js';
import {fuelLithiumNeutralTransport} from '../../src/fuel-momentum.js';
const argon=[300,500,1750,8000,10000,12867,20000].map(temperatureK=>({temperatureK,...fuelArgonNeutralTransport(temperatureK)}));
const lithium=[100,500,1500,3000].map(temperatureK=>({temperatureK,...fuelLithiumNeutralTransport(temperatureK)}));
writeFileSync(process.argv[2],JSON.stringify({argon,lithium},null,2)+'\n',{flag:'wx'});
