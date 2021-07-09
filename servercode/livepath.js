const {app, server, client, middleware, chatWss, obsWss, liveWss, nms} = require("./configBasic");
const fs = require("fs");
const WebSocket = require("ws");
const url = require("url");
const cookie = require("cookie");

/*
WEBSOCKET SERVER HANDLING
*/

require("./livesockets");

/*
GET PATHS FOR LIVE MEDIA
*/

//get path for viewing a stream
app.get("/l/view/:streamid", async (req, res) => {
	//isolate the websocket with the livestream id in the url
	var stream = global.webWssClients[req.params.streamid];

	//make the view object
	var viewObj = await middleware.getViewObj(req, res);

	//if there are no streams with the id in the url, then redirect to an error or the recorded stream or the OBS stream
	if (typeof stream == 'undefined') {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.streamid]);
		video = video.rows[0];

		if (typeof video == 'undefined') { //if the video does not exist, then show an error
			req.flash("message", `Stream with ID: '${req.params.streamid}' does not exist.`);
			res.redirect("/error");
		} else if (!video.streaming) { //if the video is not streaming, redirect to the video url
			res.redirect(`/v/${req.params.streamid}`);
		} else { //if the video is streaming and does exist, then render the stream
			//get the stream key of the streamer
			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
			streamkey = streamkey.rows[0].streamkey;

			//get the video creator
			var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
			videocreator = videocreator.rows[0];

			//get the video reccomendations for this live stream
			var reccomendations = await middleware.getReccomendations(req, video);

			//add elements to the view object
			viewObj = Object.assign({}, viewObj, {stream: video, videocreator: videocreator, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, reccomendations: reccomendations});

			//render the view for the stream
			res.render("viewStreamObs.ejs", viewObj);
		}
	} else { //redirect the user to the vanilla websocket streams
		//get the video for this websocket stream
		var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.streamid]);
		video = video.rows[0];

		//get the creator of the video
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
		videocreator = videocreator.rows[0];

		//get the video reccomendations for this live stream
		var reccomendations = await middleware.getReccomendations(req, video);

		//add elements to the view object
		viewObj = Object.assign({}, viewObj, {stream: video, reccomendations: reccomendations, videocreator: videocreator});

		//render the view with the stream
		res.render("viewStreamWeb.ejs", viewObj);
	}
});

//this is a get request to get basic info about a live stream
app.get("/l/start", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);
	res.render("startstream.ejs", viewObj);
});

