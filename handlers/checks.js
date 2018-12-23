
const config = require('../config');
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const checks = {};

// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
checks.post = function(data, response) {
  const protocol = data.getString('protocol') && ['http', 'https'].includes(data.getString('protocol')) ? data.getString('protocol') : false;
  const url = data.getString('url') && data.getString('url').length > 0 ? data.getString('url') : false;
  const method = data.getString('method') && ['post', 'get', 'put', 'delete'].includes(data.getString('method')) ? data.getString('method') : false;
  const successCodes = data.getArray('successCodes') && data.getArray('successCodes').length > 0 ? data.getArray('successCodes') : false;
  const timeoutSeconds = data.getNumber('timeoutSeconds') && data.getNumber('timeoutSeconds') % 1 === 0 && data.getNumber('timeoutSeconds') > 0 && data.getNumber('timeoutSeconds') <= 5 ? data.getNumber('timeoutSeconds') : false;

  if (!protocol || !url || !method || !successCodes || !timeoutSeconds) {
    return response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
  }

  if (!data.authenticated) {
    return response(403, {error: 'Access denied'});
  }

  const userChecks = typeof(data.user.checks) === 'object' && data.user.checks instanceof Array ? data.user.checks : [];
  if (userChecks.length >= config.maxChecks) {
    return response(400, {error: `The user has the maximum number of checks (${config.maxChecks})`});
  }

  const checkId = helpers.createRandomString(20);

  var checkObject = {
    id: checkId,
    userPhone: data.user.phone,
    protocol,
    url,
    method,
    timeoutSeconds
  };

  fileStore.create('checks', checkId, checkObject, function(err) {
    if (err) {
      return response(500, {error: 'Could not create the new check'});
    }
    data.user.checks = userChecks;
    data.user.checks.push(checkId);
    fileStore.update('users', data.user.phone, data.user, function(err) {
      if (err) {
        return response(500, {error: 'Could not update the user with the new check'});
      }
      return response(200, checkObject);
    });
  });

};

// Required data: id
// Optional data: none
checks.get = function(data, response) {

};

// Required data: id, extend
// Optional data: none
checks.put = function(data, response) {

};

// Required data: id
// Optional data: none
checks.delete = function(data, response) {

};

module.exports = checks;
