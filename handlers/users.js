
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const users = {};

users.post = function(data, response) {
  const firstName = data.getString('firstName');
  const lastName = data.getString('lastName');
  const password = data.getString('password');
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  const tosAgreement = data.getBoolean('tosAgreement');

  if (firstName && lastName && phone && password && tosAgreement) {
    fileStore.read('users', phone, function(err, data) {
      if (err) {
        const hashedPassword = helpers.hash(password);
        if (!hashedPassword) {
          return response(500, {
            error: 'Could not create the hashed password',
          });
        }
        const userObject = {
          firstName,
          lastName,
          phone,
          hashedPassword,
          tosAgreement,
        };
        fileStore.create('users', phone, userObject, function(err) {
          if (!err) {
            response(201);
          } else {
            response(500, {
              error: 'Could not create the new user',
            });
          }
        });
      } else {
        response(400, {
          error: 'A user with the same phone number already exist',
        });
      }
    });
  } else {
    response(400, {
      error: 'Missing required fields',
    });
  }
};

users.get = function(data, response) {
  // Check the phone number is valid
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (!phone) {
    return response(400, {error: 'Missing required fields'});
  }
  fileStore.read('users', phone, function (err, userData) {
    if (!err && userData) {
      delete userData.hashedPassword;
      response(200, userData);
    } else {
      response(404);
    }
  });
};

users.put = function(data, response) {
  const phone = data.getString('phone') && data.getString('phone').length === 10 ? data.getString('phone') : false;
  if (!phone) {
    return response(400, {error: 'Missing required fields'});
  }
  const firstName = data.getString('firstName');
  const lastName = data.getString('lastName');
  const password = data.getString('password');
  if (!firstName && !lastName && !password) {
    return response(400, {error: 'Missing required fields'});
  }
  fileStore.read('users', phone, function (err, userData) {
    if (!err && userData) {
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
      fileStore.update('users', phone, userData, function(err) {
        if (!err) {
          response(200);
        } else {
          response(500, {error: 'Could not update the user'});
        }
      });
    } else {
      response(404);
    }
  });
};

users.delete = function(data, response) {
  const phone = typeof(data.queryStringObject.phone) === 'string' && data.queryStringObject.phone.trim().length === 10 ? data.queryStringObject.phone.trim() : false;
  if (!phone) {
    return response(400, {error: 'Missing required fields'});
  }
  fileStore.read('users', phone, function (err, userData) {
    if (!err && userData) {
      fileStore.delete('users', phone, function(err) {
        if (!err) {
          response(200);
        } else {
          response(500, {error: 'Could not delete the specified user'});
        }
      });
    } else {
      response(404);
    }
  });
};

module.exports = users;
