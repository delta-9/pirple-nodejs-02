
const helpers = require('./lib/helpers');
const server = require('./lib/server');
const workers = require('./lib/workers');

const app = {};

app.init = function() {
  server.init();
  workers.init();
};


app.init();