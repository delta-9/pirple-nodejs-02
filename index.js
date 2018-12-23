const http = require('http');
const https = require('https');
const fs = require('fs');
const server = require('./server');
const router = require('./router');
const config = require('./config');
const users = require('./handlers/users');
const tokens = require('./handlers/tokens');
const checks = require('./handlers/checks');

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
    message: 'Homework Assignment #2: Please post to /hello',
  };
  response(200, payload);
});

// Users handlers
router.addCRUD('users', users);

// Tokens handlers
router.addCRUD('tokens', tokens);

// Tokens handlers
router.addCRUD('checks', checks);

// Default handler
router.addDefault(function(data, response) {
  if (data.method !== 'get') {
    return response(405, {
      message: 'Method Not Allowed',
    });
  }
  const payload = {
    message: '404 - Nothing here',
  };
  return response(404, payload);
});
