var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var alarm = require('./lib/alarm').Alarm();
var gpio = require("pi-gpio");


var url = require('url');

var debugmode = false;

function debug(str) {
	if (debugmode) {
		console.log(str);
	}
}

if (process.argv.length > 2) {
	for(i=2; i<process.argv.length;i++){
		switch(process.argv[i]){
			case "debug":
			case "-d":
				debugmode = true
				console.log("Debugmode on")
		}
	}
}

server.listen(8081, function () {
	console.log('Server running on port '+server.address().port);
});

server.on('request', function(req,res){
	var path = url.parse(req.url).pathname;
	debug("Request for "+path+" received!");

});

function parseTime(string) {
	var time = string.split(':');

	if (time.length == 1) {
		time[1] = 0;
	}

	return time;

}



alarm.setCallback(function(){
	io.sockets.emit('trigger');
	gpio.open(11,"out", function(err) {
		gpio.write(11,1);
	});
	
});

io.sockets.on('connection', function(socket){
	debug("New Websocket Connection")
	socket.emit('init',{
		nextAlarm: alarm.getNext(),
		now: new Date().getTime()
	});
	
	socket.on('set', function(data){
		alarm.setTime.apply(alarm, parseTime(data.newAlarm));
		io.sockets.emit('update', {
			nextAlarm: alarm.getNext(),
			now: new Date().getTime()
		});
	});
	
	socket.on('stop', function(data){
		alarm.cancel();
		gpio.write(11,0,function(err){
			gpio.close(11);
		});
		io.sockets.emit('stop', {
			nextAlarm: alarm.getNext(),
			now: new Date().getTime()
		});
	});

});

app.use(express.static(__dirname + '/html'));
