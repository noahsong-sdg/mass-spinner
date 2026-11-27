import './laurelin.css';
import {createLaurelinScene} from './laurelin-scene.js';
import {mountLaurelin} from './laurelin-workbench.js';
import modelSource from '../LAURELIN-MODEL.md?url';
mountLaurelin({document,createScene:createLaurelinScene,modelSource,
 requestFrame:callback=>requestAnimationFrame(callback)});
