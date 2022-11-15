/*
** Module: apri-sensor-action
**
** (scheduled) action like automatic reboot
**  param 3 = testnode; param 4= actionnode; param 5=action
**
*/
// **********************************************************************************
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

// add module specific requires
var axios = require('axios'); //todo
var fs 		= require('fs');
var sys 	= require('sys');

var _options	= {};
var apriSensorFileName, apriSensorLocalPathRoot, fileFolder, tmpFolder;
var secureSite;
var siteProtocol;
var openiodUrl;

var fileNames, fileNamesIndex;
var _self;

var restartIndex= 0; //3842; //3840 ; //3687; //3681;3682; //3675;//sensorid 5329  //3391;
     errors for sensor id 5331
var startDateTimeFilter, endDateTimeFilter;

// **********************************************************************************
module.exports = {

	client: {},

	init: function (options) {
		_options					= options;
		_self = this;

		secureSite 			= true;
		siteProtocol 		= secureSite==true?'https://':'http://';
		openiodUrl			= siteProtocol + 'openiod.org/' + _options.systemCode; //SCAPE604';

		apriSensorFileName 		= 'ApriSensor.txt';

		apriSensorLocalPathRoot = options.systemFolderParent + '/ApriSensor/';
		fileFolder 			= 'ApriSensor-action';
		tmpFolder 			= apriSensorLocalPathRoot + fileFolder + "/" + 'tmp/';

		var _dateTime = new Date(new Date().getTime() - 120000);
		_dateTime = new Date(_dateTime.getTime() - (_dateTime.getSeconds()*1000) - _dateTime.getMilliseconds());  // start retrieving measurement from x minutes ago.
		startDateTimeFilter 	= new Date(_dateTime.getTime());
		endDateTimeFilter		= new Date(_dateTime.getTime()+120000-1);
		console.log(startDateTimeFilter);
		console.log(endDateTimeFilter);

		// create subfolders
		try {fs.mkdirSync(tmpFolder );} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;
	},

	reqFile: function (url) {
		var _url = url  ;
		var _wfsResult=null;
		//		console.log("Request start: " + fileNames[fileNamesIndex].name + " (" + url + ")");

		function writeFile(path, fileName, content) {
			fs.writeFile(path + fileName, content, function(err) {
				if(err) {
						console.log(err);
				} else {
						console.log("The file is saved! " + tmpFolder + fileName + ' (unzip:' + unzip + ')');
				if (unzip) {
					var exec = require('child_process').exec;
					var puts = function(error, stdout, stderr) { sys.puts(stdout) }
					exec(" cd " + tmpFolder + " ;  unzip -o " + tmpFolder + fileName + " ", puts);
				}
				}
			});
		}

		axios.get(_url,{
			//	headers: {}
			//	,timeout: 4000
		})
		.then(response => {
			// log('Response recieved');
			// if (response.status==200) removeRecord=true;
			//if (response.data.statusCode == '201') removeRecord=true;
		})
		.catch(error => {
			if (error.response) {
					// the server responded with a status code
					// that falls out of the range of 2xx
					log('error.response');
					//logDir(error.response.data);
					logDir(error.response.status);
					//logDir(error.response.headers);
			} else if (error.request) {
				var _err=''+error
				log('error.request '+ _err.substr(0,33)); // time exceeded?
					// The request was made but no response was received
					// `error.request` is an instance of XMLHttpRequest in the browser and an instance of
			} else {
					log('Error', error.message);
			}
			//log(error.config);
			log('Error config code: '+ error.code);
		});
	}, // end of reqFile

}  // end of module.exports
