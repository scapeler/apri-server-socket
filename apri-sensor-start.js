
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

var moduleApriSensorActionPath = require('path').resolve(__dirname, 'node_modules/..');

var apriConfig 		= require(moduleApriSensorActionPath + '/apri-config');

var main_module		= process.argv[2];
var argvParams		= [];
var argvParams		= process.argv;

module.exports = {

	start: function (options) {
		if (main_module == undefined) {
			console.log('Error: main modulename missing!');
			return -1;
		}

		if ( apriConfig.init(main_module) ) {
			console.log('apri-sensor-start.js: '+ main_module);
			//console.log('systemfolderparent: '+ apriConfig.getSystemFolderParent());
			var apriModule = require(moduleApriSensorActionPath + '/' + main_module);
			var options = {
				systemFolderParent: apriConfig.getSystemFolderParent(),
				configParameter: apriConfig.getConfigParameter(),
				systemCode: apriConfig.getSystemCode(),
				argvParams: argvParams
			};
			apriModule.init(options);
		}
	}
}
