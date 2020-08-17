//this is a file for handling the logging of traffic on the web servers as well as the errors and actions performed

const path = require("path");
const fs = require("fs");

//create a writable stream to the log file
var stream = fs.createWriteStream("traffic.log", {flags: "a"});

//export the stream for use later on
module.exports = {
	stream
}
