
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

var moduleApriServerSocketPath = require('path').resolve(__dirname, 'node_modules/..');
var apriSensorStart 	= require(moduleApriServerSocketPath + '/apri-sensor-start');
apriSensorStart.start();

