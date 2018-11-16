const http = require('http');
const https = require('https');
const fs = require('fs');
const server = require('./server');
const router = require('./router');
const config = require('./config');


const httpServer = http.createServer(server);
httpServer.listen(config.httpPort);

const httpsServer = https.createServer({
  key: fs.readFileSync('./https/key.pem'),
  cert: fs.readFileSync('./https/cert.pem'),
}, server);
httpsServer.listen(config.httpsPort);

// Frontpage
router.add('get', '', function(data, response) {
  const payload = {
    message: 'Homework Assignment #1: Please post to /hello',
  };
  response(200, payload);
});

// Hello handler
router.add('post', 'hello', function(data, response) {
  const payload = {
    message: 'Hello Pirple community!',
  };
  response(200, payload);
});

// Default handler
router.addDefault(function(data, response) {
  const payload = {
    message: 'Nothing here',
  };
  response(404, payload);
});
