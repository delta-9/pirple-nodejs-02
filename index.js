var http = require('http');
var https = require('https');
var fs = require('fs');
var server = require('./server');
var router = require('./router');
var config = require('./config');


var httpServer = http.createServer(server);
httpServer.listen(config.httpPort);

var httpsServer = https.createServer({
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
}, server);
httpsServer.listen(config.httpsPort);

// Frontpage
router.add('get', '', function(data, response) {
  var payload = {
    message: 'Homework Assignment #1: Please post to /hello',
  };
  response(200, payload);
});

// Hello handler
router.add('post', 'hello', function(data, response) {
  var payload = {
    message: 'Hello Pirple community!',
  };
  response(200, payload);
});

// Default handler
router.addDefault(function(data, response) {
  var payload = {
    message: 'Nothing here',
  };
  response(404, payload);
});
