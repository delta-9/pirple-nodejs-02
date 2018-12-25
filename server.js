const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('./router');
const helpers = require('./lib/helpers');
const fileStore = require('./lib/fileStore');
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
  req.on('end', function() {
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

    authenticateUser(data.headers.token, function(authenticatedUser) {
      if (!authenticatedUser) {
        return router.route(path, data, res);
      }
      data.authenticated = true;
      data.authenticatedUser = authenticatedUser;
      return router.route(path, data, res);
    });
  });
};



// Verify if a token is valid for a given user, and if the user exists return it.
function authenticateUser(id, callback) {
  fileStore.read('tokens', id, function (err, tokenData) {
    if (err || !tokenData) {
      return callback(false);
    }
    if (tokenData.expires <= Date.now()) {
      return callback(false);
    }
    fileStore.read('users', tokenData.phone, function(err, userData) {
      if (err || !userData) {
        return callback(false);
      }
      return callback(userData);
    });
  });
};

module.exports = server;
