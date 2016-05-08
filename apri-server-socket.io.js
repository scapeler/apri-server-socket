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
	{id:'S001', beginDT: '', endDT:'', limit:'minute', hours:{repeat:{begin:0,end:23,pulse:1},'8':true,'9':true,'10':true,'11':true,'12':true,'13':true,'14':true,'16':true,'18':true,'20':true,'21':true,'22':true,'23':true}, minutes:{repeat:{begin:0,end:59,pulse:0}}, seconds:{'0':true}, esProcessId:'P001'}
];


ioSockets.esProcess	= {
	'P001': {
		action: { 
		  	  'begin': {'id':'A001', type:'humansensordata', text:'A001: Testbericht', onEnd:'A002', duration:2000, pulse:2000}
			, 'A002': {'id':'A002',type:'humansensordata', text:'A002: Testbericht', onEnd:'end', duration:2000, pulse:2000}
			, 'end': {'id':'A003',type:'humansensordata', text:'A003: Testbericht', duration:2000}
		}
	}
};

ioSockets.esCaseAction			= {};

ioSockets.dispatchedProcesses	= {};


for (var rec in ioSockets.esSchedule) {
	var schedule = ioSockets.esSchedule[rec];
	if (schedule.hours && schedule.hours.repeat) {
		var _repeat 	= schedule.hours.repeat;
		_repeat.pulse	= _repeat.pulse?_repeat.pulse:1; // default repeat per 1 hour
		_repeat.begin	= _repeat.begin?_repeat.begin:0; // default begin at 0 minutes
		_repeat.end		= _repeat.end?_repeat.end:23; // default end at 23h 
		for (var _tmp=_repeat.begin;_tmp<=_repeat.end;_tmp+=_repeat.pulse) {
			schedule.hours[''+_tmp]=true;
		}
	}
	if (schedule.minutes && schedule.minutes.repeat) {
		var _repeat 	= schedule.minutes.repeat;
		_repeat.pulse	= _repeat.pulse?_repeat.pulse:10; // default repeat per 10 minutes
		_repeat.begin	= _repeat.begin?_repeat.begin:0; // default begin at 0 minutes
		_repeat.end		= _repeat.end?_repeat.end:59; // default end at 59 minutes
		for (var _tmp=_repeat.begin;_tmp<=_repeat.end;_tmp+=_repeat.pulse) {
			schedule.minutes[''+_tmp]=true;
		}
	}
}
/* schedule 
	id					id of schedule (e.g. 'S001')
	beginDT
	endDT
	limit				limit processing per 'minute' or 'second'
	hours				limit processing to hours (manual or created by repeat)
		repeat			create hours values from begin end pulse
			begin		begin value for repeat (numeric)
			end			end value for repeat (numeric)
			pulse		pulse value for repeat (numeric)
		'0','1',etc.	manual value (alfanumeric, '1', '2',...'10', etc.) (0-23)
	minutes		
		repeat			create hours values from begin end pulse
			begin		begin value for repeat (numeric)
			end			end value for repeat (numeric)
			pulse		pulse value for repeat (numeric)
		'0','1',etc.	manual value (alfanumeric, '1', '2',...'10', etc.) (0-59)
	seconds		
		repeat			create hours values from begin end pulse
			begin		begin value for repeat (numeric)
			end			end value for repeat (numeric)
			pulse		pulse value for repeat (numeric)
		'0','1',etc.	manual value (alfanumeric, '1', '2',...'10', etc.) (0-59)
	esProcessId			foreign key id to esProcess


	
,'0':true,'10':true,'20':true,'30':true,'40':true,'50':true

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
		timeoutId = setTimeout(f, 1000);
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
			_event	= '{'; 
			_event	+= '"caseId":"' + _action.caseActionKey+'"';
			_event	+= ',"id":"' + _action.processAction.id+'"';
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



// Socket.io case actions manager
// creates case actions from schedule promised between 1999ms from current datetime rounded at seconds.
var createESCaseActions	= function() {
	var dt					= {};
	dt.curr_date			= new Date();
	var tmpTime				= (Math.round((dt.curr_date.getTime()+1999)/1000)*1000); // round to next second
	dt.scheduleTime			= tmpTime
	dt.schedule				= new Date(dt.scheduleTime);
	dt.scheduleYear			= dt.schedule.getFullYear();
	dt.scheduleMonth		= dt.schedule.getMonth();
	dt.scheduleDay			= dt.schedule.getDate();
	dt.scheduleHour			= dt.schedule.getHours();
	dt.scheduleHourStr		= ''+dt.scheduleHour;
	dt.scheduleMinute		= dt.schedule.getMinutes();
	dt.scheduleMinuteStr	= ''+dt.scheduleMinute;
	dt.scheduleSecond		= 0; //dt.schedule.getSeconds();
	dt.caseTimeLimitMinute	= new Date(dt.scheduleYear,dt.scheduleMonth,dt.scheduleDay,dt.scheduleHour,dt.scheduleMinute).getTime();  // case time to limit dispatch once per minute 
	dt.caseTimeLimitSecond	= new Date(dt.scheduleYear,dt.scheduleMonth,dt.scheduleDay,dt.scheduleHour,dt.scheduleMinute,dt.scheduleSecond).getTime();  // case time to limit dispatch once per minute 
	
	if (dt.scheduleSecond==0) console.log('hh mm ss: '+dt.scheduleHour+' '+dt.scheduleMinute+' '+dt.scheduleSecond);
	
	// remove old case actions
	var toRemove	= {};
	for (var action in ioSockets.esCaseAction) {
		if (ioSockets.esCaseAction[action].endTime-1 < dt.scheduleTime) {
			//console.log('case action prepare to remove: ' + ioSockets.esCaseAction[action].caseActionKey);
			//console.log(ioSockets.esCaseAction[action].endTime);
			//console.log(dt.scheduleTime);
			ioSockets.esCaseAction[action].active= false;
			toRemove[ioSockets.esCaseAction[action].caseActionKey]={};
		}
	}
	for (var action in toRemove) {
		console.log('Case action removed: ' + action ); //ioSockets.esCaseAction[action].caseActionKey);
		delete ioSockets.esCaseAction[action];
	}
	
	
	
	for (var sI=0;sI<ioSockets.esSchedule.length;sI++) {
		var _esSchedule	= ioSockets.esSchedule[sI];
		
		// is schedule active for now?
		if (_esSchedule.hours && _esSchedule.hours[dt.scheduleHourStr]!=true) {
			continue;
		}		
		if (_esSchedule.minutes && _esSchedule.minutes[dt.scheduleMinuteStr]!=true) {
			continue;
		}

		// process actions definition for scheduled process not available
		if (!ioSockets.esProcess[_esSchedule.esProcessId]) continue; 

		var _process								= ioSockets.esProcess[_esSchedule.esProcessId];  // _process = defines process and actions
		_process.action.esProcessId					= _esSchedule.esProcessId;
		
		var actionTime								= dt.scheduleTime;
		var _actionId								= 'begin';   // first action in process actions chain
		
		_process.action[_actionId].actionId			= _actionId;
		_process.action[_actionId].esProcessId		= _esSchedule.esProcessId;
		
		var caseActionKeyTime						= dt.scheduleTime;
		_process.action[_actionId].caseActionKeyTime= caseActionKeyTime;
		
		
		// case time to limit dispatching (per minute or second)  
		if (_process.limit=='second') {
			_process.action[_actionId].caseTime		= dt.caseTimeLimitSecond;
		} else {
			_process.action[_actionId].caseTime		= dt.caseTimeLimitMinute;
		}
		var _processKey = _esSchedule.esProcessId+_process.action[_actionId].caseTime;
		
		if (ioSockets.dispatchedProcesses[_processKey]) {
			//console.log('process already created: '+_processKey);
			continue;  // already created
		}
		
		_process.action[_actionId].processKey	= _processKey;
		//console.log('processKey: '+_processKey);

		// 
		if (_process.action && _process.action[_actionId]) {
			ioSockets.dispatchedProcesses[_processKey]={};
			createCaseActions(_process, _process.action[_actionId], actionTime);
		}	
		
	}
}

// create case actions from scheduled process
var createCaseActions	= function(process, processAction, actionTime) {
	var _action				= {};
	
	var caseActionKey		= processAction.esProcessId + '_' + processAction.actionId + '_' + processAction.caseActionKeyTime;
	
	if (ioSockets.esCaseAction[caseActionKey]) return; // caseAction already created
	
	console.log('Start creating case actions: ' + actionTime + ' / ' + processAction.esProcessId   + ' / ' + processAction.actionId  + ' / ' + processAction.processKey);

	_action.process			= process;
	_action.processAction	= processAction;
//	_action.caseTime		= ,dt.scheduleMinute
	_action.startTime		= actionTime; 
	var duration 			= processAction.duration?processAction.duration:60000;
	_action.endTime			= actionTime + duration  // default duration 1 minute
	_action.caseActionKey	= caseActionKey;
	_action.active			= true;
	ioSockets.esCaseAction[caseActionKey] = _action;
	//console.log('Socket.io case action created: ' + caseActionKey);
	if (processAction.onEnd) {
		var _actionId		= processAction.onEnd;
		process.action[processAction.onEnd].actionId			= _actionId;
		process.action[processAction.onEnd].esProcessId			= processAction.esProcessId;
		process.action[processAction.onEnd].processKey			= processAction.processKey;
		process.action[processAction.onEnd].caseActionKeyTime	= processAction.caseActionKeyTime;
		createCaseActions(process, process.action[processAction.onEnd], _action.endTime); 
	} 
}

var intervalId	= setInterval(createESCaseActions, 10000); // create new case actions 



    