//this is a get request for the admin panel of a live stream
app.get("/l/admin/:streamid", middleware.checkSignedIn, async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req, res);

	//get the stream info
	var stream = await client.query(`SELECT * FROM videos WHERE id=$1 AND user_id=$2 LIMIT 1`, [req.params.streamid, viewObj.user.id]);
	stream = stream.rows[0];

	//view object for the views, other values can be added later
	var viewObj = Object.assign({}, viewObj, {streamname: stream.title, enableChat: stream.enablechat, streamid: stream.id});

	//if there is a stream that exists, then render the admin panel
	if (typeof stream != 'undefined') {
		//get the video creator
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [stream.user_id]);
		videocreator = videocreator.rows[0];

		//check to see what to do based on the type of live stream in the roster
		if (req.query.streamtype == "obs") {
			//get the stream key
			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1 LIMIT 1`, [stream.user_id]);
			streamkey = streamkey.rows[0].streamkey;

			//set the additional values for the view object
			viewObj = Object.assign({}, viewObj, {stream: stream, videocreator: videocreator, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, rtmpServer: "rtmp://localhost/live", streamKey: streamkey});

			//render the admin panel
			res.render("obsAdminPanel.ejs", viewObj);
		} else if (req.query.streamtype == "browser") {
			//add the stream and videocreator objects to the view object
			viewObj = Object.assign({}, viewObj, {stream: stream, videocreator: videocreator});

			//render the "admin" panel for the browser streamer
			res.render("webAdminPanel.ejs", viewObj);
		}
	} else {
		req.flash("message", "There is no stream in your roster yet, please start one.");
		res.redirect("/l/start");
	}
});

/*
POST PATHS FOR LIVE MEDIA
*/

//this is the post link for starting a new stream on the site
app.post("/l/stream/:type", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//generate a unique stream id
	var streamid = await middleware.generateAlphanumId();

	//variable for storing the stream type
	var streamtype = req.params.type;

	//check for the stream type
	if (req.params.type == "browser") {
		//save the thumbnail of the live stream
		var thumbnailpath = await middleware.saveFile(req.files.liveThumbnail, "/storage/videos/thumbnails/");

		//set all of the database details
		var valuesarr = [streamid, req.body.name, req.body.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), req.body.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, req.body.enableChat];
		await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

		//insert the file details into the videofiles table
		await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
	} else if (req.params.type == "obs") {
		//save the thumbnail and return the path to the thumbnail
		var thumbnailpath = await middleware.saveFile(req.files.liveThumbnail, "/storage/videos/thumbnails/");

		//save the details into the db excluding the video path
		var valuesarr = [streamid, req.body.name, req.body.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), req.body.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, req.body.enableChat.toString()];
		await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

		//insert the file details into the videofiles table
		await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
	}
	//render the view for the streamer based on the stream type
	res.redirect(`/l/admin/${streamid}?streamtype=${streamtype}`);
});

/*
NODE-MEDIA-SERVER RTMP OBS STREAM HANDLING
*/

//check for invalid stream keys and store details of live streams if keys are valid
nms.on("postPublish", async (id, streamPath, args) => {
	//get the session for later rejection if necessary
	var session = nms.getSession(id);
	console.log("NMS SESSION:", session);

	//get the supposed stream path (the directory after /live is the stream key provided)
	var givenKey = streamPath.replace("/live/", "");

	//make a query to the DB to check to see if this stream key exists
	var res = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [givenKey]);
	res = res.rows;

	//if the stream key does not exist, then reject this session
	if (res.length == 0) {
		session.reject();
		console.log("SESSION REJECTED");
	} else { //get information about the live stream from the user and store the file path in the database
		//get the user info
		var user = res[0];

		//get the pending streams where the video path is undefined and where the userid is the same as the user variable
		var streamid = await client.query(`SELECT id FROM videos WHERE user_id=$1 AND streamtype=$2 AND video IS NULL LIMIT 1`, [user.id, "obs"]);

		//set the value of a "wasPublished" value in the session as to not save invalid streams without first having preexisting live streams
		if (streamid.rows.length > 0) {
			streamid = streamid.rows[0].id;
			session.wasPublished = true;

			//set the streamid in the session object
			session.streamid = streamid;

			//send a message to all of the OBS WSS sockets that the stream has started
			var viewers = global.obsWssClients[streamid].filter((socket) => {
				return socket.readyState == WebSocket.OPEN;
			});;

			viewers.forEach((item, index) => {
				item.send("started");
			});
		} else {
			session.wasPublished = false;
		}
	}
});

//rename/move the recorded streams elsewhere for convenience and save the path to the DB
nms.on("donePublish", async (id, streamPath, args) => {
	console.log("DONE PUBLISH");

	var session = nms.getSession(id);

	console.log("\n\nSTREAMID:", session.streamid, "\n\n")

	//get the name of the obs stream file
	var filename = middleware.getObsName(session.startTimestamp);

	//get the stream key
	var streamkey = streamPath.replace("/live/", "");

	if (session.wasPublished) {
		//get the user id associated with the stream key
		var user = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [streamkey]);
		userid = user.rows[0].id;

		console.log("SUPPOSED FILE NAME: ", filename);

		//create a full relative filepath to the mp4 file
		var path = `/videos/nmsMedia/live/${streamkey}/${filename}.mp4`;

		console.log(path);

		//add the path into the main DB entry
		await client.query(`UPDATE videos SET video=$1 WHERE id=$2 AND user_id=$3`, [path, session.streamid, userid]);

		//add the video path into the videofiles table as well
		await client.query(`UPDATE videofiles SET video=$1 WHERE id=$2`, [path, session.streamid]);

		//set the "streaming" value to "false" as this is a normal video now
		await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, ['false', session.streamid]);

		//increase the video count of the user now that the stream has finished
		await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [userid]);

		//notify the users that the stream has ended
		var viewers = global.obsWssClients[session.streamid].filter((socket) => {
			return socket.readyState == WebSocket.OPEN;
		});

		viewers.forEach((item, index) => {
			item.send("ended");
		});
	} else {
		//delete the file of the unapproved obs stream
		fs.unlink(`${global.appRoot}/storage/videos/nmsMedia/live/${streamkey}/${filename}.mp4`, (err) => {
			if (err) throw err;
		});

		//select the first null video entry
		var videoid = await client.query(`SELECT id FROM videos WHERE user_id IN (SELECT id FROM users WHERE streamkey=$1) AND streamtype=$2 AND video IS NULL LIMIT 1`, [streamkey, "obs"]);
		videoid = videoid.rows[0].id;

		//delete all stray database entries
		await client.query(`DELETE FROM videos WHERE id=$1`, [videoid]);
		await client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);

		//reject the obs session to delete it
		session.reject();
		console.log("SESSION REJECTED");
	}
});
