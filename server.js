var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var router = require('./router');

/**
 * Handler for an http server.
 * @param {Object} req
 * @param {Object} res
 */
function server(req, res) {
  // get the URL and parse it.
  var parsedUrl = url.parse(req.url, true);

  // get the path.
  var path = parsedUrl.pathname.replace(/^\/+|\/+$/g, '');

  // get the query string as an object
  var queryStringObject = parsedUrl.query;

  // Get the payload, if any
  var decoder = new StringDecoder('utf-8');
  var buffer = '';
  req.on('data', function(data) {
    buffer += decoder.write(data);
  });
  req.on('end', function() {
    buffer += decoder.end();

    var data = {
      req: req,
      path: path,
      queryStringObject: queryStringObject,
      method: req.method.toLowerCase(),
      headers: req.headers,
      payload: buffer,
    };

    // Route the request.
    router.route(path, data, res);
  });
};

module.exports = server;
