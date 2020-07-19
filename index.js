//get the variables to work with in the config file
const { app, client, middleware, PORT } = require("./configBasic");

//handle the get requests
require("./get");

//handle the post requests
require("./post");

//listen for connections to the server
app.listen(PORT, '0.0.0.0', (req, res) => {
	console.log(`Listening on port ${PORT}...`);
});

//handle errors
require("./errors");
