/*jslint devel: true,  undef: true, newcap: true, white: true, maxerr: 50 */
/**
 * The apri-server-socket.io module for web-socket between server and client.
 * @module apri-server-socket.io
 */

var _IOSockets; // all active io.sockets 

var ioSockets= {};

var action	=	{};
action.message	= {
		type: 'message',
		text:'Dit is een testbericht'
};
ioSockets.esSchedule	= [
	{id:'S001', beginDT: '', endDT:'', hours:{'8':true,'10':true,'11':true,'12':true,'13':true,'14':true,'16':true,'18':true,'20':true,'1':true}, minutes:{'6':true,'7':true,'0':true,'10':true,'20':true,'30':true,'40':true,'50':true}, esProcessId:'P001'}
];
ioSockets.esProcess	= {
	'P001': {
		action: { 
		  	  'begin': {type:'humansensordata', text:'A001: Testbericht', onEnd:'A002', duration:60000, pulse:2000}
			, 'A002': {type:'humansensordata', text:'A002: Testbericht', onEnd:'A003', duration:60000, pulse:2000}
			, 'A003': {type:'humansensordata', text:'A003: Testbericht'}
		}
	}
};

ioSockets.esCaseAction		= {};

/* 
case action:
	caseActionKey	composed of esProcessId_actionId_caseStartTime
	type			event type
	startTime		time window start time
	endTime			time window end time
	text			text for message to send
	onEnd			next action
	duration		total duration action time window 
	pulse			timeout time for dispatch event repeat
	active			true: action is active
	sleep			false: ready for dispatch;	true: already dispatched, waiting for next pulse 
*/	 


ioSockets.humansensor	= function() {
	

	//var actionString	= JSON.stringify( action.message);
	var f = function () {
			
		dispatchCaseActionEvents();
		timeoutId = setTimeout(f, 10000);
	};
	f();

//	clearTimeout(timeoutId);

}

var dispatchCaseActionEvents	= function() {
	var _action, _event;
	var _nowTime	= new Date().getTime();
	for (var actionKey in ioSockets.esCaseAction) {
		_action	= ioSockets.esCaseAction[actionKey]
		if (_action.active == false || _action.sleep == true) continue;
		if (_nowTime >= _action.startTime && _nowTime <= _action.endTime) {
			_action.processAction.type?_action.processAction.type:'message';  //default type is message
			_event	= '{"id": "id"';
			if (_action.processAction.text) _event	+= ',"text": "' + _action.processAction.text + '"';
			_event	+= '}';
			_IOSockets.emit(_action.processAction.type,_event )
			console.log('socket.io event: '+ _action.startTime + ' ' + _action.endTime + ' ' + _action.processAction.type + ' ' + _event);
			_action.sleep	= true;
		}
	};
}


module.exports = {
	
	//io.sockets.emit('message', data);
	streamEvents: function(IOSockets, socketIOType) {  // socketIOType like 'humansensor'
		_IOSockets = IOSockets; 
		ioSockets[socketIOType]();
		return;	
	}

};  // end of exports



// EventSource case actions manager
var createESCaseActions	= function() {
	var dt		= {};
	dt.now		= new Date();
	dt.nowTime 	= dt.now.getTime();
	dt.nowHour	= dt.now.getHours();
	dt.nowMinute= dt.now.getMinutes();
	
	console.log(dt.nowHour+' '+dt.nowMinute);
	
	// remove old case actions
	var toRemove	= {};
	for (var action in ioSockets.esCaseAction) {
		if (ioSockets.esCaseAction[action].endTime < dt.nowTime) {
			//console.log('EventSource case action prepare to remove: ' + ioSockets.esCaseAction[action].caseActionKey);
			//console.log(ioSockets.esCaseAction[action].endTime);
			//console.log(dt.nowTime);
			ioSockets.esCaseAction[action].active= false;
			toRemove[ioSockets.esCaseAction[action].caseActionKey]={};
		}
	}
	for (var action in toRemove) {
		console.log('EventSource case action removed: ' + action ); //ioSockets.esCaseAction[action].caseActionKey);
		delete ioSockets.esCaseAction[action];
	}
	
	for (var sI=0;sI<ioSockets.esSchedule.length;sI++) {
		var _esSchedule	= ioSockets.esSchedule[sI];
		dt.nowHourStr	= ''+dt.nowHour;
		if (_esSchedule.hours) {
			if (_esSchedule.hours[dt.nowHourStr]!=true) {
				continue;
			}
		}		
		if (_esSchedule.minutes) {
			dt.nowMinuteStr	= ''+dt.nowMinute;
			if (_esSchedule.minutes[dt.nowMinuteStr]!=true) {
				continue;
			}
		}		
		if (ioSockets.esProcess[_esSchedule.esProcessId]) {
			var _process		= ioSockets.esProcess[_esSchedule.esProcessId];
			var actionTime		= dt.nowTime;
			_process.action.esProcessId	= _esSchedule.esProcessId;
			var _actionId		= 'begin';
			_process.action[_actionId].actionId	= _actionId;
			_process.action[_actionId].esProcessId	= _esSchedule.esProcessId;
			var caseActionKeyTime	= new Date(dt.now.getFullYear(),dt.now.getMonth(),dt.now.getDate(),dt.nowHour,dt.nowMinute).getTime();
			_process.action[_actionId].caseActionKeyTime	= caseActionKeyTime;
			console.log('Start creating case actions: ' + _esSchedule.esProcessId + ' / ' + _actionId + ' / ' + dt.nowHour + ' / ' + dt.nowMinute  );
			if (_process.action && _process.action.begin) createCaseActions(_process, _process.action[_actionId], actionTime);
		}
		
	}
}

// create case actions from scheduled process
var createCaseActions	= function(process, processAction, actionTime) {
	var _action				= {};
	var caseActionKey		= processAction.esProcessId + '_' + processAction.actionId + '_' + processAction.caseActionKeyTime;
	if (ioSockets.esCaseAction[caseActionKey]) return; // caseAction already created
	
	_action.process			= process;
	_action.processAction	= processAction;
	_action.startTime		= actionTime; 
	var duration 			= processAction.duration?processAction.duration:60000;
	_action.endTime			= actionTime + duration  // default duration 1 minute
	_action.caseActionKey	= caseActionKey;
	_action.active			= true;
	ioSockets.esCaseAction[caseActionKey] = _action;
	console.log('EventSource case action created: ' + caseActionKey);
	if (processAction.onEnd) {
		var _actionId		= processAction.onEnd;
		process.action[processAction.onEnd].actionId			= _actionId;
		process.action[processAction.onEnd].esProcessId			= processAction.esProcessId;
		process.action[processAction.onEnd].caseActionKeyTime	= processAction.caseActionKeyTime;
		createCaseActions(process, process.action[processAction.onEnd], _action.endTime); 
	} 
}

var intervalId	= setInterval(createESCaseActions, 10000);



    
