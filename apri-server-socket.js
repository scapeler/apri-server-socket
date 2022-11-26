/*
** Module: apri-server-socket
**
** Main system module for handling web-sockets
**
*/
// activate init process config-main
var path = require('path');
var startFolder 			= __dirname;
var startFolderParent		= path.resolve(__dirname,'..');
var configServerModulePath	= './apri-server-config.js';
console.log("Start of Config Main ", configServerModulePath);
var apriConfig = require(configServerModulePath)

var systemFolder 			= __dirname;
var systemFolderParent		= path.resolve(__dirname,'..');
var systemFolderRoot		= path.resolve(systemFolderParent,'..');
var systemModuleFolderName 	= path.basename(systemFolder);
var systemModuleName 		= path.basename(__filename);
var systemBaseCode 			= path.basename(systemFolderParent);

//console.log('systemFolder', systemFolder);  				// systemFolder /opt/TSCAP-550/node-apri
//console.log('systemFolderParent', systemFolderParent);  	// systemFolderParent /opt/TSCAP-550
//console.log('systemFolderRoot', systemFolderRoot);  	// systemFolderRoot   /opt

var initResult = apriConfig.init(systemModuleFolderName+"/"+systemModuleName);

// **********************************************************************************

// add module specific requires
var express 			= require('express');
var fs 					= require('fs');
var apriSocketIO	 	= require('./apri-server-socket.io');
var app = express();

// **********************************************************************************

apriSensorLogPathRoot = systemFolderParent + '/log/apri-sensor/';
apriSensorLogUnitFolder	= 'unit';
apriSensorLogUnitFolderPath	= apriSensorLogPathRoot + apriSensorLogUnitFolder + '/';

var logConfiguration = {}
var winston
var logger={
  info:function(logmsg) {
    console.log(logmsg)
  }
}
try {
  winston = require('winston')
  require('winston-daily-rotate-file')
}
catch (err) {
  logger.info('winston module (log) not found');
}

try {
  logConfiguration = {
    'transports': [
//          new winston.transports.Console()
      new winston.transports.DailyRotateFile({
          filename: 'apri-server-socket-%DATE%.log',
          dirname: '/var/log/aprisensor',
          //datePattern: 'YYYY-MM-DD',
          maxSize: '100m',
          maxFiles: '10'
        })
/*      new winston.transports.File({
            //level: 'error',
            // Create the log directory if it does not exist
            filename: '/var/log/aprisensor/aprisensor.log'
      })
*/
    ]
  };
  logger = winston.createLogger(logConfiguration);
}
catch (err) {
  logger.info('winston.createLogger error');
}
logger.info("Start of Config Main ", configServerModulePath);

var unitIds	= {};

// create subfolders
try {fs.mkdirSync(apriSensorLogPathRoot);} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;
try {fs.mkdirSync(apriSensorLogUnitFolderPath);} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;

