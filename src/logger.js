const { createLogger, registerLogFormatter, testing } = require('bs-logger');

registerLogFormatter('plain', (m) => `${m.message}`); // Must use lower-case name for formatter name

const factoryFn = process.env.TEST ? testing.createLoggerMock : createLogger;
const logConfig = {
  targets: `stdout:${process.env.LOGGING_LEVEL || 'info'}%plain`,
};

module.exports = factoryFn(logConfig);
