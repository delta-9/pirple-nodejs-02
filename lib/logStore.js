const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const logStore = {};

logStore.baseDir = path.join(__dirname, '/../logs/');

logStore.append = function(filename, str, callback) {
  // Open the file for appending
  fs.open(this.resolveFilePath(filename + '.log'), 'a', (err, fileDescriptor) => {
    if (err || !fileDescriptor) {
      return callback('Could not open the file for appending');
    }
    fs.appendFile(fileDescriptor, str + '\n', (err) => {
      if (err) {
        return callback('Error appending to file');
      }
      fs.close(fileDescriptor, (err) => {
        if (!err) {
          callback(false);
        } else {
          callback('Error closing the file');
        }
      });
    });
  });
};


logStore.list = function(includeCompressedLogs, callback) {
  fs.readdir(this.baseDir, (err, data) => {
    if (err || !data || !data.length) {
      return callback(err, data);
    }
    const trimmedFilenames = [];
    data
      .filter(f => f.includes('.log') || (includeCompressedLogs && f.includes('.gz.b64')))
      .forEach((fileName) => {
      trimmedFilenames.push(fileName.replace('.log', '').replace('.gz.b64', ''));
    });
    callback(false, trimmedFilenames);
  });
};

logStore.compress = function(logId, newFileId, callback) {
  const sourceFile = logId + '.log';
  const destFile = newFileId + '.gz.b64';

  fs.readFile(this.resolveFilePath(sourceFile), 'utf-8', (err, inputString) => {
    if (err || !inputString) {
      return callback(err);
    }
    zlib.gzip(inputString, (err, buffer) => {
      if (err || !buffer) {
        return callback(err);
      }
      fs.open(this.resolveFilePath(destFile), 'wx', (err, fileDescriptor) => {
        if (err || !fileDescriptor) {
          return callback(err);
        }
        fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
          if (err) {
            return callback(err);
          }
          fs.close(fileDescriptor, (err) => {
            if (err) {
              return callback(err);
            }
            callback(false);
          });
        });
      });
    });
  });
};

logStore.decompress = function(fileId, callback) {
  const filename = fileId + '.gz.b64';
  fs.readFile(this.resolveFilePath(filename), 'utf-8', (err, str) => {
    if (err || !str) {
      return callback(err);
    }
    const inputBuffer = Buffer.from(str, 'base64');
    zlib.unzip(inputBuffer, (err, outputBuffer) => {
      if (err || !outputBuffer) {
        return callback(err);
      }
      callback(false, outputsBuffer.toString())
    });
  });
};

logStore.truncate = function(fileId, callback) {
  fs.truncate(this.resolveFilePath(fileId + '.log'), 0, (err) => {
    if (err) {
      return callback(err);
    }
    callback(false);
  });
};

logStore.resolveFilePath = function(filename) {
  return `${this.baseDir}/${filename}`;
}

module.exports = logStore;
