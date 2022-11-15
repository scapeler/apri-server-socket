/*
** Module: apri-sensor-action
**
** (scheduled) action like automatic reboot 
**  param 3 = testnode; param 4= actionnode; param 5=action
**

test door ophalen resultaat:
curl -i -XPOST 'http://influx.rivm.nl:8086/read?db=db_ApriSensor' -u ApriSensor:'Hsz4?EWZ'
// --data-binary 'm_abc,id=sensor01 lat=52.345,lon=4.567,PM=13.4,T=21.5,timestamp_from="2017-12-31T23:05:00Z",timestamp_to="2017-12-31T23:06:00Z"'


*/
// **********************************************************************************
"use strict"; // This is for your code to comply with the ECMAScript 5 standard.

// add module specific requires

var request = require('request');
var fs 		= require('fs');
var sys 	= require('sys');

//var pg = require('pg');

var sqlConnString;

var _options	= {};
var apriSensorUrl, apriSensorFileName, apriSensorLocalPathRoot, fileFolder, tmpFolder;
var secureSite;
var siteProtocol;
var openiodUrl;
var loopTimeMax;

var influx;

var fileNames, fileNamesIndex;
var _self;

var sqlFile = '';
var restartIndex= 0; //3842; //3840 ; //3687; //3681;3682; //3675;//sensorid 5329  //3391;      errors for sensor id 5331

var startDateTimeFilter, endDateTimeFilter;


// **********************************************************************************


