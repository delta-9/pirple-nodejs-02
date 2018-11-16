const url = require('url');
const StringDecoder = require('string_decoder').StringDecoder;
const router = require('./router');

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
      payload: buffer,
    };

    // Route the request.
    router.route(path, data, res);
  });
};

module.exports = server;
