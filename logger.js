var winston = require('winston');


var dataPath = process.env.DATA_PATH || ".";
var logsFolder = dataPath + '/logs/'

console.log("Save log on: ", logsFolder)

//configuro log
var transportAllLog = new (winston.transports.File)({
  filename: logsFolder + 'mygarden.log',
  zippedArchive: false,
  maxSize: 1048576,
  maxFiles: 5
});
transportAllLog.on('rotate', function (oldFilename, newFilename) { });

var transportErrorLog = new (winston.transports.File)({
  filename: logsFolder + 'mygarden_error.log',
  zippedArchive: false,
  maxSize: 1048576,
  maxFiles: 5,
  level: 'error'
});
transportErrorLog.on('rotate', function (oldFilename, newFilename) { });


const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    transportAllLog,
    transportErrorLog
  ]
});




function info(...args) {
  console.info(...args);
  logger.info(arguments);
}

function error(...args) {
  console.error(...args);
  logger.error(arguments);
}

function warn(...args) {
  console.warn(...args);
  logger.warn(arguments);
}

function debug(...args) {
  console.debug(...args);
  logger.debug(arguments);
}

exports.info = info;
exports.error = error;
exports.warn = warn;
exports.debug = debug;