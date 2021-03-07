const {app, server, client, middleware, chatWss, obsWss, liveWss, nms} = require("./configBasic");
const fs = require("fs");
const WebSocket = require("ws");
const url = require("url");
const cookie = require("cookie");
const formidable = require("formidable");

/*
WEBSOCKET SERVER HANDLING
*/

require("./livesockets");

/*
GET PATHS FOR LIVE MEDIA
*/

app.get("/l/view/:streamid", async (req, res) => {
	//isolate the websocket with the livestream id in the url
	var stream = global.webWssClients[req.params.streamid];

	//if there are no streams with the id in the url, then redirect to an error or the recorded stream or the OBS stream
	if (typeof stream == 'undefined') {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.streamid]);
		video = video.rows[0];
		if (typeof video != 'undefined' && video.streaming == false) {
			req.flash("message", `Stream with ID: '${req.params.streamid}' does not exist.`);
			res.redirect("/error");
		} else {
			if (!video.streaming) { //redirect to the recorded stream
				res.redirect(`/v/${req.params.streamid}`);
			} else { //render the OBS stream
				//get the stream key of the streamer
				var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1`, [video.user_id]);
				streamkey = streamkey.rows[0].streamkey;

				//make the view object
				var viewObj = await middleware.getViewObj(req);
				viewObj = Object.assign({}, viewObj, {streamid: req.params.streamid, enableChat: video.enablechat, streamname: video.title, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`});

				//render the view for the stream
				res.render("viewStreamObs.ejs", viewObj);
			}
		}
	} else { //redirect the user to the vanilla websocket streams
		//create a view object
		var viewObj = await middleware.getViewObj(req);
		viewObj = Object.assign({}, viewObj, {streamid: req.params.streamid, enableChat: stream[0].enableChat});

		//render the view with the stream
		res.render("viewStreamWeb.ejs", viewObj);
	}
});

//this is a get request to get basic info about a live stream
app.get("/l/start", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req);
	res.render("startstream.ejs", viewObj);
});

//this is a get request for the admin panel of a live stream
app.get("/l/admin/:streamid", middleware.checkSignedIn, async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//get the stream info
	var stream = await client.query(`SELECT * FROM videos WHERE id=$1 AND user_id=$2`, [req.params.streamid, viewObj.user.id]);
	stream = stream.rows[0];

	//view object for the views, other values can be added later
	var viewObj = Object.assign({}, viewObj, {streamname: stream.title, enableChat: stream.enablechat, streamid: stream.id});

	//if there is a stream that exists, then render the admin panel
	if (typeof stream != 'undefined') {
		if (req.query.streamtype == "obs") {
			//get the stream key
			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1`, [stream.user_id]);
			streamkey = streamkey.rows[0].streamkey;

			//set the additional values for the view object
			viewObj = Object.assign({}, viewObj, {streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, rtmpServer: "rtmp://localhost/live", streamKey: streamkey});

			//render the admin panel
			res.render("obsAdminPanel.ejs", viewObj);
		} else if (req.query.streamtype == "browser") {
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

	//make a form handler in order to save the files and details into the db
	var form = formidable.IncomingForm();

	//generate a unique stream id
	var streamid = await middleware.generateAlphanumId();

	//parse the form and files such as the thumbnail
	form.parse(req, async (err, fields, files) => {
		//variable for storing the stream type
		var streamtype = req.params.type;
		//check for the stream type
		if (req.params.type == "browser") {
			//save the thumbnail of the live stream
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//set all of the database details
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), fields.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, fields.enableChat];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

			//insert the file details into the videofiles table
			await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
		} else if (req.params.type == "obs") {
			//save the thumbnail and return the path to the thumbnail
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//save the details into the db excluding the video path
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), fields.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, fields.enableChat.toString()];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

			//insert the file details into the videofiles table
			await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
		}
		//render the view for the streamer based on the stream type
		res.redirect(`/l/admin/${streamid}?streamtype=${streamtype}`);
	});
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
	var res = await client.query(`SELECT id FROM users WHERE streamkey=$1`, [givenKey]);
	res = res.rows;

	//if the stream key does not exist, then reject this session
	if (res.length == 0) {
		session.reject();
		console.log("SESSION REJECTED");
	} else { //get information about the live stream from the user and store the file path in the database
		//get the user info
		var user = res[0];

		//get the pending streams where the video path is undefined and where the userid is the same as the user variable
		var streamid = await client.query(`SELECT id FROM videos WHERE user_id=$1 AND streamtype=$2 AND video IS NULL`, [user.id, "obs"]);

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
		var user = await client.query(`SELECT id FROM users WHERE streamkey=$1`, [streamkey]);
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
		var videoid = await client.query(`SELECT id FROM videos WHERE user_id IN (SELECT id FROM users WHERE streamkey=$1) AND streamtype=$2 AND video IS NULL`, [streamkey, "obs"]);
		videoid = videoid.rows[0].id;

		//delete all stray database entries
		await client.query(`DELETE FROM videos WHERE id=$1`, [videoid]);
		await client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);

		//reject the obs session to delete it
		session.reject();
		console.log("SESSION REJECTED");
	}
});
