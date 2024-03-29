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
var configServerModulePath	= startFolderParent + '/apri-server-config/apri-server-config';
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
var request 			= require('request');
var express 			= require('express');

var fs 					= require('fs');

var apriSocketIO	 	= require('./apri-server-socket.io');

var app = express();

// **********************************************************************************


apriSensorLogPathRoot 	= systemFolderParent + '/log/apri-sensor/';
apriSensorLogUnitFolder 				= 'unit';
apriSensorLogUnitFolderPath 			= apriSensorLogPathRoot + apriSensorLogUnitFolder + '/';

var unitIds	= {};

// create subfolders
try {fs.mkdirSync(apriSensorLogPathRoot);} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;
try {fs.mkdirSync(apriSensorLogUnitFolderPath);} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;

//console.log(apriSensorLogUnitFolderPath);


app.all('/*', function(req, res, next) {
  console.log("app.all/: " + req.url + " ; systemCode: " + apriConfig.systemCode );
//  res.header("Access-Control-Allow-Origin", "*");
//  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  next();
});

// test url for systemcode
app.get('/'+apriConfig.systemCode+'/', function(req, res) {
  console.log("Reqparam: " + req.url);
  res.send("ok");
});

/*
app.get('/'+apriConfig.systemCode+'/eventsource/:eventsource', function(req, res) {
	//getLocalFile(req, res, {contentType:'text/css'});
	console.log('EventSource action from '+ req.params.eventsource );

});
*/

/*
var io = require('socket.io').listen(app.listen(apriConfig.systemListenPort),{
    //serveClient: config.env !== 'production',
    path: '/SCAPE604/socket.io'
});
*/


// apri-sensor remote actions
var sendReboot	= function(unitId) {
	if (unitIds[unitId] == undefined || unitIds[unitId].socket == undefined) {
		console.log('Action request for unit ' + unitId + ', unit not active');
		return false;
	}
	unitIds[unitId].socket.emit('apriAgentAction', {action: "reboot" } );
}



// apri-sensor remote actions

var io = require('socket.io')({path: '/SCAPE604/socket.io'});
//io.on('connection', function(socket){});

console.log('listening to http://proxyintern: ' + apriConfig.systemListenPort);

