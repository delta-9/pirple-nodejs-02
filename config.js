// container for all the environments
var environments = {};

// Staging (default) environment
environments.staging = {
  httpPort: 5555,
  httpsPort: 5556,
  envName: 'staging',
};

// Production environment
environments.production = {
  httpPort: 6666,
  httpsPort: 6667,
  envName: 'production',
};

var currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

var environmentToExport = typeof(environments[currentEnvironment]) !== 'undefined' ? environments[currentEnvironment] : environments.staging;

module.exports = environmentToExport;
