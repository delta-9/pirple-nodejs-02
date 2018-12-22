const crypto = require('crypto');
const config = require('../config');
const helpers = {};

/**
 * Hash a value using sha256 cryptographic method.
 *
 * @param {String} value
 *  Value to hash.
 */
helpers.hash = function(value) {
  if (typeof(value) !== 'string' || !value.length) {
    return false;
  }
  return crypto.createHmac('sha256', config.hashSalt).update(value).digest('hex');
}

/**
 * Parse a JSON string to Object.
 *
 * @param {String} value
 *  Json string.
 */
helpers.parseJsonToObject = function(value) {
  try {
    const json = JSON.parse(value);
    return json;
  } catch (error) {
    return {};
  };
}

/**
 * Create a random string of a given length
 *
 * @param {Number} strLength
 *   Required string length.
 */
helpers.createRandomString = function(strLength) {
  if (typeof(strLength) !== 'number' || strLength < 1) {
    return false;
  }

  const possibleCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let str = '';
  while (str.length < strLength) {
    str = str.concat(possibleCharacters.charAt(Math.floor(Math.random() * possibleCharacters.length)));
  }
  return str;
}

module.exports = helpers;

