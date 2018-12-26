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

/**
 * Generate a unique ID
 *
 * source https://stackoverflow.com/a/8809472/4392849
 */
helpers.generateUUID = function() {
  var d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function'){
      d += performance.now(); //use high-precision timer if available
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}


helpers.sendTwilioSms = function(phone, msg) {
  return new Promise(resolve => {
    if (typeof(phone) !== 'string' || phone.trim().length !== 10) {
      resolve({ ok: false, error: 'phone parameter is invalid or missing' });
      return;
    }
    if (typeof(msg) !== 'string' || !(msg.trim().length && msg.trim().length <= 1600)) {
      resolve({ ok: false, error: 'msg parameter is invalid or missing' });
      return;
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
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: "Status code returned was " + res.statusCode });
      }
    });

    // Bind to the error event so it doesn't get thrown
    req.on('error', function(err) {
      resolve({ ok: false, error: err });
    });

    req.write(stringPayload);

    req.end();
  });
}


module.exports = helpers;

