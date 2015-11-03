var http = require('http');
var events = require('events');
var cmd = require('cmd');
var SteamTradeOffers = require('steam-tradeoffers');

var ee = new events.EventEmitter();

ee.on('createServer', function() {
	http.createServer(function (request, response) {
		response.writeHead(200, {'Content-Type': 'text/plain'});
		response.end('Hello World\n');
	}).listen(8124);
});

cmd.pref();
cmd.add('start_server', function(){
	ee.emit('createServer');
});