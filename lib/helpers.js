const crypto = require('crypto');
const config = require('../config');
const helpers = {};

helpers.hash = function(value) {
  if (typeof(value) !== 'string' || !value.length) {
    return false;
  }
  return crypto.createHmac('sha256', config.hashSalt).update(value).digest('hex');
}

helpers.parseJsonToObject = function(value) {
  try {
    const json = JSON.parse(value);
    return json
  } catch (error) {
    return {};
  };
}


module.exports = helpers;

