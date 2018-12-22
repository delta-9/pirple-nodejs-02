

const _handlers = {
  default: function(data, response) {
    if (data.method !== 'get') {
      return response(405);
    }
    return response(404);
  }
};

const router = {};

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
 * Shortcut to add the full CRUD handlers.
 * (create, read, update, delete)
 *
 * @param {String} path
 *   The path of the handler.
 * @param {function} handlers
 *   An object containing the function to handle the CRUD routes.
 *   Allow create, read, update, delete and post, get, put, delete.
 */
router.addCRUD = function(path, handlers) {
  // Since the method is called add CRUD allow CRUD handlers...
  if (
    !(handlers.post || handlers.create) ||
    !(handlers.get || handlers.read) ||
    !(handlers.put || handlers.update) ||
    !handlers.delete
  ) {
    throw new Error(`Missing one or more CRUD handler in ${path} route.`);
  }

  router.add('post', path, handlers.post || handlers.create);
  router.add('get', path, handlers.get || handlers.read);
  router.add('put', path, handlers.put || handlers.update);
  router.add('delete', path, handlers.delete);
}

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
  return function(status, payload = {}) {
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(status);
    res.end(JSON.stringify(payload));
  }
}

module.exports = router;
