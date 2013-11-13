/**
 * Created by tony.gemoll on 11/1/13.
 */
var http = require('http');
var sockjs = require('sockjs');
var Hapi = require('hapi');
var levelup = require('levelup');

var db = levelup('./db');

var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};

var connections = [];
var boardPrefix =  'board';

var sockjs_echo = sockjs.createServer(sockjs_opts);

sockjs_echo.on('connection', function(conn) {
    conn.on('data', sendMessage);
    connections.push(conn);


    db.createReadStream({
        start : boardPrefix,
        end   : boardPrefix + '\xFF'
    })
    .on('data', function (data) {
        conn.write(JSON.stringify(data));
    });
});

function sendMessage(message){

    var move = JSON.parse(message);
    move.key = boardPrefix + move.key;
    db.put(move.key, move.value, function (err) {
        if (err) return console.log('Ooops!', err)
    });

    for(var x = 0; x < connections.length; x++)
    {
        connections[x].write(JSON.stringify(move));
    }
}


var hapi_server = Hapi.createServer('0.0.0.0');
if (process.env.port)
    hapi_server._port = process.env.port
else
    hapi_server._port = 9999;


hapi_server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: './html', listing: false, index: true }
    }
});

sockjs_echo.installHandlers(hapi_server.listener, {prefix:'/echo'});

hapi_server.start();
