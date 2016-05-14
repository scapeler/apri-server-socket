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

var io = require('socket.io')({path: '/SCAPE604/socket.io'});
//io.on('connection', function(socket){});

console.log('listening to http://proxyintern: ' + apriConfig.systemListenPort);

io.sockets.on('connection', function (socket) {
	console.log('connect from '+ socket.request.connection.remoteAddress);
	console.log('connect from2 '+ socket.handshake.headers['x-forwarded-for'] || socket.handshake.address.address);
	
	
//    socket.emit('humansensordata', { message: 'welcome humansensordata' });
	apriSocketIO.sendActiveActions(socket);
	io.sockets.emit('info', { nrOfConnections: io.engine.clientsCount } );
	console.log('nr of connections:'+io.engine.clientsCount);
    socket.emit('connected', { message: 'welcome' });
	socket.on('disconnect', function() {
        console.log('user disconnected');
		console.log('disconnect from '+ socket.request.connection.remoteAddress);
		io.sockets.emit('info', { nrOfConnections: io.engine.clientsCount } );
		console.log('nr of connections:'+io.engine.clientsCount);
    });
//    socket.on('send', function (data) {
//        io.sockets.emit('message', data);
//    });
	
});

io.listen(apriConfig.systemListenPort);


apriSocketIO.streamEvents(io.sockets, 'humansensor');



