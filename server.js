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


var internals = {};

internals.users = {
    john: {
        id: 'john',
        password: 'password',
        name: 'John Doe'
    }
};

internals.login = function (request, reply) {

    if (request.auth.isAuthenticated) {
        return reply.redirect('/');
    }

    var message = '';
    var account = null;

    if (request.method === 'post') {

        if (!request.payload.username ||
            !request.payload.password) {

            message = 'Missing username or password';
        }
        else {
            account = internals.users[request.payload.username];
            if (!account ||
                account.password !== request.payload.password) {

                message = 'Invalid username or password';
            }
        }
    }

    if (request.method === 'get' ||
        message) {

        return reply('<html><head><title>Login page</title></head><body>' + (message ? '<h3>' + message + '</h3><br/>' : '') + '<form method="post" action="/login">Username: <input type="text" name="username"><br>Password: <input type="password" name="password"><br/><input type="submit" value="Login"></form></body></html>');
    }

    request.auth.session.set(account);
    return reply.redirect('/');
};

internals.logout = function (request, reply) {

    request.auth.session.clear();
    return reply.redirect('/');
};

var hapiConfig = {
    auth: {
        scheme: 'cookie',
        password: 'secret',
        cookie: 'sid',
        redirectTo: '/login',
        isSecure: false
    }
};


hapi_server.route([
    { method: 'GET', path: '/', handler: { file: './html/index.html' } },
    { method: '*', path: '/login', config: { handler: internals.login, auth: { mode: 'try' } } },
    { method: 'GET', path: '/logout', config: { handler: internals.logout, auth: true } }
]);

sockjsServer.installHandlers(hapi_server.listener, {prefix:'/echo'});

hapi_server.start();

