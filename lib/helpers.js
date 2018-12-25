const crypto = require('crypto');
const queryString = require('querystring');
const https = require('https');
const config = require('./config');
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

helpers.sendTwilioSms = function(phone, msg, callback) {
  if (typeof(phone) !== 'string' || phone.trim().length !== 10) {
    return callback('phone parameter is invalid or missing');
  }
  if (typeof(msg) !== 'string' || !(msg.trim().length && msg.trim().length <= 1600)) {
    return callback('msg parameter is invalid or missing');
  }

  const payload = {
    From: config.twilio.fromPhone,
    To: '+66' + phone,
    Body: msg,
  };

  const stringPayload = queryString.stringify(payload);

  const requestDetails = {
    protocol: 'https:',
    hostname: 'api.twilio.com',
    method: 'POST',
    path: '/2010-04-01/Accounts/' + config.twilio.accountSid + '/Messages.json',
    auth: config.twilio.accountSid + ':' + config.twilio.authToken,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-length': Buffer.byteLength(stringPayload),
    },
  };

  const req = https.request(requestDetails, function(res) {
    if (res.statusCode === 200 || res.statusCode === 201) {
      return callback(false);
    }
    return callback("Status code returned was " + res.statusCode);
  });

  // Bind to the error event so it doesn't get thrown
  req.on('error', function(err) {
    callback(err);
  });

  req.write(stringPayload);

  req.end();
}


module.exports = helpers;

