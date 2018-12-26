
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const users = {};

users.post = async function(data, response) {
  const firstName = data.getString('firstName');
  const lastName = data.getString('lastName');
  const password = data.getString('password');
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  const tosAgreement = data.getBoolean('tosAgreement');

  if (!firstName || !lastName | !phone || !password || !tosAgreement) {
    response(400, {error: 'Missing required field(s) or field(s) are invalid.'});
    return;
  }

  const checkPhoneExistResponse = await fileStore.read('users', phone);
  if (checkPhoneExistResponse.ok && checkPhoneExistResponse.data) {
    response(400, {
      error: 'A user with the same phone number already exist',
    });
    return;
  }

  const hashedPassword = helpers.hash(password);
  if (!hashedPassword) {
    response(500, {
      error: 'Could not create the hashed password',
    });
    return;
  }

  const userObject = {
    firstName,
    lastName,
    phone,
    hashedPassword,
    tosAgreement,
  };
  const createUserResponse = await fileStore.create('users', phone, userObject);
  if (!createUserResponse.ok && createUserResponse.err) {
    response(500, {
      error: 'Could not create the new user',
    });
    return;
  }

  response(201);
};

users.get = function(data, response) {
  // Check the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (!phone) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  if (!data.authenticated || data.authenticatedUser.phone !== phone) {
    response(403, {error: 'Access denied'});
    return;
  }

  const userData = Object.assign({}, data.authenticatedUser);
  delete userData.hashedPassword;
  response(200, userData);
};

users.put = async function(data, response) {
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  if (!phone) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  if (!data.authenticated || data.authenticatedUser.phone !== phone) {
    response(403, {error: 'Access denied'});
    return;
  }

  const firstName = data.getString('firstName');
  const lastName = data.getString('lastName');
  const password = data.getString('password');
  if (!firstName && !lastName && !password) {
    response(400, {error: 'Missing required fields'});
    return;
  }

  // Can only update own user.
  const userData = Object.assign({}, data.authenticatedUser);

  // Update the user object
  if (firstName) {
    userData.firstName = firstName;
  }
  if (lastName) {
    userData.lastName = lastName;
  }
  if (password) {
    userData.hashedPassword = helpers.hash(password);
  }
  const updateUserDataResponse = await fileStore.update('users', phone, userData);
  if (!updateUserDataResponse.ok) {
    response(500, {error: 'Could not update the user.'});
    return;
  }
  response(200);
};

users.delete = async function(data, response) {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (!phone) {
    response(400, {error: 'Missing required field or field are invalid.'});
    return;
  }

  // If not authenticated or user do not exists for some reason.
  if (!data.authenticated || data.authenticatedUser.phone !== phone) {
    response(403, {error: 'Access denied'});
    return;
  }

  const deleteUserResponse = await fileStore.delete('users', phone);
  if (!deleteUserResponse.ok) {
    response(500, {error: 'Could not delete the specified user'});
    return;
  }

  // Delete the checks associated with the deleted user.
  const userData = data.authenticatedUser;
  const userChecks = typeof(userData.checks) === 'object' && userData.checks instanceof Array ? userData.checks : [];
  if (!userChecks.length) {
    response(200);
    return;
  }

  let deletionErrors = false;
  const checkDeleteResponses = await Promise.all(userChecks.map(checkId => fileStore.delete('checks', checkId)));
  checkDeleteResponses.forEach(r => {
    if (!r.ok) {
      deletionErrors = true;
    }
  });
  if (deletionErrors) {
    response(500, {error: 'Error encountered when attempting to delete the user checks, all user checks might not be deleted'});
    return;
  }

  response(200);
};

module.exports = users;
