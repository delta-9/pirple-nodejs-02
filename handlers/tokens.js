
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const tokens = {};

// Required data: phone, password
// Optional data: none
tokens.post = async function(data, response) {
  const password = data.getString('password');
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  if (!phone || !password) {
    response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
    return;
  }
  const userReadResponse = await fileStore.read('users', phone);
  if (!userReadResponse.ok) {
    response(400, { error: 'Could not find the specified user' });
    return;
  }

  const userData = userReadResponse.data;

  // Hash the send password and compare it with the password saved in the user object.
  const hashedPassword = helpers.hash(password);
  if (hashedPassword !== userData.hashedPassword) {
    response(400, { error: 'Password did not match' });
    return;
  }

  // Create a new token with a random name and set expiration date.
  const tokenId = helpers.generateUUID();
  const expires = Date.now() + 1000 * 60 * 60;
  var tokenObject = {
    phone,
    id: tokenId,
    expires,
  };
  const createTokenResponse = await fileStore.create('tokens', tokenId, tokenObject);
  if (!createTokenResponse.ok) {
    response(500, { error: 'Could not create the new token' });
    return;
  }
  response(200, tokenObject);
};

// Required data: id
// Optional data: none
tokens.get = async function(data, response) {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 36 ? data.queryStringObject.id.trim() : false;
  if (!id) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  const readTokenResponse = await fileStore.read('tokens', id);
  if (!readTokenResponse.ok) {
    response(400, {error: 'Specified token does not exist'});
    return;
  }
  response(200, readTokenResponse.data);
};

// Required data: id, extend
// Optional data: none
tokens.put = async function(data, response) {
  const id = data.getString('id') && data.getString('id').length === 36 ? data.getString('id') : false;
  const extend = data.getBoolean('extend');
  if (!id || !extend) {
    response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
    return;
  }

  const readTokenResponse = await fileStore.read('tokens', id);
  if (!readTokenResponse.ok) {
    response(400, {error: 'Specified token does not exist'});
    return;
  }

  const tokenData = readTokenResponse.data;
  if (tokenData.expires <= Date.now()) {
    response(500, {error: 'The token already expired, and cannot be extended'});
    return;
  }
  const updatedTokenData = Object.assign({}, tokenData, {expires: Date.now() + 1000 * 60 * 60});
  const updateTokenResponse = await fileStore.update('tokens', id, updatedTokenData);
  if (!updateTokenResponse.ok) {
    response(500, {error: 'Could not update the token expiration'});
    return;
  }

  response(200);
};

// Required data: id
// Optional data: none
tokens.delete = async function(data, response) {
  const id = data.getString('id') && data.getString('id').length === 36 ? data.getString('id') : false;
  if (!id) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }
  const readTokenResponse = await fileStore.read('tokens', id);
  if (!readTokenResponse.ok) {
    response(404);
    return;
  }

  const deleteTokenResponse = await fileStore.delete('tokens', id);
  if (!deleteTokenResponse.ok) {
    response(500, {error: 'Could not delete the specified token'});
    return;
  }

  response(200);
};

module.exports = tokens;
