//set the global app root for saving files and stuff (this is at the start of everything else)
global.appRoot = __dirname;

//set global variables for websocket clients to avoid unnecessary computations
global.webWssClients = {};
global.obsWssClients = {};
global.chatWssClients = {};

//get the variables to work with in the config file
const { client, middleware, server, nms, obsWss } = require("./servercode/configBasic");

//handle uncaught promise rejections in the code
process.on("unhandledRejection", (reason, promise) => {
	console.log(`Unhandled Rejection at: $1 reason: $2`, [promise, reason]);
	middleware.logError(reason.message);
});

//handle uncaught exceptions in the code
process.on("uncaughtException", (err, origin) => {
	console.log(`Uncaught Exception: $1 FROM $2`, [err, origin]);
	middleware.logError(err.message);
});

//handle the shutting down of the server
middleware.onShutdown();

//handle paths and stuff
require("./servercode/mainpath");

//listen for connections to the server
server.listen(process.env.SERVERPORT, '0.0.0.0', () => {
	console.log(`[+] Server is Running on port ${process.env.SERVERPORT}`);
});

//run the node media server module
nms.run();
