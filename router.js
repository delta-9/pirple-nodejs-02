

var _handlers = {
  default: function(data, response) {
    response(404);
  }
};

var router = {};

/**
 * Add a route handler.
 *
 * @param {String} method
 *   The http method of the handler.
 * @param {String} path
 *   The path of the handler.
 * @param {function} handler
 *   The function to handle the route.
 */
router.add = function(method, path, handler) {
  if (!_handlers[method]) {
    _handlers[method] = {};
  }
  if (_handlers[method][path]) {
    throw new Error('Attempt to add the same route twice');
  }
  _handlers[method][path] = handler;
};

/**
 * Override the default handler.
 *
 * @param {function} handler
 *   The default handler function.
 */
router.addDefault = function(handler) {
  _handlers.default = handler;
}

/**
 * Route the current request to the handler.
 *
 * @param {String} path
 *   The trimmed path used to identify the route.
 * @param {Object} data
 *   An object containing info about the request and the original node http request object.
 * @param {Object} res
 *   The original node http response object
 */
router.route = function(path, data, res) {
  if (_handlers[data.method] && _handlers[data.method][path]) {
    return _handlers[data.method][path](data, response(res));
  }
  _handlers.default(data, response(res));
}

/**
 * Return a response handler for the current route (encapsulate res).
 * @param {Object} res
 */
function response(res) {
  return function(status, payload) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(JSON.stringify(payload));
  }
}

module.exports = router;
