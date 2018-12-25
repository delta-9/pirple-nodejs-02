/**
 * Library for storing and editing data
 */
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const fileStore = {};

fileStore.baseDir = path.join(__dirname, '/../data/');

fileStore.create = function(dir, filename, data, callback) {
  fs.open(this.resolveFilePath(dir, filename), 'wx', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.writeFile(fileDescriptor, stringData, function(err) {
        if (!err) {
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              callback(false);
            } else {
              callback('Could not close new file');
            }
          });
        } else {
          callback('Error writing to new file');
        }
      });
    } else {
      callback('Could not open the file, it may already exist');
    }
  });
};

fileStore.read = function(dir, filename, callback) {
  fs.readFile(this.resolveFilePath(dir, filename), 'utf8', function(err, data) {
    if (!err && data) {
      callback(err, helpers.parseJsonToObject(data));
    } else {
      callback(err, data);
    }
  });
};

fileStore.update = function(dir, filename, data, callback) {
  fs.open(this.resolveFilePath(dir, filename), 'r+', function(err, fileDescriptor) {
    if (!err && fileDescriptor) {
      const stringData = JSON.stringify(data);
      fs.truncate(fileDescriptor, function(err) {
        if (!err) {
          fs.writeFile(fileDescriptor, stringData, function(err) {
            if (!err) {
              fs.close(fileDescriptor, function(err) {
                if (!err) {
                  callback(false);
                } else {
                  callback('Could not close existing file');
                }
              });
            } else {
              callback('Error writing to existing file');
            }
          });
        } else {
          callback('Error truncating the file');
        }
      });
    } else {
      callback('Could not open the file for updating, the file may not exist');
    }
  });
};

fileStore.delete = function(dir, filename, callback) {
  fs.unlink(this.resolveFilePath(dir, filename), function(err) {
    if (!err) {
      callback(false);
    } else {
      callback('Error deleting the file');
    }
  });
};

fileStore.list = function(dir, callback) {
  fs.readdir(this.resolveDirPath(dir), function(err, data) {
    if (err || !data || !data.length) {
      return callback(err, data);
    }
    const trimmedFilenames = [];
    data.filter(f => f.includes('.json')).forEach(function(fileName) {
      trimmedFilenames.push(fileName.replace('.json', ''))
    });
    callback(false, trimmedFilenames);
  });
}

fileStore.resolveFilePath = function(dir, filename) {
  return `${this.baseDir}${dir}/${filename}.json`;
}
fileStore.resolveDirPath = function(dir, filename) {
  return `${this.baseDir}${dir}/`;
}

module.exports = fileStore;