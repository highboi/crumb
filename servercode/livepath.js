const {app, server, client, middleware, chatWss, obsWss, liveWss, nms} = require("./configBasic");
const fs = require("fs");
const WebSocket = require("ws");
const url = require("url");
const cookie = require("cookie");
const formidable = require("formidable");


/*
GET PATHS FOR LIVE MEDIA
*/

app.get("/l/view/:streamid", async (req, res) => {
	//isolate the websocket with the livestream id in the url
	var streams = Array.from(liveWss.clients).filter((socket) => {
		return typeof socket.streamid != 'undefined';
	}).filter((socket) => {
		return socket.streamid == req.params.streamid;
	});

	//if there are no streams with the id in the url, then redirect to an error or the recorded stream or the OBS stream
	if (streams.length == 0) {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.streamid]);
		video = video.rows[0];
		if (typeof video != 'undefined' && video.streaming == false) {
			req.flash("message", `Stream with ID: '${req.params.streamid}' does not exist.`);
			res.redirect("/error");
		} else {
			if (!video.streaming) { //redirect to the recorded stream
				res.redirect(`/v/${req.params.streamid}`);
			} else { //render the OBS stream
				//this is a websocket connection handler for the obs stream sockets in order to handle the obs stream clients and end streams
				obsWss.on("connection", (ws, request) => {
					ws.room = req.params.streamid;

					ws.on("message", (message) => {
						console.log("OBS WSS Message: " + message);
						if (message == "ended") {
							console.log("OBS STREAM ENDED");
						}
					});
				});
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
		viewObj = Object.assign({}, viewObj, {streamid: req.params.streamid, enableChat: streams[0].enableChat});

		//check for connections to the server
		liveWss.on("connection", (ws, request) => {
			//assign the client to a "room" with the stream id
			ws.room = req.params.streamid;

			//send the existing data of the stream
			console.log("Connection from Client.");
			var dataBuf = Buffer.concat(streams[0].dataBuffer);
			console.log("Data Buf: ", dataBuf);
			ws.send(dataBuf);

			ws.on("message", (message) => {
				if (message == "ended") {
					console.log(`Stream with id: ${req.params.streamid} ended.`);
				}
			});
		});

		//render the view with the stream
		res.render("viewstream.ejs", viewObj);
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

	console.log(stream);

	//view object for the views, other values can be added later
	var viewObj = Object.assign({}, viewObj, {streamname: stream.name, enableChat: stream.enableChat, streamid: stream.id, isStreamer: true});

	//if there is a stream that exists, then render the admin panel
	if (typeof stream != 'undefined') {
		if (req.query.streamtype == "obs") {
			//this is a websocket connection handler for the obs stream sockets in order to handle the obs stream clients and end streams
			obsWss.on("connection", (ws, request) => {
				ws.room = stream.id;

				ws.on("message", (message) => {
					console.log("OBS WSS Message: " + message);
					if (message == "ended") {
						console.log("OBS STREAM ENDED");
					}
				});
			});

			//get the stream key
			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1`, [stream.user_id]);
			streamkey = streamkey.rows[0].streamkey;

			//set the additional values for the view object
			viewObj = Object.assign({}, viewObj, {streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, rtmpServer: "rtmp://localhost/live", streamKey: streamkey});

			//render the admin panel
			res.render("obsAdminPanel.ejs", viewObj);
		} else if (req.query.streamtype == "browser") {
			//handle the websocket connections and the handling of video data
			liveWss.on("connection", async (ws) => {
				console.log("STREAM CONNECTION");
				//set the stream id for this socket
				ws.streamid = req.params.streamid;

				//set a value for the enabling of the chat
				ws.enableChat = stream.enableChat;

				//a data buffer to store the video data for later, store this inside
				//the websocket in order to be able to access it from other websockets
				ws.dataBuffer = [];

				//create a file stream for saving the contents of the live stream
				var fileName = "./storage/videos/files/" + Date.now() + "-" + stream.name + ".webm";
				var writeStream = fs.createWriteStream(fileName);

				//set the video path equal to the path to the webm
				var videopath = fileName.replace("./storage", "");

				//set the video path in the database entry
				await client.query(`UPDATE videos SET video=$1 WHERE id=$2`, [videopath, req.params.streamid]);

				//set the video path in the videofiles table
				await client.query(`INSERT INTO videofiles (id, video) VALUES ($1, $2)`, [req.params.streamid, videopath]);

				//message that we got a connection from the streamer
				console.log("Connection from Streamer.");

				//if the socket recieves a message from the streamer socket, then send the data to the client for
				//streaming (the data is the live stream)
				ws.on("message", (message) => {
					if (typeof message == 'object') {
						//write the new data to the file
						writeStream.write(message, () => {
							console.log("Writing to file complete.");
						});

						//append the data to the data buffer
						ws.dataBuffer.push(message);
					}

					//sort the clients for the websocket server to only the stream
					//viewers
					var clients = Array.from(liveWss.clients).filter((socket) => {
						return socket.room == stream.id;
					}).filter((socket) => {
						return socket.readyState == WebSocket.OPEN;
					});

					//send the new data to each of the corresponding clients
					clients.forEach((item, index) => {
						item.send(message);
					});
				});

				//whenever the websocket closes
				ws.on("close", async () => {
					console.log("Stream Viewer Disconnected.");
					//end the filestream to the recorded live stream
					writeStream.end();
					writeStream.on("finish", () => {
						console.log("Finished writing to file");
					});
					//let the database know that this video is not streaming anymore so that the view references the file instead of a mediasource
					await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, ['false', stream.id]);
				});
			});

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

	console.log("Stream Id: " + streamid);

	//parse the form and files such as the thumbnail
	form.parse(req, async (err, fields, files) => {
		//variable for storing the stream type
		var streamtype = req.params.type;
		//check for the stream type
		if (req.params.type == "browser") {
			//save the thumbnail of the live stream
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//set all of the database details
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), fields.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, fields.enableChat.toString()];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enableChat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

			//insert the file details into the videofiles table
			await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
		} else if (req.params.type == "obs") {
			//save the thumbnail and return the path to the thumbnail
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//save the details into the db excluding the video path
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, new Date().toISOString(), fields.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, fields.enableChat.toString()];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enableChat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesarr);

			//insert the file details into the videofiles table
			await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
		}
		//render the view for the streamer based on the stream type
		res.redirect(`/l/admin/${streamid}?streamtype=${streamtype}`);
	});
});


/*
WEBSOCKET SERVER HANDLING
*/

//handle the http upgrade for websockets (switching from http(s) to ws protocol)
server.on("upgrade", (req, socket, head) => {
	var pathname = url.parse(req.url).pathname;

	console.log("PROTOCOL UPGRADE");

	switch (pathname) {
		case "/live":
			console.log("Live Streaming Server Connection...");
			liveWss.handleUpgrade(req, socket, head, (ws) => {
				liveWss.emit("connection", ws, req);
			});
			break;
		case "/chat":
			console.log("Chat Server Connection...");
			chatWss.handleUpgrade(req, socket, head, (ws) => {
				chatWss.emit("connection", ws, req);
			});
			break;
		case "/obslive":
			console.log("OBS Live Streaming Server Connection...");
			obsWss.handleUpgrade(req, socket, head, (ws) => {
				obsWss.emit("connection", ws, req);
			});
			break;
		default:
			console.log("Attempted upgrade at " + pathname);
			break;
	}
});

//this is a websocket connection handler for the chat server which handles the transmitting of chat data between clients of a live stream
chatWss.on("connection", async (ws, req) => {
	//get the user info from the cookies in the headers
	var sessionid = cookie.parse(req.headers.cookie).sessionid;
	console.log(sessionid);

	var userinfo = await middleware.getUserSession(sessionid);
	console.log(userinfo);

	//whenever we get a message
	ws.on("message", async (message) => {
		console.log(typeof message);
		console.log("Message: ", message);

		//get the streamid and the actual message
		var data = message.split(",");

		//if this is an initialization segment with information about the client, process this
		if (data[0] == "init") {
			//set the stream room id
			ws.room = data[1];

			//check the type of the socket (streamer or client) and set a boolean accordingly in order to distinguish between the host and clients/viewers
			if (data[2] == "streamer") {
				ws.isStreamer = true;
			} else if (data[2] == "client") {
				ws.isStreamer = false;
			}
		} else if (data[0] == "msg") { //if the data is a message to send, then send it
			//get the recipients from the chat wss for this live stream
			var recipients = Array.from(chatWss.clients).filter((socket) => {
				return typeof socket.room != 'undefined';
			}).filter((socket) => {
				return socket.room == data[1];
			});

			//send the message to each of the recipients
			recipients.forEach((item, index) => {
				if (item != ws) {
					item.send(data[2]);
				}
			});

			//insert the message into the database along with the stream id, user id, and the time which the message was posted
			await client.query(`INSERT INTO livechat (message, stream_id, user_id, time) VALUES ($1, $2, $3, $4)`, [data[2], data[1], userinfo.id, parseInt(data[3], 10)]);
		}
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
			var viewers = Array.from(obsWss.clients).filter((socket) => {
				return socket.room == streamid;
			});

			viewers.forEach((item, index) => {
				item.send("started");
				console.log("STREAM STARTED");
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

		//notify the users that the stream has ended
		var viewers = Array.from(obsWss.clients).filter((socket) => {
			return socket.room == session.streamid;
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
