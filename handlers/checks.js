
const config = require('../lib/config');
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const checks = {};

// Required data: protocol, url, method, successCodes, timeoutSeconds
// Optional data: none
checks.post = async function(data, response) {
  const protocol = data.getString('protocol') && ['http', 'https'].includes(data.getString('protocol')) ? data.getString('protocol') : false;
  const url = data.getString('url') && data.getString('url').length > 0 ? data.getString('url') : false;
  const method = data.getString('method') && ['post', 'get', 'put', 'delete'].includes(data.getString('method')) ? data.getString('method') : false;
  const successCodes = data.getArray('successCodes') && data.getArray('successCodes').length > 0 ? data.getArray('successCodes') : false;
  const timeoutSeconds = data.getNumber('timeoutSeconds') && data.getNumber('timeoutSeconds') % 1 === 0 && data.getNumber('timeoutSeconds') > 0 && data.getNumber('timeoutSeconds') <= 5 ? data.getNumber('timeoutSeconds') : false;

  if (!protocol || !url || !method || !successCodes || !timeoutSeconds) {
    response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
    return;
  }

  if (!data.authenticated) {
    response(403, {error: 'Access denied'});
    return;
  }

  const userChecks = typeof(data.authenticatedUser.checks) === 'object' && data.authenticatedUser.checks instanceof Array ? data.authenticatedUser.checks : [];
  if (userChecks.length >= config.maxChecks) {
    response(400, {error: `The user has the maximum number of checks (${config.maxChecks})`});
    return;
  }

  const checkId = helpers.generateUUID();

  var checkObject = {
    id: checkId,
    userPhone: data.authenticatedUser.phone,
    protocol,
    url,
    method,
    successCodes,
    timeoutSeconds
  };

  const createCheckResponse = await fileStore.create('checks', checkId, checkObject);
  if (!createCheckResponse.ok) {
    response(500, {error: 'Could not create the new check'});
    return;
  }

  data.authenticatedUser.checks = userChecks;
  data.authenticatedUser.checks.push(checkId);
  const updateUserChecksResponse = await fileStore.update('users', data.authenticatedUser.phone, data.authenticatedUser);
  if (!updateUserChecksResponse.ok) {
    response(500, {error: 'Could not update the user with the new check'});
    return;
  }

  response(200, checkObject);
};

// Required data: id
// Optional data: none
checks.get = async function(data, response) {
  // Check the phone number is valid
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 36 ? data.queryStringObject.id.trim() : false;
  if (!id) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  const retrieveCheckDataResponse = await fileStore.read('checks', id);
  if (!retrieveCheckDataResponse.ok) {
    response(404);
    return;
  }

  const checkData = retrieveCheckDataResponse.data;
  if (!data.authenticated || data.authenticatedUser.phone !== checkData.userPhone) {
    response(403, {error: 'Access denied'});
    return;
  }

  response(200, checkData);
};

// Required data: id
// Optional data: protocol, url, method, successCodes, timeoutSeconds (one must be set)
checks.put = async function(data, response) {
  const id = data.getString('id') && data.getString('id').length === 36 ? data.getString('id') : false;
  // Optional data
  const protocol = data.getString('protocol') && ['http', 'https'].includes(data.getString('protocol')) ? data.getString('protocol') : false;
  const url = data.getString('url') && data.getString('url').length > 0 ? data.getString('url') : false;
  const method = data.getString('method') && ['post', 'get', 'put', 'delete'].includes(data.getString('method')) ? data.getString('method') : false;
  const successCodes = data.getArray('successCodes') && data.getArray('successCodes').length > 0 ? data.getArray('successCodes') : false;
  const timeoutSeconds = data.getNumber('timeoutSeconds') && data.getNumber('timeoutSeconds') % 1 === 0 && data.getNumber('timeoutSeconds') > 0 && data.getNumber('timeoutSeconds') <= 5 ? data.getNumber('timeoutSeconds') : false;

  if (!id) {
    response(400, {error: 'Missing required field'});
    return;
  }
  if (!protocol && !url && !method && !successCodes && !timeoutSeconds) {
    response(400, {error: 'Missing field(s) to update'});
    return;
  }

  const retrieveCheckDataResponse = await fileStore.read('checks', id);
  if (!retrieveCheckDataResponse.ok) {
    response(400, {error: 'Check ID did not exists'});
    return;
  }

  const checkData = retrieveCheckDataResponse.data;
  if (!data.authenticated || data.authenticatedUser.phone !== checkData.userPhone) {
    response(403, {error: 'Access denied'});
    return;
  }

  checkData.protocol = protocol ? protocol : checkData.protocol;
  checkData.url = url ? url : checkData.url;
  checkData.method = method ? method : checkData.method;
  checkData.successCodes = successCodes ? successCodes : checkData.successCodes;
  checkData.timeoutSeconds = timeoutSeconds ? timeoutSeconds : checkData.timeoutSeconds;

  const updateCheckDataResponse = await fileStore.update('checks', id, checkData);
  if (!updateCheckDataResponse.ok) {
    response(500, {error: 'Could not update the check'});
    return;
  }

  response(200);
};

// Required data: id
// Optional data: none
checks.delete = async function(data, response) {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 36 ? data.queryStringObject.id.trim() : false;
  if (!id) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  const retrieveCheckDataResponse = await fileStore.read('checks', id);
  if (!retrieveCheckDataResponse.ok) {
    response(400, {error: 'Check ID did not exists'});
    return;
  }

  const checkData = retrieveCheckDataResponse.data;
  if (!data.authenticated || data.authenticatedUser.phone !== checkData.userPhone) {
    response(403, {error: 'Access denied'});
    return;
  }

  const deleteCheckResponse = await fileStore.delete('checks', id);
  if (!deleteCheckResponse.ok) {
    response(500, {error: 'Could not delete the check'});
    return;
  }

  const userChecks = typeof(data.authenticatedUser.checks) === 'object' && data.authenticatedUser.checks instanceof Array ? data.authenticatedUser.checks : [];
  const checkPosition = userChecks.indexOf(id);
  if (checkPosition === -1) {
    response(500, {error: 'Could not find the check on the user checks, so could not delete it.'});
    return;
  }

  userChecks.splice(checkPosition, 1);
  const updateUserChecksResponse = await fileStore.update('users', data.authenticatedUser.phone, data.authenticatedUser);
  if (!updateUserChecksResponse.ok) {
    response(500, {error: 'Could not update the user'});
    return;
  }

  response(200);
};

module.exports = checks;
