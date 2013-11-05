/**
 * Created by tony.gemoll on 11/1/13.
 */
var http = require('http');
var sockjs = require('sockjs');
var Hapi = require('hapi');


// 1. Echo sockjs server
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};

var connections = [];

var sockjs_echo = sockjs.createServer(sockjs_opts);
sockjs_echo.on('connection', function(conn) {
    conn.on('data', sendMessage);
    connections.push(conn);

});

function sendMessage(message){
    for(var x = 0; x < connections.length; x++)
    {
        connections[x].write(message);
    }
}


var hapi_server = Hapi.createServer('0.0.0.0');
hapi_server._port = process.env.port | 9999;


hapi_server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: './html', listing: false, index: true }
    }
});

sockjs_echo.installHandlers(hapi_server.listener, {prefix:'/echo'});

console.log(' [*] Listening on 0.0.0.0:9999' );
hapi_server.start();


