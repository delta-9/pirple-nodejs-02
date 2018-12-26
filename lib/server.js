const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const util = require('util');
const debug = util.debuglog('server');

const users = require('../handlers/users');
const tokens = require('../handlers/tokens');
const checks = require('../handlers/checks');
const router = require('./router');
const config = require('./config');
const helpers = require('./helpers');
const fileStore = require('./fileStore');

/**
 * Handler for an http server.
 * @param {Object} req
 * @param {Object} res
 */
function server(req, res) {
  // get the URL and parse it.
  const parsedUrl = url.parse(req.url, true);

  // get the path.
  const path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // get the query string as an object
  const queryStringObject = parsedUrl.query;

  // Get the payload, if any
  const decoder = new StringDecoder('utf-8');
  let buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', async () => {
    buffer += decoder.end();

    const data = {
      req: req,
      path: path,
      queryStringObject: queryStringObject,
      method: req.method.toLowerCase(),
      headers: req.headers,
      payload: helpers.parseJsonToObject(buffer),
      authenticated: false,
      authenticatedUser: null,
      getString: function(name, defaultValue = false) {
        return this.payload && this.payload[name] && String(this.payload[name]).trim().length ? String(this.payload[name]).trim() : defaultValue;
      },
      getBoolean: function(name) {
        return this.payload && typeof(this.payload[name]) === 'boolean' && this.payload[name] ? true : false;
      },
      getNumber: function(name) {
        return this.payload && typeof(this.payload[name]) === 'number' ? this.payload[name] : false;
      },
      getArray: function(name) {
        return this.payload && typeof(this.payload[name]) === 'object' && this.payload[name] instanceof Array ? this.payload[name] : false;
      },
    };

    // Authenticate user if a token is provided.
    if (typeof(data.headers.token) !== 'string') {
      // Route the request.
      return router.route(path, data, res);
    }

    const authenticatedUser = await authenticateUser(data.headers.token);
    if (!authenticatedUser) {
      return router.route(path, data, res);
    }
    data.authenticated = true;
    data.authenticatedUser = authenticatedUser;
    debug('authenticated request by user phone: ' + data.authenticatedUser.phone);
    return router.route(path, data, res);
  });
};



// Verify if a token is valid for a given user, and if the user exists return it.
async function authenticateUser(id) {
  const tokensRetrieveResponse = await fileStore.read('tokens', id);
  if (!tokensRetrieveResponse.ok) {
    return false;
  }
  const tokenData = tokensRetrieveResponse.data;
  if (tokenData.expires <= Date.now()) {
    return false;
  }
  const readUserResponse = await fileStore.read('users', tokenData.phone);
  if (!readUserResponse.ok) {
    return false;
  }
  return readUserResponse.data;
};

const serverContainer = {};

serverContainer.httpServer = http.createServer(server);

serverContainer.httpsServer = https.createServer({
  key: fs.readFileSync(path.join(__dirname, '/../https/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '/../https/cert.pem')),
}, server);

serverContainer.init = function() {
  this.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[36m%s\x1b[0m', 'The http server is listening on port ' + config.httpPort);
  });
  this.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[35m%s\x1b[0m', 'The https server is listening on port ' + config.httpsPort);
  });

  // Frontpage
  router.add('get', '', function(data, response) {
    const payload = {
      message: 'Homework Assignment #2 API',
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
};

module.exports = serverContainer;
