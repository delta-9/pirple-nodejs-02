/**
 * Library for storing and editing data
 */
const fs = require('fs');
const path = require('path');
const helpers = require('./helpers');

const fileStore = {};

fileStore.baseDir = path.join(__dirname, '/../data/');

fileStore.create = function(dir, filename, data) {
  return new Promise(resolve => {
    fs.open(fileStore.resolveFilePath(dir, filename), 'wx', function(err, fileDescriptor) {
      if (err || !fileDescriptor) {
        resolve({ ok: false, error: 'Could not open the file, it may already exist' });
        return;
      }
      const stringData = JSON.stringify(data);
      fs.writeFile(fileDescriptor, stringData, function(err) {
        if (err) {
          resolve({ ok: false, error: 'Error writing to new file' });
          return;
        }
        fs.close(fileDescriptor, function(err) {
          if (!err) {
            resolve({ ok: true });
          } else {
            resolve({ ok: false, error: 'Could not close new file' });
          }
        });
      });

    });
  });
};

fileStore.read = function(dir, filename) {
  return new Promise(resolve => {
    fs.readFile(fileStore.resolveFilePath(dir, filename), 'utf8', function(err, data) {
      if (!err && data) {
        resolve({ ok: true, data: helpers.parseJsonToObject(data) });
      } else {
        resolve({ ok: false, error: err ? err : 'Could not read file' });
      }
    });
  });
};

fileStore.update = function(dir, filename, data) {
  return new Promise(resolve => {
    fs.open(fileStore.resolveFilePath(dir, filename), 'r+', function(err, fileDescriptor) {
      if (err || !fileDescriptor) {
        resolve({ ok: false, error: 'Could not open the file for updating, the file may not exist' });
        return;
      }
      const stringData = JSON.stringify(data);
      fs.truncate(fileDescriptor, function(err) {
        if (err) {
          resolve({ ok: false, error: 'Error truncating the file' });
          return;
        }
        fs.writeFile(fileDescriptor, stringData, function(err) {
          if (err) {
            resolve({ ok: false, error: 'Error writing to existing file' });
            return;
          }
          fs.close(fileDescriptor, function(err) {
            if (!err) {
              resolve({ ok: true });
            } else {
              resolve({ ok: false, error: 'Could not close existing file' });
            }
          });
        });
      });
    });
  });
};

fileStore.delete = function(dir, filename) {
  return new Promise(function(resolve, reject) {
    fs.unlink(fileStore.resolveFilePath(dir, filename), function(err) {
      if (!err) {
        resolve({ ok: true });
      } else {
        resolve({ ok: false, error: 'Error deleting the file' });
      }
    });
  });
};

fileStore.list = function(dir) {
  return new Promise(function(resolve, reject) {
    fs.readdir(fileStore.resolveDirPath(dir), function(err, data) {
      if (err || !data || !data.length) {
        resolve({ ok: false, error: err ? err : 'Could not list the directory' });
        return;
      }
      const trimmedFilenames = [];
      data.filter(f => f.includes('.json')).forEach(function(fileName) {
        trimmedFilenames.push(fileName.replace('.json', ''))
      });
      resolve({ ok: true, data: trimmedFilenames });
    });
  });
};

fileStore.resolveFilePath = function(dir, filename) {
  return `${this.baseDir}${dir}/${filename}.json`;
};
fileStore.resolveDirPath = function(dir, filename) {
  return `${this.baseDir}${dir}/`;
};

module.exports = fileStore;