module.exports = {

	client: {},

	init: function (options) {
		_options					= options;
		_self = this;
		
/*
		sqlConnString = options.configParameter.databaseType + '://' + 
		options.configParameter.databaseAccount + ':' + 
		options.configParameter.databasePassword + '@' + 
		options.configParameter.databaseServer + '/' +
		options.systemCode + '_' + options.configParameter.databaseName;
*/

		
/*
		_self.client = new pg.Client(sqlConnString);
		_self.client.connect(function(err) {
			if(err) {
				return console.error('could not connect to postgres', err);
			}
		});
*/
//		_self.client.end();

		
		secureSite 			= true;
		siteProtocol 		= secureSite==true?'https://':'http://';
		openiodUrl			= siteProtocol + 'openiod.org/' + _options.systemCode; //SCAPE604';
		loopTimeMax			= 60000; //ms, 60000=60 sec

//		apriSensorUrl 			= 'http://nulwoning.mooo.com:6001/data/json?1'; 
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

		//console.dir(_options);
		
//		if (options.argvStations == undefined) {
//			console.log('Parameter with archivedate is missing, processing with default (actual-2h) date.');
//		}
		
		this.processArchiveDate();
		
//		this.processSensors (); 

		console.log('All retrieve actions are activated.');

	},
	
	processArchiveDate: function () {
		//var archiveDate = _options.argvStations;  // one at a time or undefined for yesterday?
		
		//if (_options.argvStations != undefined) {
		//	archiveDate = _options.argvStations; // eg '2017-02-15-14-35'
		//} else {
		//	var _date 		= new Date(new Date().getTime() - 7200000) ; //7.200.000 2 uur eerder
		//	var _year		= _date.getFullYear();
		//	var _month		= _date.getMonth()+1;
		//	var _day		= _date.getDate();
		//	var _hour		= _date.getHours();
		//	var _minutes	= _date.getMinutes();	
		//	var _yearStr	= ''+_year;
		//	var _monthStr	= ''+_month;
		//	var _dayStr		= ''+_day;
		//	var _hourStr	= ''+_hour;
		//	var _minutesStr	= '' + (_minutes - _minutes%5);
			
		//	_monthStr = _monthStr.length == 1 ? '0' + _monthStr : '' + _monthStr;
		//	_dayStr = _dayStr.length == 1 ? '0' + _dayStr : '' + _dayStr;
		//	_hourStr = _hourStr.length == 1 ? '0' + _hourStr : '' + _hourStr;
		//	_minutesStr = _minutesStr.length == 1 ? '0' + _minutesStr : '' + _minutesStr;
					
			
		//	archiveDate = _year + '-' + _monthStr + '-'+ _dayStr + '-' + _hourStr + '-' + _minutesStr; // 2017-02-15-14-35		

		//};	
			

		//console.log(archiveDate);
		
		//console.log('Processing archive date: ' + archiveDate);
			
		// date: yyyy-mm-dd-hh-mm  mm=5 minutes cycle: 0,5,10,15, etc.
		
			/*
https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=getobservation",
 "&sensorsystem=apri-sensor-pmsa003",
 "&op=apri-sensor-pmsa003-concPM2_5_CF1",
 "&date_start=2017-12-18T15:00:00+01:00&date_end=2018-01-07T22:15:00+01:00",
# "&date_start=2017-11-08T00:00:00+01:00&date_end=2017-11-30T12:00:00+01:00",
 # ",apri-sensor-pmsa003-concPM10_0_CF1",
# ",apri-sensor-pmsa003-rawGt0_3um",
# ",apri-sensor-pmsa003-rawGt0_5um",
# ",apri-sensor-pmsa003-rawGt1_0um",
# ",apri-sensor-pmsa003-rawGt2_5um",
# ",apri-sensor-pmsa003-rawGt5_0um",
# ",apri-sensor-pmsa003-rawGt10_0um",
# "&foi=apri-sensor-pmsa003_SCRP00000000082fba1b*RF7*2",
# "&foi=apri-sensor-pmsa003_SCRP00000000082fba1b*RF7*3",
#  "&foi=apri-sensor-pmsa003_SCRP000000004123e145",
#   "&foi=apri-sensor-pmsa003_SCWMA020A62C8201",
#   "&foi=apri-sensor-pmsa003_SCWMA020A62DC1CB",
 "&offering=offering_0439_initial&format=csv",sep="");		
*/
		
		
		var param = {};
		param.sensorsystem			= 'apri-sensor-pmsa003'; //'apri-sensor-dylos'; 
		param.offering				= 'offering_0439_initial'; 
//		param.foi					= 'scapeler_dylos_SCRP000000004123e145'; //,scapeler_dylos_SCRP00000000b7e92a99_DC1100'; //'scapeler_dylos_SCRP00000000b7e92a99_DC1100'; //'apri-sensor-dylos_SCRP000000004123e145'; 
		param.foi					= "apri-sensor-pmsa003_"+_options.argvParams[3]; //'scapeler_dylos_SCRP00000000b7e92a99_DC1100'; 
		// apri-sensor-pmsa003_SCWMA020A62C8201
		param.observation			= 'apri-sensor-pmsa003-concPM2_5_CF1'; //'apri-sensor-dylos-pm25'; 
		param.startDateTimeFilter	= startDateTimeFilter;
		param.endDateTimeFilter		= endDateTimeFilter;

		this.getOpenIoD(param, this.processData);
		
		//this.reqFile (apriSensorUrl)	;
		
		console.log('End of processArchiveDate');
		
	},
	

	executeSql: function  (query) {
		console.log('sql start: ');
		
//		client.connect(function(err) {
//			if(err) {
//				return console.error('could not connect to postgres', err);
//			}
			_self.client.query(query, function(err, result) {
				if(err) {
					return console.error('error running query', err);
				}
				console.log('sql result is ok ');// + result);
				_self.client.end();
			});
//		});
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
	
	
	// send data to SOS service via OpenIoD REST service
	var sendData = function(data) {
	// oud //		http://openiod.com/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&inputformat=insertom&objectid=humansensor&format=xml
	// oud //			&region=EHV		&lat=50.1		&lng=4.0		&category=airquality		&value=1

	//http://localhost:4000/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=insertom&sensorsystem=scapeler_shinyei&offering=offering_0439_initial&verbose=true&commit=true&observation=scapeler_shinyei:12.345&neighborhoodcode=BU04390402
	//https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=insertom&sensorsystem=scapeler_shinyei&offering=offering_0439_initial&verbose=true&commit=true&observation=scapeler_shinyei:12.345&neighborhoodcode=BU04390402

		var _url = openiodUrl + '/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=insertom&sensorsystem=apri-sensor-caire&offering=offering_0439_initial&commit=true';
		_url = _url + '&region=0439' + '&neighborhoodcode=' + data.neighborhoodCode + '&citycode=' + data.cityCode + '&foi=' + data.foi + '&observation=' + data.observation ;
		
		console.log(_url);

		request.get(_url)
			.on('response', function(response) {
				console.log(response.statusCode) // 200
				console.log(response.headers['content-type']) // 'image/png'
  			})
			.on('error', function(err) {
				console.log(err)
			})
		;

		
	};
	
	
//	var milliKelvinToCelsius = function(n){return Math.round((n/1e3-273.15)*100)/100};
	

	var options = {
		uri: _url,
		method: 'GET'
	};

	request(options, function (error, response, body) {
		console.log('Processing url '+ _url );

		if (error) {
			console.log(error);
		};
		console.log(response.statusCode);
		
		if (!error && response.statusCode == 200) {
			//console.log(body.observations[0])
			var _data = JSON.parse(body);
			var inRecords	= _data.SensorData;
						
			if (inRecords.length  == 0) {
				console.log('No ApriSensor 10 minute data found for this url: ' + options.uri );
				return;
			}
			
//			console.log(inRecords[0]);
			
			sqlFile = '';
			var sqlRecord="";
			for (var i=0;i<inRecords.length;i++) {
				var inRecord = inRecords[i];
				//if (inRecord.sensor.sensor_type.name != 'SDS011') continue; // end of file ?!
				
				var _measurementDate = new Date(inRecord.Date);
				
//				if (i<7) {
					console.log(inRecord);
					console.log(sqlRecord);
//				}	
			}
			
			
			return;
		
//			console.dir(inRecord[0]);
			
			var data				= {};
			data.neighborhoodCode	= 'BU07721111';//'BU04390603'; //geoLocation.neighborhoodCode;  	
			data.neighborhoodName	= '..'; //geoLocation.neighborhoodName;	
			data.cityCode			= 'GM0772'; //geoLocation.cityCode;	
			data.cityName			= '..'; //geoLocation.cityName;
			
			//observation=stress:01
			
			var tmpMeasurements = {};
			
			var i = inRecords.length - 1;  // only one retrieved measurement
			
			
//			for (var i=0; i <inRecord.length;i++) {
				var inMeasurement = inRecords[i];
				var measurementTime = new Date(inMeasurement.Date); //+'.000Z');
				inMeasurement.sensorId = 'Caire_Groenlo';
				inMeasurement.locationId = 'Groenlo';
//				console.log(inMeasurement.timestamp);
//				console.log(measurementTime);
			//	var nowTime = new Date();
//				console.log(nowTime);
			//	var timeDiff = new Date().getTime() - measurementTime.getTime();
//				console.log(timeDiff);
				
//				if (timeDiff >= 60000) {
//					console.log('ID: '+ inMeasurement.sensor.id + ' '+ nowTime + ' measurementtime: ' + measurementTime + ' ignore message timediff > 60 seconds' );
//					return; // ignore measurement older then 1.5 minute. retrieve per minute but delay getting message (maybe?)
//				}	
				

	//			if (tmpMeasurements[inMeasurement.sensor.id] == undefined)  tmpMeasurements[inMeasurement.sensor.id]={};
	//			var _measurement = tmpMeasurements[inMeasurement.sensor.id];
//				var _measurement = {};
//				_measurement.sensorType = inMeasurement.sensor.sensor_type;
//				_measurement.data = inMeasurement.sensordatavalues;
				
				data.foi = 'CAIRE'+inMeasurement.locationId;
				
//				console.dir(_measurement);	
//				if (_measurement.sensorType.id == 14) {  //name='SDS011'
//				  	for (var j=0; j< _measurement.data.length;j++) {
//						if (_measurement.data[j].value_type == 'P1' ) {
//					  		_measurement.pm10 = _measurement.data[j].value;
//						}
//						if (_measurement.data[j].value_type == 'P2' ) {
//					  		_measurement.pm25 = _measurement.data[j].value;
//						} 
// 
//					}
//					
//				}
//			}
//		    console.log(_measurement.pm25);
//		    console.log(_measurement.pm10);
			 
			data.categories			= [];
			data.observation		= 
				'apri-sensor-caire-PM1:'+ inMeasurement.PM1 + ',' +
				'apri-sensor-caire-PM25:'+ inMeasurement.PM25 + ',' +
				'apri-sensor-caire-PM10:'+ inMeasurement.PM10 + ',' +
				'apri-sensor-caire-rHum:'+ inMeasurement.RH + ',' +
				'apri-sensor-caire-temperature:'+ inMeasurement.T;
				
			sendData(data);

			
		}
	});
	
/*
  	new StreamBuffer(request( options, function(error, response) {
		console.log("Request completed: " + desc + " " );
		var currDate = new Date();
		var iso8601 = currDate.toISOString();

		writeFile(tmpFolder, fileName, '{"retrievedDate": "' + iso8601 + '", "content":' + 
			_wfsResult + ' }');
		})
  	);
*/

	}, // end of reqFile

	getOpenIoD: function(param, callback){
	
		var _url = openiodUrl + '/openiod?SERVICE=WPS&REQUEST=Execute&identifier=transform_observation&action=getobservation&format=json';
		

		_url = _url + 
			'&sensorsystem=' + param.sensorsystem + 
			'&offering=' + param.offering + 
			'&foi=' + param.foi + 
			'&op=' + param.observation +
			'&date_start=' + param.startDateTimeFilter.toISOString() + 
			'&date_end=' + param.endDateTimeFilter.toISOString(); 
		
		console.log(_url);

		let body = [];
		request.get(_url)
			.on('response', function(response) {
				console.log(response.statusCode) // 200
				console.log(response.headers['content-type']) // 'image/png'
  			})
			.on('data', (chunk) => {
				body.push(chunk);
			}).on('end', () => {
				body = Buffer.concat(body).toString();
				//console.log(body);
				callback(body);
  				// at this point, `body` has the entire request body stored in it as a string
			})
			.on('error', function(err) {
				console.log(err)
			})
		;
	},
	
	processData: function(data) {
		//console.log(data);
		var _data;
		try {
			_data = JSON.parse(data);
		}
		catch(e) {
			console.log('No json data retrieved');
			_data = [];
		}
		//console.log(_data);
		if (_data.length==0) {  // no measurements found --> action
			if (_options.argvParams[5] == "reboot") {
				console.log('Action initiated for ' + _options.argvParams[3]+' / ' + _options.argvParams[4]+' -> ' + _options.argvParams[5]);
				
				//	https://openiod.org/SCAPE604/openiod?SERVICE=WPS&REQUEST=Execute&identifier=apri-sensor-manager&action=reboot&unitId=00000000B7E92a99x
				var _url = openiodUrl + '/openiod?SERVICE=WPS&REQUEST=Execute&identifier=apri-sensor-manager&action=reboot&unitId=' +
					_options.argvParams[4].substr(4);
				console.log(_url);	
				let body = [];
				request.get(_url)
				.on('response', function(response) {
					console.log(response.statusCode) // 200
					console.log(response.headers['content-type']) // 'image/png'
  				})
				.on('data', (chunk) => {
					body.push(chunk);
				}).on('end', () => {
					body = Buffer.concat(body).toString();
					console.log(body);
				})
				.on('error', function(err) {
					console.log(err)
				});

				
				return;		
			}
			console.log('Invalid action for ' + _options.argvParams[3]+' / ' + _options.argvParams[4]+' -> ' + _options.argvParams[5]);
		}
		console.log('No action taken for ' + _options.argvParams[3]+' / ' + _options.argvParams[4]+' -> ' + _options.argvParams[5]);
		
	 return;  
	} 
	

}  // end of module.exports