app.all('/*', function(req, res, next) {
  logger.info("app.all/: " + req.url + " ; systemCode: " + apriConfig.systemCode );
//  res.header("Access-Control-Allow-Origin", "*");
//  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// test url for systemcode
app.get('/'+apriConfig.systemCode+'/', function(req, res) {
  logger.info("Reqparam: " + req.url);
  res.send("ok");
});

var io = require('socket.io')({path: '/SCAPE604/socket.io'});

logger.info('listening to http://proxyintern: ' + apriConfig.systemListenPort);

io.sockets.on('connection', function (socket) {
	var currTime = new Date();
	logger.info(currTime +': connect from '+ socket.request.connection.remoteAddress + ' / '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);
  //	logger.info('connect from2 '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);

  // socket.emit('humansensordata', { message: 'welcome humansensordata' });
	apriSocketIO.sendActiveActions(socket);
	io.sockets.emit('info', { nrOfConnections: io.engine.clientsCount } );
	logger.info('nr of connections:'+io.engine.clientsCount);
    socket.emit('connected', { message: 'welcome' });

	socket.on('aireassignal', function(data) {
    logger.info('Data from AiREAS signal '+ data);
		//io.sockets.emit('aireassignal', { data: data } );
		socket.broadcast.emit('aireassignal', { data: data } );
  });

//---- Apri Agent Sensor System begin
	socket.on('apriAgentBoot', function(data) {
		var apriSensorUnitId = 'unknown';
		if (data  != undefined && data.unit != undefined && data.unit.id != undefined) {
			apriSensorUnitId	= data.unit.id;

			if (unitIds[apriSensorUnitId]!= undefined && unitIds[apriSensorUnitId].nrOfConnections !=undefined) {
				unitIds[apriSensorUnitId].nrOfConnections++;
			} else {
				unitIds[apriSensorUnitId]	= {};
				unitIds[apriSensorUnitId].nrOfConnections	= 1;
				unitIds[apriSensorUnitId].nrOfDisconnects	= 0;
			}
			//unitIds[apriSensorUnitId].macAddress = data.macAddress;
			//unitIds[apriSensorUnitId].ipAddress = data.ipAddress;
			//unitIds[apriSensorUnitId].usbPorts = data.usbPorts;
			unitIds[apriSensorUnitId].unit = data.unit;
			unitIds[apriSensorUnitId].socket	= socket;
	        logger.info('ApriAgent boot message recieved client: '+apriSensorUnitId );
		} else {
	        logger.info('ApriAgent boot message recieved from unknown client ');
		}
		socket.apriSensorUnitId		= apriSensorUnitId;

		socket.apriSensorLogPath	= apriSensorLogUnitFolderPath+apriSensorUnitId;
		try {fs.mkdirSync(socket.apriSensorLogPath);} catch (e) {};//logger.info('ERROR: no tmp folder found, batch run aborted.'); return } ;
		var logFileName = new Date().toISOString();

		socket.apriSensorLogFile	= socket.apriSensorLogPath+'/'+logFileName;
		if (data.wifiScan != undefined ) {
			if (data.wifiScan.wlan0 != undefined) {
				var tmpWifiDataWlan0	= data.wifiScan.wlan0.toString();
				fs.writeFileSync(socket.apriSensorLogFile+'_wifi_wlan0', tmpWifiDataWlan0 );
				data.wifiScan.wlan0	= undefined;
			}
			if (data.wifiScan.wlan1 != undefined) {
				var tmpWifiDataWlan1	= data.wifiScan.wlan1.toString();
				fs.writeFileSync(socket.apriSensorLogFile+'_wifi_wlan1', tmpWifiDataWlan1 );
				data.wifiScan.wlan1	= undefined;
			}
		}

		var tmpWifiData	= data.wifiScan.toString();
		fs.writeFileSync(socket.apriSensorLogFile+'_wifi', tmpWifiData );
		data.wifiScan	= undefined;
		var tmpData	= JSON.stringify(data);
		fs.writeFileSync(socket.apriSensorLogFile+'_boot', tmpData );
		//logger.info(socket.apriSensorLogPath+'/'+socket.apriSensorLogFileName);
    });

	socket.on('apriAgentPing', function(data) {
        logger.info('ApriAgent Ping message recieved ');
		socket.emit('apriAgentPong', data ); // pong, return message.
  });
	socket.on('apriAgentPong', function(data) {
        logger.info('ApriAgent Pong message recieved ');
  });
	socket.on('apriAgentTick', function(data) {
        logger.info('ApriAgent Tick recieved ');  // heartbeat tick
  });
	socket.on('apriAgentCliMsg', function(data) {
        logger.info('ApriAgent client message recieved ');
		socket.emit('apriAgentCliMsg', data ); // pong, return message.
  });
	socket.on('apriAgentSrvMsg', function(data) {
        logger.info('ApriAgent server message recieved ');
		socket.emit('apriAgentSrvMsg', data ); // pong, return message.
  });

	socket.on('apriAgentAction', function(data) {  // pong message from socket.io server
		logger.info('Apri Agent Manager action received: ' + data.action);
		if (data.action == 'getClients') {
			var _unitIds	= {};
			for (var key in unitIds) {
				var _id = key;
				//console.dir(unitIds[key]);
				if (unitIds[key].socket != undefined) {
					_unitIds[_id]	= {};
					_unitIds[_id].nrOfConnections	= unitIds[key].nrOfConnections;
					_unitIds[_id].nrOfDisconnects	= unitIds[key].nrOfDisconnects;
				}
				//_unitIds[_id].macAddress= unitIds[key].macAddress;
				//_unitIds[_id].ipAddress	= unitIds[key].ipAddress;
				//_unitIds[_id].usbPorts	= unitIds[key].usbPorts;
				_unitIds[_id].unit		= unitIds[key].unit;

			}
			logger.info("Returning unit id's");
			console.dir(_unitIds);
			socket.emit('apriAgentActionResponse', { action: data.action, unitIds: _unitIds}); //return active units
		};
		if (data.action == 'getClientUsbInfo') {  // get usb info from a specified unit (Raspberry Pi)
			logger.info('getClientUsbInfo unit id: '+ data.unitId );
			if (unitIds[data.unitId] != undefined) {
				logger.info('ApriClientAction initiated: '+ data.action + 'for unit '+ data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientUsbInfo initiated' });
		};
    if (data.action == 'getClientLsUsbInfo') {  // get lsusb info from a specified unit (Raspberry Pi)
			logger.info('getClientLsUsbInfo unit id: '+ data.unitId  );
			if (unitIds[data.unitId] != undefined) {
				logger.info('ApriClientAction initiated:  '+ data.action + 'for unit '+ data.unitId);
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientLsUsbInfo initiated' });
		};
    if (data.action == 'getClientLsUsbvInfo') {  // get lsusb info from a specified unit (Raspberry Pi)
			logger.info('getClientLsUsbvInfo unit id: '+ data.unitId  );
			if (unitIds[data.unitId] != undefined) {
				logger.info('ApriClientAction initiated:  '+ data.action + 'for unit '+ data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientLsUsbvInfo initiated' });
		};
    if (data.action == 'getClientCmd') {  // get command info from a specified unit (Raspberry Pi)
			logger.info('getClientCmd unit id: '+ data.unitId  );
			if (unitIds[data.unitId] != undefined) {
				logger.info('ApriClientAction initiated: '+ data.action + 'for unit '+ data.unitId);
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientCmd initiated' });
		};
		if (data.action == 'reboot') {  // reboot a specified unit (Raspberry Pi
			logger.info('Unit id '+ data.unitId );
			if (unitIds[data.unitId] != undefined) {
				logger.info('ApriClientAction initiated:  '+ data.action + 'for unit '+ data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'reboot initiated' }); //return active units
		};
	});

  function arraybuffer2string(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
  }
  function str2ab(str) {
    var buf = new ArrayBuffer(str.length*2); // 2 bytes for each char
    var bufView = new Uint8Array(buf);
    for (var i=0, strLen=str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
    }
    return buf;
  }

	socket.on('apriClientActionResponse', function(data) {  // response from action
		logger.info('apriClientActionResponse unit id: '+ data.unitId + ' ' + data.action );
		if (data.device != undefined) {
			logger.info('apriClientActionResponse device: ' +  data.unitId + ' ' +  data.device );
		}
		if (data.usbInfo != undefined) {
			logger.info('apriClientActionResponse usbInfo: ' +  data.unitId + ' ' +  data.usbInfo );
		}
	});

  socket.on('apriSocketBinary', function(data) {  // response from action
		logger.info('apriSocketBinary');
    var bufView = new Uint8Array(data);
    var str = arraybuffer2string(bufView)
	});

  //------ Apri Agent Sensor System end

	socket.on('disconnect', function() {
		if (socket.apriSensorUnitId != undefined && unitIds[socket.apriSensorUnitId]!=undefined)
		{
			unitIds[socket.apriSensorUnitId].nrOfDisconnects++;
		}
		logger.info('disconnect from '+ socket.request.connection.remoteAddress  + ' / '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address );
  });

});

io.listen(apriConfig.systemListenPort);


apriSocketIO.streamEvents(io.sockets, 'humansensor');
