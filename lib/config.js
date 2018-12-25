// container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
  httpPort: 5555,
  httpsPort: 5556,
  envName: 'staging',
  hashSalt: 'aslhrjug94tgh34o0234jr[of3inu4g343dw902pur',
  maxChecks: 5,
  twilio: {
    accoundSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006',
  }
};

// Production environment
environments.production = {
  httpPort: 6666,
  httpsPort: 6667,
  envName: 'production',
  hashSalt: 'niuw4cp73fpbiubpiu34gph4[g[g43boiiubasdwqr',
  maxChecks: 5,
  twilio: {
    accoundSid: 'ACb32d411ad7fe886aac54c665d25e5c5d',
    authToken: '9455e3eb3109edc12e3d8c92768f7a67',
    fromPhone: '+15005550006',
  }
};

const currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

const environmentToExport = typeof(environments[currentEnvironment]) !== 'undefined' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;
