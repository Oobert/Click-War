var sockjs = require('sockjs');
var Hapi = require('hapi');
var levelup = require('levelup');
var fs = require('fs');


var db = levelup('./db');
var sockjs_opts = {sockjs_url: "http://cdn.sockjs.org/sockjs-0.3.min.js"};
var boardPrefix =  'board';
var sockjsServer = sockjs.createServer(sockjs_opts);

db.on('error', logError);

sockjsServer.on('connection', function(conn) {
    conn.on('data', sendMessage);

    var moveFun = function(key, value){
        conn.write(value);
    };

    conn.on('close', function() {
        db.removeListener('put', moveFun);
    });
    db.on('put', moveFun);

    sendBoardTo(conn);
});

function sendBoardTo(conn) {

    db.createValueStream({
        start: boardPrefix,
        end: boardPrefix + '\xFF'
    }).pipe(conn, { end : false });


}

function sendMessage(message){
    var move = JSON.parse(message);
    var moveKey = boardPrefix + move.tile;
    db.put(moveKey, message);
}

function logError(err){
    if (err) console.log('levelDB had an error!', err);
}


var options = {
    tls: {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    }
};
var port = parseInt(process.env.port) || 9999;
var hapi_server = Hapi.createServer( '0.0.0.0', port);


hapi_server.route({
    method: 'GET',
    path: '/{path*}',
    handler: {
        directory: { path: './html', listing: false, index: true }
    }
});

sockjsServer.installHandlers(hapi_server.listener, {prefix:'/echo'});

hapi_server.start();

