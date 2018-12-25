const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');
const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');

const workers = {};

// Timer to execute the worker process once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.gatherAllChecks = function() {
  fileStore.list('checks', function(err, checkIds) {
    if (err || !checkIds || !checkIds.length) {
      return console.log('Error: no checks to process');
    }
    checkIds.forEach(checkId => {
      fileStore.read('checks', checkId, function(err, checkData) {
        if (err || !checkData) {
          return console.log('Error when retrieving a check');
        }
        if (workers.validateCheckData(checkData)) {
          workers.performCheck(checkData);
        } else {
          return console.log('Error a check failed data validation');
        }
      });
    });
  });
};

workers.validateCheckData = function(originalCheckData) {
  if (typeof(originalCheckData) !== 'object' || originalCheckData === null) {
    return;
  }
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.length === 20 ? originalCheckData.id : false;
  originalCheckData.userPhone = typeof(originalCheckData.userPhone) === 'string' && originalCheckData.userPhone.length === 10 ? originalCheckData.userPhone : false;
  originalCheckData.protocol = typeof(originalCheckData.protocol) === 'string' && ['http', 'https'].includes(originalCheckData.protocol) ? originalCheckData.protocol : false;
  originalCheckData.url = typeof(originalCheckData.url) === 'string' && originalCheckData.url.length > 0 ? originalCheckData.url : false;
  originalCheckData.method = typeof(originalCheckData.method) === 'string' && ['post', 'get', 'put', 'delete'].includes(originalCheckData.method) ? originalCheckData.method : false;
  originalCheckData.successCodes = typeof(originalCheckData.successCodes) === 'object' && originalCheckData.successCodes instanceof Array && originalCheckData.successCodes.length > 0 ? originalCheckData.successCodes : false;
  originalCheckData.timeoutSeconds = typeof(originalCheckData.timeoutSeconds) === 'number' && originalCheckData.timeoutSeconds % 1 === 0 && originalCheckData.timeoutSeconds > 0 && originalCheckData.timeoutSeconds <= 5 ? originalCheckData.timeoutSeconds : false;

  // set the validation keys if they not exists
  originalCheckData.state = typeof(originalCheckData.state) === 'string' && ['up', 'down'].includes(originalCheckData.state) ? originalCheckData.state : 'down';
  originalCheckData.lastChecked = typeof(originalCheckData.lastChecked) === 'number' && originalCheckData.lastChecked > 0 ? originalCheckData.lastChecked : false;

  if (originalCheckData.id && originalCheckData.userPhone && originalCheckData.protocol && originalCheckData.url && originalCheckData.method && originalCheckData.successCodes && originalCheckData.timeoutSeconds) {
    return true;
  }
  return false;
};

workers.performCheck = function(originalCheckData) {
  const checkOutcome = {
    error: false,
    responseCode: false,
  };

  let outcomeSent = false;

  const parsedUrl = url.parse(originalCheckData.protocol + '://' + originalCheckData.url, true);
  const hostname = parsedUrl.hostname;
  const path = parsedUrl.path;

  var requestDetails = {
    protocol: originalCheckData.protocol + ":",
    hostname,
    method: originalCheckData.method,
    path,
    timeout: originalCheckData.timeoutSeconds * 1000,
  };

  // Instantiate the request object.
  const httpModule = originalCheckData.protocol === 'http' ? http : https;
  const req = httpModule.request(requestDetails, function(res) {
    checkOutcome.responseCode = res.statusCode;
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('error', function(e) {
    checkOutcome.error = {
      error: true,
      value: e,
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.on('timeout', function(e) {
    checkOutcome.error = {
      error: true,
      value: 'timeout',
    };
    if (!outcomeSent) {
      workers.processCheckOutcome(originalCheckData, checkOutcome);
      outcomeSent = true;
    }
  });

  req.end();
};

workers.processCheckOutcome = function(originalCheckData, checkOutcome) {
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();

  fileStore.update('checks', newCheckData.id, newCheckData, function(err) {
    if (err) {
      return console.log('Error when updating a check status');
    }
    if (alertWarranted) {
      return workers.alertUserToStatusChange(newCheckData);
    } else {
      return console.log('Check outcome has not changed');
    }
  });
};

workers.alertUserToStatusChange = function(newCheckData) {
  const msg = 'Alert: your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
  helpers.sendTwilioSms(newCheckData.userPhone, msg, function(err) {
    if (!err) {
      console.log('success: user was alerted by sms');
    } else {
      console.log('error: could not send sms alert to user');
    }
  });
};

workers.init = function() {
  // Execute all the checks
  workers.gatherAllChecks();
  // loop
  workers.loop();
};

module.exports = workers;