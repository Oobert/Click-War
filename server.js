/**
 * Created by tony.gemoll on 11/1/13.
 */
var http = require('http');
var sockjs = require('sockjs');
var Hapi = require('hapi');
var levelup = require('levelup');
var events = require('events');

var db = levelup('./db');
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var boardPrefix =  'board';
var sockjsServer = sockjs.createServer(sockjs_opts);
var moveEmitter = new events.EventEmitter();



sockjsServer.on('connection', function(conn) {
    conn.on('data', sendMessage);

    var moveFun = function(move){
        conn.write(JSON.stringify(move));
    };

    conn.on('close', function() {
        moveEmitter.removeListener('move', moveFun);
    });
    moveEmitter.on('move', moveFun);

    sendBoardTo(conn);
});

function sendBoardTo(conn) {

    db.createReadStream({
        start: boardPrefix,
        end: boardPrefix + '\xFF'
    })
    .on('data', function (data) {
        conn.write(JSON.stringify(data));
    });
}

function sendMessage(message){

    var move = JSON.parse(message);
    move.key = boardPrefix + move.key;
    db.put(move.key, move.value, logError);

    moveEmitter.emit('move', move);
}


function logError(err)
{
    if (err) console.log('Ooops!', err);
}



var port = process.env.port | 9999;
var hapi_server = Hapi.createServer('0.0.0.0', port);


hapi_server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: './html', listing: false, index: true }
    }
});

sockjsServer.installHandlers(hapi_server.listener, {prefix:'/echo'});

hapi_server.start();
