//set the global app root for saving files and stuff (this is at the start of everything else)
global.appRoot = __dirname;

//get the variables to work with in the config file
const { client, middleware, server, nms, obsWss } = require("./servercode/configBasic");

//handle the shutting down of the server
middleware.onShutdown();

//handle paths and stuff
require("./servercode/testpath");

//listen for connections to the server
server.listen(process.env.SERVERPORT, '0.0.0.0', () => {
	console.log(`[+] Server is Running on port ${process.env.SERVERPORT}`);
});

//run the node media server module
nms.run();
