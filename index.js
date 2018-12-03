const http = require('http');
const https = require('https');
const fs = require('fs');
const server = require('./server');
const router = require('./router');
const config = require('./config');
const users = require('./handlers/users');

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

// Users handler
router.add('post', 'users', users.post);
router.add('get', 'users', users.get);
router.add('put', 'users', users.put);
router.add('delete', 'users', users.delete);

// Default handler
router.addDefault(function(data, response) {
  if (data.method !== 'get') {
    return response(405, {
      message: 'Method Not Allowed',
    });
  }
  const payload = {
    message: 'Nothing here',
  };
  response(404, payload);
});
