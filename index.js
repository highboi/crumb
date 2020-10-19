//get the variables to work with in the config file
const { app, client, middleware, PORT, viewObject, server, liveWss, chatWss, nms } = require("./configBasic");

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

//run node media server in order to enable obs streaming
nms.run();

//check for invalid stream keys
nms.on("prePublish", async (id, streamPath, args) => {
	//get the session for later rejection if necessary
	var session = nms.getSession(id);

	//get the supposed stream path (the directory after /live is the stream key provided)
	var givenKey = streamPath.replace("/live/", "");

	//make a query to the DB to check to see if this stream key exists
	var res = await client.query(`SELECT * FROM users WHERE streamkey=$1`, [givenKey]);
	res = res.rows;

	//if the stream key does not exist, then reject this session
	if (res.length == 0) {
		session.reject();
	}
});

nms.on("donePublish", (id, streamPath, args) => {
	var timestamp = nms.getSession(id).startTimestamp;
	var streamkey = streamPath.replace("/live/", "");

	

	console.log("done streaming");
});

//handle errors
require("./errors");
