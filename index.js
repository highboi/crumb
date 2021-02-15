//get the variables to work with in the config file
const { client, middleware, server, nms, obsWss } = require("./configBasic");

//handle the shutting down of the server
middleware.onShutdown();

/*
CRON FORMAT:
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    │
│    │    │    │    │    └ day of week (0 - 7) (0 or 7 is Sun)
│    │    │    │    └───── month (1 - 12)
│    │    │    └────────── day of month (1 - 31)
│    │    └─────────────── hour (0 - 23)
│    └──────────────────── minute (0 - 59)
└───────────────────────── second (0 - 59, OPTIONAL)
*/
//set the degradation rate for each of the search terms in the redis store
//this degrades the search score every week on sunday, where there is likely
//to be less traffic (according to youtube stats)
//middleware.scheduleFunction("0 0 0 * * 0", (async () => {await middleware.changeAllWordScore(false, 0.000001)})());

//handle the get requests
require("./get");

//handle the post requests
require("./post");

//listen for connections to the server
server.listen(process.env.SERVERPORT, '0.0.0.0', () => {
	console.log(`[+] Server is Running on port ${process.env.SERVERPORT}`);
});

//run node media server in order to enable obs streaming
nms.run();

//check for invalid stream keys and store details of live streams if keys are valid
nms.on("postPublish", async (id, streamPath, args) => {
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
	} else { //get information about the live stream from the user and store the file path in the database
		//get the user info
		var user = res[0];

		//get the pending streams where the video path is undefined and where the userid is the same as the user variable
		var streamid = await client.query(`SELECT id FROM videos WHERE user_id=$1 AND video IS NULL`, [user.id]);
		streamid = streamid.rows[0].id;

		//send a message to all of the OBS WSS sockets that the stream has started
		var viewers = Array.from(obsWss.clients).filter((socket) => {
			return socket.room == streamid;
		});

		viewers.forEach((item, index) => {
			item.send("started");
			console.log("STREAM STARTED");
		});
	}
});

//rename/move the recorded streams elsewhere for convenience and save the path to the DB
nms.on("donePublish", async (id, streamPath, args) => {
	var timestamp = nms.getSession(id).startTimestamp;
	var streamkey = streamPath.replace("/live/", "");

	var user = await client.query(`SELECT id FROM users WHERE streamkey=$1`, [streamkey]);
	userid = user.rows[0].id;

	var time = middleware.getDate(timestamp);

	console.log("SUPPOSED FILE NAME: ", time);

	var path = `/videos/nmsMedia/live/${streamkey}/${time}.mp4`;

	console.log(path);

	//add the path into the DB
	await client.query(`UPDATE videos SET video=$1 WHERE video IS NULL AND user_id=$2`, [path, userid]);

	//get the stream id
	var streamid = await client.query(`SELECT id FROM videos WHERE video=$1 AND user_id=$2`, [path, userid]);
	streamid = streamid.rows[0].id;

	//notify the users that the stream has ended
	var viewers = Array.from(obsWss.clients).filter((socket) => {
		return socket.room == streamid;
	});

	viewers.forEach((item, index) => {
		item.send("ended");
	});
});

//handle errors
require("./errors");