io.sockets.on('connection', function (socket) {
	var currTime = new Date();
	console.log(currTime +': connect from '+ socket.request.connection.remoteAddress + ' / '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);
//	console.log('connect from2 '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);
	//console.dir(socket);


//    socket.emit('humansensordata', { message: 'welcome humansensordata' });
	apriSocketIO.sendActiveActions(socket);
	io.sockets.emit('info', { nrOfConnections: io.engine.clientsCount } );
	console.log('nr of connections:'+io.engine.clientsCount);
    socket.emit('connected', { message: 'welcome' });


	socket.on('aireassignal', function(data) {
        console.log('Data from AiREAS signal '+ data);
		//io.sockets.emit('aireassignal', { data: data } );
		socket.broadcast.emit('aireassignal', { data: data } );
    });

//---- Apri Agent Sensor System begin

	socket.on('apriAgentBoot', function(data) {
		//console.dir(data);
//		socket.emit('apriAgentBoot', data ); // pong, return message.
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

			unitIds[apriSensorUnitId].macAddress = data.macAddress;
			unitIds[apriSensorUnitId].ipAddress = data.ipAddress;
			unitIds[apriSensorUnitId].usbPorts = data.usbPorts;
			unitIds[apriSensorUnitId].unit = data.unit;


			unitIds[apriSensorUnitId].socket	= socket;
	        console.log('ApriAgent boot message recieved client: '+apriSensorUnitId );
		} else {
	        console.log('ApriAgent boot message recieved from unknown client ');
		}
		socket.apriSensorUnitId		= apriSensorUnitId;

		socket.apriSensorLogPath	= apriSensorLogUnitFolderPath+apriSensorUnitId;
		try {fs.mkdirSync(socket.apriSensorLogPath);} catch (e) {};//console.log('ERROR: no tmp folder found, batch run aborted.'); return } ;
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
		//console.log(socket.apriSensorLogPath+'/'+socket.apriSensorLogFileName);
    });

	socket.on('apriAgentPing', function(data) {
        console.log('ApriAgent Ping message recieved ');
		socket.emit('apriAgentPong', data ); // pong, return message.
    });
	socket.on('apriAgentPong', function(data) {
        console.log('ApriAgent Pong message recieved ');
    });

	socket.on('apriAgentTick', function(data) {
        console.log('ApriAgent Tick recieved ');  // heartbeat tick
    });

	socket.on('apriAgentCliMsg', function(data) {
        console.log('ApriAgent client message recieved ');
		socket.emit('apriAgentCliMsg', data ); // pong, return message.
    });
	socket.on('apriAgentSrvMsg', function(data) {
        console.log('ApriAgent server message recieved ');
		socket.emit('apriAgentSrvMsg', data ); // pong, return message.
    });
	socket.on('apriAgentAction', function(data) {  // pong message from socket.io server
		console.log('Apri Agent Manager action received: ' + data.action);
		//console.dir(data);
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
				_unitIds[_id].macAddress= unitIds[key].macAddress;
				_unitIds[_id].ipAddress	= unitIds[key].ipAddress;
				_unitIds[_id].usbPorts	= unitIds[key].usbPorts;
				_unitIds[_id].unit		= unitIds[key].unit;

			}
			console.log("Returning unit id's");
			console.dir(_unitIds);
			socket.emit('apriAgentActionResponse', { action: data.action, unitIds: _unitIds}); //return active units
		};
		if (data.action == 'getClientUsbInfo') {  // get usb info from a specified unit (Raspberry Pi)
			console.log('getClientUsbInfo unit id: %s', data.unitId );
			if (unitIds[data.unitId] != undefined) {
				console.log('ApriClientAction initiated: %s for unit %s', data.action, data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientUsbInfo initiated' });
		};
    if (data.action == 'getClientLsUsbInfo') {  // get lsusb info from a specified unit (Raspberry Pi)
			console.log('getClientLsUsbInfo unit id: %s', data.unitId );
			if (unitIds[data.unitId] != undefined) {
				console.log('ApriClientAction initiated: %s for unit %s', data.action, data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientLsUsbInfo initiated' });
		};
    if (data.action == 'getClientLsUsbvInfo') {  // get lsusb info from a specified unit (Raspberry Pi)
			console.log('getClientLsUsbvInfo unit id: %s', data.unitId );
			if (unitIds[data.unitId] != undefined) {
				console.log('ApriClientAction initiated: %s for unit %s', data.action, data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientLsUsbvInfo initiated' });
		};
    if (data.action == 'getClientCmd') {  // get command info from a specified unit (Raspberry Pi)
			console.log('getClientCmd unit id: %s', data.unitId );
			if (unitIds[data.unitId] != undefined) {
				console.log('ApriClientAction initiated: %s for unit %s', data.action, data.unitId );
				unitIds[data.unitId].socket.emit('apriClientAction', data);
			}
			socket.emit('apriAgentActionResponse', { action: data.action, unitId: data.unitId, msg: 'getClientCmd initiated' });
		};
		if (data.action == 'reboot') {  // reboot a specified unit (Raspberry Pi
			console.log('Unit id %s', data.unitId );
			if (unitIds[data.unitId] != undefined) {
				console.log('ApriClientAction initiated: %s for unit %s', data.action, data.unitId );
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

	socket.on('apriClientActionResponse', function(data) {  // response from action request
		console.log('apriClientActionResponse unit id: %s %s', data.unitId, data.action );
		if (data.device != undefined) {
			console.log('apriClientActionResponse device: %s %s', data.unitId, data.device );
		}
		if (data.usbInfo != undefined) {
			console.log('apriClientActionResponse usbInfo: %s %s', data.unitId, data.usbInfo );
		}
	});

  socket.on('apriSocketBinary', function(data) {  // response from action request
		console.log('apriSocketBinary');
    var bufView = new Uint8Array(data);
    var str = arraybuffer2string(bufView)
    console.log(str)
	});


//------ Apri Agent Sensor System end


	socket.on('disconnect', function() {

		if (socket.apriSensorUnitId != undefined && unitIds[socket.apriSensorUnitId]!=undefined)
		// && unitIds[socket.apriSensorUnitId].nrOfDisconnects != undefined)
		{
			unitIds[socket.apriSensorUnitId].nrOfDisconnects++;
			//unitIds[socket.apriSensorUnitId].socket	= undefined;
		}
        console.log('user disconnected');
		console.log('disconnect from '+ socket.request.connection.remoteAddress);
		//io.sockets.emit('info', { nrOfConnections: io.engine.clientsCount } );
		//console.log('nr of connections:'+io.engine.clientsCount);
    });
//    socket.on('send', function (data) {
//        io.sockets.emit('message', data);
//    });

});

io.listen(apriConfig.systemListenPort);


apriSocketIO.streamEvents(io.sockets, 'humansensor');
