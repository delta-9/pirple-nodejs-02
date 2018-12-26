const path = require('path');
const fs = require('fs');
const http = require('http');
const https = require('https');
const url = require('url');

const util = require('util');
const debug = util.debuglog('workers');

const fileStore = require('../lib/fileStore');
const helpers = require('../lib/helpers');
const logStore = require('./logStore');

const workers = {};

workers.gatherAllChecks = async function() {
  const checksListResponse = await fileStore.list('checks');
  if (!checksListResponse.ok || !checksListResponse.data || !checksListResponse.data.length) {
    debug('Error: no checks to process');
    return;
  }

  for (const checkId of checksListResponse.data) {
    const checkReadResponse = await fileStore.read('checks', checkId);
    if (!checkReadResponse.ok) {
      debug('Error when retrieving a check');
      return;
    }
    if (workers.validateCheckData(checkReadResponse.data)) {
      workers.performCheck(checkReadResponse.data);
    } else {
      debug('Error a check failed data validation');
    }
  }
};

workers.validateCheckData = function(originalCheckData) {
  if (typeof(originalCheckData) !== 'object' || originalCheckData === null) {
    return;
  }
  originalCheckData.id = typeof(originalCheckData.id) === 'string' && originalCheckData.id.length === 36 ? originalCheckData.id : false;
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

workers.processCheckOutcome = async function(originalCheckData, checkOutcome) {
  const state = !checkOutcome.error && checkOutcome.responseCode && originalCheckData.successCodes.includes(checkOutcome.responseCode) ? 'up' : 'down';

  const alertWarranted = originalCheckData.lastChecked && originalCheckData.state !== state ? true : false;

  const timeOfCheck = Date.now();
  workers.log(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck);


  const newCheckData = originalCheckData;
  newCheckData.state = state;
  newCheckData.lastChecked = Date.now();


  const checkUpdateResponse = await fileStore.update('checks', newCheckData.id, newCheckData);
  if (!checkUpdateResponse.ok) {
    debug('Error when updating a check status');
    return;
  }
  if (alertWarranted) {
    workers.alertUserToStatusChange(newCheckData);
  } else {
    debug('Check outcome has not changed');
  }
};

workers.alertUserToStatusChange = async function(newCheckData) {
  const msg = 'Alert: your check for ' + newCheckData.method.toUpperCase() + ' ' + newCheckData.protocol + '://' + newCheckData.url + ' is currently ' + newCheckData.state;
  const smsResponse = await helpers.sendTwilioSms(newCheckData.userPhone, msg);
  if (!smsResponse.ok) {
    debug('success: user was alerted by sms');
  } else {
    debug('error: could not send sms alert to user');
  }
};

workers.log = async function(originalCheckData, checkOutcome, state, alertWarranted, timeOfCheck) {
  const logData = {
    check: originalCheckData,
    outcome: checkOutcome,
    state,
    alert: alertWarranted,
    time: timeOfCheck,
  };
  const logString = JSON.stringify(logData);
  const logFilename = originalCheckData.id;
  // Append the log string to the file.
  const logAppendResponse = await logStore.append(logFilename, logString);
  if (logAppendResponse.ok) {
    debug('Logging to file succeeded.');
  } else {
    debug('Logging to file failed.');
  }
};

workers.rotateLogs = async function() {
  const logListResponse = await logStore.list(false);
  if (!logListResponse.ok) {
    debug('Could not find any logs to rotate');
    return;
  }
  for (const logName of logListResponse.data) {
    const newFileId = logName+'-'+Date.now();
    const compressLogResponse = await logStore.compress(logName, newFileId);
    if (!compressLogResponse.ok) {
      debug('Error could not compress the log file: ' + err);
      return;
    }
    const truncateLogResponse = await logStore.truncate(logName);
    if (!truncateLogResponse.ok) {
      debug('Error could not truncate the log file');
      return;
    }
    debug('Success rotating log file');
  }
};

// Timer to execute the worker process once per minute
workers.loop = function() {
  setInterval(function() {
    workers.gatherAllChecks();
  }, 1000 * 60);
};

workers.logRotationLoop = function() {
  setInterval(function() {
    workers.rotateLogs();
  }, 1000 * 60 * 60 * 24);
};

workers.init = function() {

  // Send to console in yellow
  console.log('\x1b[33m%s\x1b[0m', 'Background workers are running');

  // Execute all the checks
  workers.gatherAllChecks();
  // loop
  workers.loop();

  // Compress all the logs immediately
  workers.rotateLogs();

  // Call the compression loop so logs will be compressed later on
  workers.logRotationLoop();
};

module.exports = workers;
