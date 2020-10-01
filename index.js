//get the variables to work with in the config file
const { app, client, middleware, PORT, viewObject, server, wss } = require("./configBasic");

//handle the shutting down of the server
middleware.onShutdown();

//handle the get requests
require("./get");

//handle the post requests
require("./post");

//listen for connections to the server
server.listen(PORT, '0.0.0.0', () => {
	console.log("Server is Running");
});

//handle errors
require("./errors");
