
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const tokens = {};

// Required data: phone, password
// Optional data: none
tokens.post = function(data, response) {
  const password = data.getString('password');
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  if (!phone || !password) {
    return response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
  }
  fileStore.read('users', phone, function(err, userData) {
    if (err || !userData) {
      return response(400, {
        error: 'Could not find the specified user',
      });
    }
    // Hash the send password and compare it with the password saved in the user object.
    const hashedPassword = helpers.hash(password);
    if (hashedPassword !== userData.hashedPassword) {
      return response(400, {
        error: 'Password did not match',
      });
    }

    // Create a new token with a random name and set expiration date.
    const tokenId = helpers.createRandomString(20);
    const expires = Date.now() + 1000 * 60 * 60;
    var tokenObject = {
      phone,
      id: tokenId,
      expires,
    };
    fileStore.create('tokens', tokenId, tokenObject, function(err) {
      if (err) {
        return response(500, {
          error: 'Could not create the new token',
        });
      }
      return response(200, tokenObject);
    });
  });
};

// Required data: id
// Optional data: none
tokens.get = function(data, response) {
  const id = typeof(data.queryStringObject.id) === 'string' && data.queryStringObject.id.trim().length === 20 ? data.queryStringObject.id.trim() : false;
  if (!id) {
    return response(400, {error: 'Missing required field or field are invalid.'});
  }

  fileStore.read('tokens', id, function(err, tokenData) {
    if (err || !tokenData) {
      return response(400, {error: 'Specified token does not exist'});
    }
    return response(200, tokenData);
  });
};

// Required data: id, extend
// Optional data: none
tokens.put = function(data, response) {
  const id = data.getString('id') && data.getString('id').length === 20 ? data.getString('id') : false;
  const extend = data.getBoolean('extend');
  if (!id || !extend) {
    return response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
  }

  fileStore.read('tokens', id, function(err, tokenData) {
    if (err || !tokenData) {
      return response(400, {error: 'Specified token does not exist'});
    }
    if (tokenData.expires <= Date.now()) {
      return response(500, {error: 'The token already expired, and cannot be extended'});
    }
    const updatedTokenData = Object.assign({}, tokenData, {expires: Date.now() + 1000 * 60 * 60});
    fileStore.update('tokens', id, updatedTokenData, function(err) {
      if (err) {
        return response(500, {error: 'Could not update the token expiration'});
      }
      return response(200);
    });
  });
};

// Required data: id
// Optional data: none
tokens.delete = function(data, response) {
  const id = data.getString('id') && data.getString('id').length === 20 ? data.getString('id') : false;
  if (!id) {
    return response(400, {error: 'Missing required field or field are invalid.'});
  }
  fileStore.read('tokens', id, function (err, tokenData) {
    if (err || !tokenData) {
      return response(404);
    }

    fileStore.delete('tokens', id, function(err) {
      if (err) {
        return response(500, {error: 'Could not delete the specified token'});
      }

      return response(200);
    });
  });
};

tokens.verify = function(id, phone, callback) {
}

module.exports = tokens;
