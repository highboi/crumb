//this is a file for handling the logging of traffic on the web servers as well as the errors and actions performed

//winston logger
const winston = require("winston");

//create the logger
var logger = winston.createLogger({
	level: 'info',
	transports: [
		new winston.transports.File({filename: 'traffic.log', level: 'info'}),
		new winston.transports.File({filename: 'debug.log', level: 'debug'}),
		new winston.transports.File({filename: 'error.log', level: 'error'})
	]
});

//export the logger
module.exports = logger;
