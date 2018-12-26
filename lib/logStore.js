const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const logStore = {};

logStore.baseDir = path.join(__dirname, '/../logs/');

logStore.append = function(filename, str) {
  return new Promise(resolve => {
    // Open the file for appending
    fs.open(this.resolveFilePath(filename + '.log'), 'a', (err, fileDescriptor) => {
      if (err || !fileDescriptor) {
        resolve({ ok: false, error: 'Could not open the file for appending' });
        return;
      }
      fs.appendFile(fileDescriptor, str + '\n', (err) => {
        if (err) {
          resolve({ ok: false, error: 'Error appending to file' });
          return;
        }
        fs.close(fileDescriptor, (err) => {
          if (!err) {
            resolve({ ok: true });
          } else {
            resolve({ ok: false, error: 'Error closing the file' });
          }
        });
      });
    });
  });
};


logStore.list = function(includeCompressedLogs) {
  return new Promise(resolve => {
    fs.readdir(this.baseDir, (err, data) => {
      if (err || !data || !data.length) {
        resolve({ ok: false, error: err ? err : 'Could not list directory' });
        return;
      }
      const trimmedFilenames = [];
      data
        .filter(f => f.includes('.log') || (includeCompressedLogs && f.includes('.gz.b64')))
        .forEach((fileName) => {
        trimmedFilenames.push(fileName.replace('.log', '').replace('.gz.b64', ''));
      });
      resolve({ ok: true, data: trimmedFilenames });
    });
  });
};

logStore.compress = function(logId, newFileId) {
  return new Promise(resolve => {
    const sourceFile = logId + '.log';
    const destFile = newFileId + '.gz.b64';

    fs.readFile(this.resolveFilePath(sourceFile), 'utf-8', (err, inputString) => {
      if (err || !inputString) {
        resolve({ ok: false, error: err });
        return;
      }
      zlib.gzip(inputString, (err, buffer) => {
        if (err || !buffer) {
          resolve({ ok: false, error: err });
          return;
        }
        fs.open(this.resolveFilePath(destFile), 'wx', (err, fileDescriptor) => {
          if (err || !fileDescriptor) {
            resolve({ ok: false, error: err });
            return;
          }
          fs.writeFile(fileDescriptor, buffer.toString('base64'), (err) => {
            if (err) {
              resolve({ ok: false, error: err });
              return;
            }
            fs.close(fileDescriptor, (err) => {
              if (err) {
                resolve({ ok: false, error: err });
                return;
              }
              resolve({ ok: true });
            });
          });
        });
      });
    });
  });
};

logStore.decompress = function(fileId) {
  return new Promise(resolve => {
    const filename = fileId + '.gz.b64';
    fs.readFile(this.resolveFilePath(filename), 'utf-8', (err, str) => {
      if (err || !str) {
        resolve({ ok: false, error: err });
      }
      const inputBuffer = Buffer.from(str, 'base64');
      zlib.unzip(inputBuffer, (err, outputBuffer) => {
        if (err || !outputBuffer) {
          resolve({ ok: false, error: err });
          return;
        }
        resolve({ ok: true, data: outputsBuffer.toString() });
      });
    });
  });
};

logStore.truncate = function(fileId, callback) {
  return new Promise(resolve => {
    fs.truncate(this.resolveFilePath(fileId + '.log'), 0, (err) => {
      if (err) {
        resolve({ ok: false, error: err });
        return;
      }
      resolve({ ok: true });
    });
  });
};

logStore.resolveFilePath = function(filename) {
  return `${this.baseDir}/${filename}`;
}

module.exports = logStore;
