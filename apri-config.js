 
/**
 * The apri-config-main module for init and config node-apri system 
 * @module node-apri-config-main
 */

"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

	var fs 		= require('fs'),
		path 	= require('path'),
		os 		= require('os');

	var mainSystemCode,
		parameter,
		request,
		systemBaseCode,
		systemCode,
		systemConfigLocalPath,
		systemConfigStr,
		systemConfig,
		systemFolder,
		systemFolderParent,
		systemHostName,
		systemMainModuleName,
		systemName,
		systemListenPort,
		systemRepositoryHttpServer,
		systemRepositoryHttpProxy,
		systemServiceType,
		systemStart,
		systemVersion,
		systemVersionL1,
		systemVersionL2,
		systemVersionL3;


module.exports = {

	init: function (name) {
		var _module;

		systemStart 				= new Date();

		systemHostName				= os.hostname();
		systemFolder 				= __dirname;
		systemFolderParent			= path.resolve(__dirname, '../node_modules/' + name + '/../..');
		
		systemMainModuleName 		= name;
		systemBaseCode 				= path.basename(systemFolderParent);

		systemConfigLocalPath 		= systemFolderParent +'/config/';
		systemConfigStr 			= fs.readFileSync(systemConfigLocalPath + "apri-system.json");
		systemConfig 				= JSON.parse(systemConfigStr);

		// IMPORTANT: SYSTEM CONFIGURATION VALUES !!!
		systemName 					= systemConfig.system.systemName;
		systemCode 					= systemConfig.system.systemCode;
		mainSystemCode 				= systemConfig.system.systemCode;
		systemListenPort 			= systemConfig.system.systemListenPort;
		systemVersionL1 			= systemConfig.system.version.l1;
		systemVersionL2 			= systemConfig.system.version.l2;
		systemVersionL3 			= systemConfig.system.version.l3;
		systemVersion 				= systemVersionL1 + '.' + systemVersionL2 + '.' + systemVersionL3;
		systemServiceType 			= systemConfig.system.serviceType;

		// Parameters
		systemRepositoryHttpServer 	= systemConfig.parameter.repositoryHttpServer;   //  ! geen systemCode, direct access !
		systemRepositoryHttpProxy  	= systemConfig.parameter.repositoryHttpProxy  + "/" + systemBaseCode;
		parameter					= systemConfig.parameter;

		// module overrules default config
		if (systemConfig.modules) {
			for (var i=0;i<systemConfig.modules.length;i++) {
				_module = systemConfig.modules[i];
				if (_module.moduleName == systemMainModuleName)  {
					if (_module.systemCode) {
						systemCode = _module.systemCode;
					}
					if (_module.systemListenPort) {
						systemListenPort = _module.systemListenPort;
					}
					break;
				}
			}
		}

		console.log('\n=================================================================');
		console.log();
		console.log('Start systemname         :', systemName);
		console.log(' Systemmaincode / subcode:', mainSystemCode, systemCode );
		console.log(' Systemversion           :', systemVersion);
		console.log(' Systemhost              :', systemHostName);
		console.log(' System folder           :', systemFolder);
		console.log(' System folder parent    :', systemFolderParent);
		console.log(' System config folder    :', systemConfigLocalPath);
		console.log(' System Main modulename  :', systemMainModuleName);
		console.log(' Servicetype             :', systemServiceType);
		console.log(' Listening port          :', systemListenPort);
		console.log(' Repository prefix       :', systemRepositoryHttpServer);
		console.log(' Repository proxy prefix :', systemRepositoryHttpProxy);
		console.log(' System start            :', systemStart.toISOString());
		console.log('=================================================================\n');

		if (mainSystemCode != systemBaseCode) {
			console.log('ERROR: SYSTEMCODE OF CONFIG FILE NOT EQUAL TO SYSTEM BASECODE (', systemCode, 'vs', systemBaseCode, ')');
			return false;
		}
		return true;

	},  // end of init

	getSystemCode: function () {
		return systemCode;
	},
	
	getSystemFolderParent: function () {
		return systemFolderParent;
	},
	
	getSystemListenPort: function () {
		return systemListenPort;
	},

	getConfigParameter: function () {
		return parameter;
	}


} // end of module.exports
