const winston = require("winston");

var logger = winston.createLogger({
	level: 'info',
	transports: [
		new winston.transports.File({filename: 'traffic.log', level: 'info'}),
		new winston.transports.File({filename: 'debug.log', level: 'debug'}),
		new winston.transports.File({filename: 'error.log', level: 'error'})
	]
});

module.exports = logger;
