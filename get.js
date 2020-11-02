//this is a file to handle all of the get requests for the server

const { app, client, middleware, PORT, server, liveWss, chatWss, obsWss, nms} = require("./configBasic");

const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");
const {v4: uuidv4} = require("uuid");
const WebSocket = require("ws");
const url = require("url");
const cookie = require("cookie");

//calculate the amount of hits on the site
app.use(middleware.hitCounter);

//handle the http upgrade for websockets (switching from http(s) to ws protocol)
server.on("upgrade", (req, socket, head) => {
	var pathname = url.parse(req.url).pathname;

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


//get the index of the site working
app.get('/', async (req, res) => {
	//select all of the videos from the database to be displayed
	var videos = await client.query("SELECT * FROM videos LIMIT 50");
	videos = videos.rows;

	var viewObj = {message: req.flash("message"), videos: videos}

	//select all of the playlists in the database that belong to the user if they are signed in
	if (req.cookies.userinfo) {
		var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [req.cookies.userinfo.id]);
		playlists = playlists.rows;
		//object for the view with the playlists included
		var viewObj = Object.assign({}, {user: req.cookies.userinfo}, viewObj, {playlists: playlists});
	}

	//render the view
	res.render("index.ejs", viewObj);
});

//get the registration page
app.get('/register', middleware.checkNotSignedIn, (req, res) => {
	var viewObj = {message: req.flash("message")};
	res.render("register.ejs", viewObj);
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, (req, res) => {
	var viewObj = {message: req.flash("message")};
	res.render("login.ejs", viewObj);
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
	res.cookie('userinfo', '', {expires: new Date(0)});
	console.log("[+] Logged out.");
	req.flash("message", "Logged out!");
	res.redirect("/");
});





//view the channel of the user
app.get("/u/:userid", async (req, res) => {
	//select the videos belonging to this channel
	var videostest = await client.query(`SELECT * FROM videos WHERE user_id=$1 LIMIT 1`, [req.params.userid]);
	videostest = videostest.rows;

	//get the actual user that the channel belongs to
	var creator = await client.query(`SELECT * FROM users WHERE id=$1`, [req.params.userid]);
	creator = creator.rows[0];

	//create an object for passing into the view
	var viewObj = {creator: creator, message: req.flash("message")};

	//get any variables from the query string in order to render the right things
	if (Object.keys(req.query).length && typeof req.query.section != 'undefined') {
		//add the section that the user wants to see in the channel page
		viewObj.section = req.query.section;
	} else {
		//the default section is the home page
		viewObj.section = "home";
	}

	//add the videos to the view object if the videos exist on the channel and if the section actually needs the videos to be sent with the view
	if (typeof videostest[0] != 'undefined') {
		switch(viewObj.section) {
			case "home":
				var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1 ORDER BY views DESC LIMIT 10`, [req.params.userid]);
				videos = videos.rows;
				break;
			case "videos":
				var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1`, [req.params.userid]);
				videos = videos.rows;
				break;
			case "playlists":
				var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [req.params.userid]);
				playlists = playlists.rows;
		}
		if (typeof videos != 'undefined') {
			viewObj.videos = videos;
		}
		if (typeof playlists != 'undefined') {
			viewObj.playlists = playlists;
		}
	}

	//get the full view object
	if (req.cookies.userinfo) {
		viewObj = Object.assign({}, {user: req.cookies.userinfo}, viewObj);
	}

	//render the view
	res.render("viewchannel.ejs", viewObj);
});





//get the form for submitting videos
app.get("/v/submit", middleware.checkSignedIn, (req, res) => {
	var viewObj = {message: req.flash("message")};
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
	}
	res.render("submitvideo.ejs", viewObj);
});

//views individual videos on the site
app.get("/v/:videoid", async (req, res) => {
	//select the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the video creator
	var videocreator = await client.query(`SELECT * FROM users WHERE id=$1`, [video.user_id]);
	videocreator = videocreator.rows[0];

	//update the views on the video
	var views = parseInt(video.views, 10); //get the current amount of views on the video
	var newcount = views + 1; //increase the amount of views on the video
	await client.query(`UPDATE videos SET views=$1 WHERE id=$2`, [newcount, req.params.videoid]); //update the views on the video

	//get videos for the reccomendations
	var videos = await middleware.getReccomendations(video);

	//select the comments that belong to the video
	var comments = await client.query(`SELECT * FROM comments WHERE videoid=$1 ORDER BY posttime DESC`, [req.params.videoid]);
	comments = comments.rows;

	//select all of the chat messages that were typed if this was a live stream
	var chatReplayMessages = await client.query(`SELECT * FROM livechat WHERE streamid=$1`, [req.params.videoid]);
	chatReplayMessages = chatReplayMessages.rows;

	//set the object to be passed to the rendering function
	var viewObj = {video: video, videos: videos, videocreator: videocreator, approx: approx, comments: comments, message: req.flash("message")};

	//check to see if there are any chat messages to replay
	if (chatReplayMessages.length > 0) {
		viewObj.chatReplayMessages = chatReplayMessages;
	}

	//render the video view based on whether or not the user is logged in and has a session variable
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
		var subscribed = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [videocreator.id, req.cookies.userinfo.id]);
		viewObj.subscribed = subscribed.rows.length;
	}

	//check to see if the video needs to scroll down to a comment that was just posted
	if (req.query.scrollToComment == "true" && typeof req.query.commentid != 'undefined') {
		viewObj.scrollToComment = true;
		viewObj.commentid = req.query.commentid;
	}

	//render the view
	res.render("viewvideo.ejs", viewObj);
});

//get the video data from the file in chunks for efficiency of the network
app.get("/video/:id", async (req, res) => {
	//get the video path
	var path = await client.query(`SELECT video FROM videos WHERE id=$1`, [req.params.id]);
	path = "./storage" + path.rows[0].video;

	console.log(path);

	//get the extension of the video for the content type of the response
	var contentType = path.substring(path.lastIndexOf(".")+1);
	contentType = `video/${contentType}`

	//get information about the file
	const stat = fs.statSync(path);
	//get the file size
	const fileSize = stat.size;
	//get the "range" in the http header if there is one, this defines the amount of bytes the 
	//front-end wants from a file
	const range = req.headers.range;

	//the first few requests will be made without a range header, but after a while the range header
	//will show up in order to get the next chunk of data for the video. this is better than loading
	//the entire file because this throttles the network speed by splitting the video requests
	//into chunks as needed, this is especially useful for hours-long videos which may take time to load
	if (range) {
		//get the parts of the file to get from the range header
		const parts = range.replace(/bytes=/, "").split("-");
		//get the starting byte for our chunk
		const start = parseInt(parts[0], 10);
		//this uses a ternary operator. if parts[1], or the ending chunk exists in the range header,
		//then we set the ending chunk to be this number, if there is no ending chunk, then get the ending byte of the file by
		//fileSize-1
		const end = parts[1] ? parseInt(parts[1], 10) : fileSize-1;
		//get the chunk size based off of the start and end bytes
		const chunksize = (end-start)+1
		//create a read stream for the file with the start and end defining the chunk to look at
		const file = fs.createReadStream(path, {start, end})
		//define an http head for the response
		const head = {
			'Content-Range': `bytes ${start}-${end}/${fileSize}`, //define a content range
			'Accept-Ranges': 'bytes', //define the type of range we want, we will calculate this range in bytes
			'Content-Length': chunksize, //define the content size
			'Content-Type': contentType, //define the type of content
		}
		//write the head to the response, we have a 206 for partial content, which tells the front-end to make another request for the other chunks
		res.writeHead(206, head);
		//pipe the chunk of file contents to the response
		file.pipe(res);
	} else { //if the front-end is requesting the entire file
		//create an http head
		const head = {
			'Content-Length': fileSize, //make the content size the entire file if the file is small enough
			'Content-Type': contentType //make the content type mp4
		}
		//write the head to the response as 200 since this is a complete response for the video contents
		res.writeHead(200, head)
		//pipe the complete contents of the file to the response with a read stream of the file
		fs.createReadStream(path).pipe(res)
	}
});




app.get("/l/view/:streamid", async (req, res) => {
	//isolate the websocket with the livestream id in the url
	var streams = Array.from(liveWss.clients).filter((socket) => {
		return typeof socket.streamid != 'undefined';
	}).filter((socket) => {
		return socket.streamid == req.params.streamid;
	});

	//if there are no streams with the id in the url, then redirect to an error or the recorded stream
	if (streams.length == 0) {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.streamid]);
		video = video.rows[0];
		if (typeof video != 'undefined' && video.streaming == false) {
			res.render("error.ejs", {error: `Stream with ID: '${req.params.streamid}' does not exist.`});
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
				var viewObj = Object.assign({}, req.cookies.userinfo, {streamid: req.params.streamid, enableChat: video.enablechat, streamname: video.title, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, message: req.flash("message")});

				//render the view for the stream
				res.render("viewStreamObs.ejs", viewObj);
			}
		}
	} else {
		//create a view object
		var viewObj = {streamid: req.params.streamid, enableChat: streams[0].enableChat, message: req.flash("message")};
		if (req.cookies.userinfo) {
			viewObj.user = req.cookies.userinfo;
		}

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
app.get("/l/start", middleware.checkSignedIn, (req, res) => {
	var viewObj = {};
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
	}

	res.render("startstream.ejs", viewObj);
});

//this is a get request for the admin panel of a live stream
app.get("/l/admin/:streamid", middleware.checkSignedIn, async (req, res) => {
	//get the stream info
	var stream = await client.query(`SELECT * FROM videos WHERE id=$1 AND user_id=$2`, [req.params.streamid, req.cookies.userinfo.id]);
	stream = stream.rows[0];

	//view object for the views, other values can be added later
	var viewObj = Object.assign({}, req.cookies.userinfo, {streamname: stream.name, enableChat: stream.enableChat, streamid: stream.id, isStreamer: true});

	//if there is a stream that exists, then render the admin panel
	if (typeof stream != 'undefined') {
		if (req.query.streamtype == "obs") {
			//get the stream key
			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1`, [stream.user_id]);
			streamkey = streamkey.rows[0].streamkey;

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

			//make the view object
			var viewObj = Object.assign({}, req.cookies.userinfo, {streamname: stream.name, enableChat: stream.enablechat, streamid: stream.id, });

			//set the additional values for the view object
			viewObj = Object.assign({}, viewObj, {streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, rtmpServer: "rtmp://localhost/live", streamKey: streamkey, message: req.flash("message")});

			//render the admin panel
			res.render("obsAdminPanel.ejs", viewObj);
		} else if (req.query.streamtype == "browser") {
			//handle the websocket connections and the handling of video data
			liveWss.on("connection", async (ws) => {
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

//this is a websocket connection handler for the chat server which handles the transmitting of chat data between clients of a live stream
chatWss.on("connection", (ws, req) => {
	//get the user info from the cookies in the headers
	var userinfo = JSON.parse((cookie.parse(req.headers.cookie).userinfo).slice(2));

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
			await client.query(`INSERT INTO livechat (message, streamid, userid, time) VALUES ($1, $2, $3, $4)`, [data[2], data[1], userinfo.id, parseInt(data[3], 10)]);
		}
	});
});




//this is a get request for the playlists on the site
app.get("/p/:playlistid", async(req, res) => {
	//get all of the videos in the db
	var videos = await client.query(`SELECT * FROM videos WHERE id IN (SELECT video_id FROM playlistvideos WHERE playlist_id=$1)`, [req.params.playlistid]);
	videos = videos.rows;

	//get the playlist object which contains the name of the playlist and the id of the user that created it
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1`, [req.params.playlistid]);
	playlist = playlist.rows[0];

	//get the creator of the playlist
	var creator = await client.query(`SELECT * FROM users WHERE id=$1`, [playlist.user_id]);
	creator = creator.rows[0];

	//create view object to pass into the view
	var viewObj = {creator: creator, videos: videos, playlist: playlist, message: req.flash("message")};

	//make the full view object
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
	}

	//render the view for the playlist
	res.render("viewplaylist.ejs", viewObj);
});

//this is a get path for adding videos to playlists on the site
app.get("/playlistvideo/add/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.cookies.userinfo.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see if the video is in the playlist already
	if (typeof playlistvideo != 'undefined') { //if the video has already been added, then render an error
		var viewObj = {user: req.cookies.userinfo, error: "Video has already been added to the playlist."};
		res.render("error.ejs", viewObj);
	} else {
		//do something based on if the playlist belongs to the user or not
		if (typeof playlist != 'undefined') {
			//get the amount of videos in the playlist
			var videocount = parseInt(playlist.videocount, 10);
			videocount = videocount + 1;
			//add the video into the playlist
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [req.params.playlistid, req.params.videoid]);
			//update the video count in the playlist
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [videocount, req.params.playlistid]);
			//redirect to the playlist again
			res.redirect(`/p/${req.params.playlistid}`);
		} else { //if the playlist does not belong to the user, render an error
			var viewObj = {user: req.cookies.userinfo, error: "This playlist does not belong to you."};
			res.render("error.ejs", viewObj);
		}
	}
});

//this is a get path for deleting videos from playlists on the site
app.get("/playlistvideo/delete/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.cookies.userinfo.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see whether or not the video is in the playlist or not
	if (typeof playlistvideo != 'undefined') { //if the video is in the playlist, delete it
		//do something based on if the playlist belongs to the user or not
		if (typeof playlist != 'undefined') { //if the playlist belongs to the user
			//get the amount of videos in the playlist
			var videocount = parseInt(playlist.videocount, 10);
			videocount = videocount - 1;
			//delete the video from the playlist
			await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
			//update the video count on the playlist
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [videocount, req.params.playlistid]);
			req.flash("message", "Video Deleted!");
			//redirect to the playlist again
			res.redirect(`/p/${req.params.playlistid}`);
		} else { //if the playlist does not belong to the user, then render an error
			var viewObj = {user: req.cookies.userinfo, error: "Playlist does not belong to you."};
			res.render("error.ejs", viewObj);
		}
	} else { //if the video is not in the playlist, then render an error
		var viewObj = {user: req.cookies.userinfo, error: `Video with ID: ${playlistvideo.video_id} not in playlist.`};
		res.render("error.ejs", viewObj);
	}
});

//this is a get request for creating a new playlist
app.get("/playlist/new", middleware.checkSignedIn, async (req, res) => {
	if (typeof req.query.videoid != 'undefined') {
		var viewObj = {user: req.cookies.userinfo, videoid: req.query.videoid};
	} else {
		var viewObj = {user: req.cookies.userinfo};
	}

	viewObj.message = req.flash("message");

	//render the form for creating a new playlist
	res.render("createplaylist.ejs", viewObj);
});

//this is a get request for deleting a playlist
app.get("/playlist/delete/:playlistid", middleware.checkSignedIn, async (req, res) => {
	//check to see if the playlist belongs to the user
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.cookies.userinfo.id]);
	playlist = playlist.rows[0];

	//check to see if the playlist exists in the first place
	if (typeof playlist != 'undefined') { //if the playlist exists, then delete it
		//delete the playlist from the database
		await client.query(`DELETE FROM playlists WHERE id=$1`, [req.params.playlistid]);
		//delete any associated video ids from the playlistvideos table
		await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1`, [req.params.playlistid]);
		//redirect to the index along with a message that the playlist was deleted
		req.flash("message", "Playlist Deleted!");
		res.redirect("/");
	} else { //if the playlist does not exist or does not belong to the user, then render an error
		var viewObj = {user: req.cookies.userinfo, error: `Playlist with ID: ${playlist.id} is nonexistent or does not belong to you.`};
		res.render("error.ejs", viewObj);
	}
});





//delete a video
app.get("/v/delete/:videoid", middleware.checkSignedIn, async (req, res) => {
	//store the video to be deleted
	var video = await client.query(`SELECT thumbnail, video, user_id FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//create a path to the videos files
	var thumbnailpath = __dirname + "/storage" + video.thumbnail;
	var videopath = __dirname + "/storage" + video.video;

	//delete the video details before deleting the files in case of any error
	if (req.cookies.userinfo.id == video.user_id) { //did the user make this video?
		//delete the video details from the database
		await client.query(`DELETE FROM videos WHERE id=$1`, [req.params.videoid]);
		//delete the files associated with the videos
		fs.unlink(videopath, (err) => {
			if (err) throw err;
			console.log("Video File Deleted.");
		});
		fs.unlink(thumbnailpath, (err) => {
			if (err) throw err;
			console.log("Thumbnail Deleted.");
		});
		//redirect to the index page
		req.flash("message", "Deleted Video Details.");
		res.redirect("/");
	} else {
		//rerender the video page with a message that the video deletion didn't work
		req.flash("message", "Error: Could not delete video.");
		res.redirect(`/v/${req.params.videoid}`);
	}
});

//get request for the like button
app.get("/v/like/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE userid=$1 AND videoid=$2`, [req.cookies.userinfo.id, req.params.videoid]);

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE userid=$1 AND videoid=$2`, [req.cookies.userinfo.id, req.params.videoid]);

	//get the updated amount of likes and dislikes
	var data = await middleware.handleLikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});

//get request for the dislike button
app.get("/v/dislike/:videoid", middleware.checkSignedIn, async (req, res) => {
	//select the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE userid=$1 AND videoid=$2`, [req.cookies.userinfo.id, req.params.videoid]);

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE userid=$1 AND videoid=$2`, [req.cookies.userinfo.id, req.params.videoid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});





//get request for subscribing to a channel
app.get("/subscribe/:channelid", middleware.checkSignedIn, async (req, res) => {
	//get the subscribed channel from the database
	var channel = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.cookies.userinfo.id]);

	//get the amount of subscribers from the channel
	var subscriberscount = await client.query(`SELECT subscribers FROM users WHERE id=$1`, [req.params.channelid]);
	subscriberscount = parseInt(subscriberscount.rows[0].subscribers, 10);

	//check to see what to do to update the subscribed list
	if (channel.rows.length == 0) { //if the user has not subscribed to this channel yet, then add the user id and channel id into the database
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, req.cookies.userinfo.id]);
		//increase the amount of subscribers for the user
		await client.query(`UPDATE users SET subscribers=$1 WHERE id=$2`, [(subscriberscount + 1).toString(), req.params.channelid]);
		//update the user object inside the videos
		//send a response that is true, meaning that the user has subscribed
		res.send("true");
	} else if (channel.rows.length > 0) { //if the user has already subscribed to the channel, then the user wants to undo the subscription (a confirm in javascript will be done in the front end to check if the user clicked accidentally)
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.cookies.userinfo.id]);
		//decrease the amount of subscribers that the user has
		await client.query(`UPDATE users SET subscribers=$1 WHERE id=$2`, [(subscriberscount - 1).toString(), req.params.channelid]);
		//send a response that is false, meaning the user unsubscribed
		res.send("false");
	}
});





//get request for searching for videos
app.get("/search", async (req, res) => {
	//a search object to store things about our search
	var search = {};

	//store the query in a variable so that it will be easier to recall the variable
	var query = req.query.searchquery;

	//store the autocorrected search query inside the search object
	search.humanquery = query; //the original query
	search.lowerQuery = middleware.autoCorrect(query, true, false, false);
	search.titleQuery = middleware.autoCorrect(query, false, true, false);
	search.capsQuery = middleware.autoCorrect(query, false, false, true);

	//get the phrases/keywords from the query through the algorithm
	var phrases = middleware.getSearchTerms(search.humanquery);
	var lowerPhrases = middleware.getSearchTerms(search.lowerQuery);
	var titlePhrases = middleware.getSearchTerms(search.titleQuery);
	var capsPhrases = middleware.getSearchTerms(search.capsQuery);

	var totalphrases = phrases.concat(lowerPhrases);
	totalphrases = totalphrases.concat(titlePhrases);
	totalphrases = totalphrases.concat(capsPhrases);

	//add the results for the regular phrases into the results array
	var videos = await middleware.searchVideos(totalphrases);

	//get the channels that match the search terms
	var channels = await middleware.searchChannels(totalphrases);

	//get the playlists that match the search terms
	var playlists = await middleware.searchPlaylists(totalphrases);

	//store the array of video objects inside the search object
	search.videos = videos;
	search.channels = channels;
	search.playlists = playlists;

	console.log("Search: " + search.humanquery);

	viewObj = {search: search, message: req.flash("message")};

	//create the view object
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
	}

	res.render("searchresults.ejs", viewObj);
});





//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE userid=$1 AND commentid=$2`, [req.cookies.userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE userid=$1 AND commentid=$2`, [req.cookies.userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleLikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the likes and dislikes of the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});

//a get request for disliking a comment on the site
app.get("/comment/dislike/:commentid", middleware.checkSignedIn, async (req, res) => {
	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE userid=$1 AND commentid=$2`, [req.cookies.userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE userid=$1 AND commentid=$2`, [req.cookies.userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the amount of likes and dislikes on the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});





//this is a get request for sections of videos on the site
app.get("/s/:topic", async (req, res) => {
	//select all of the videos in the database with topics that include the topic in the link
	var videos = await client.query(`SELECT * FROM videos WHERE topics LIKE $1`, ["%" + req.params.topic + "%"]);
	videos = videos.rows;

	var viewObj = {videos: videos, sectionname: req.params.topic, message: req.flash("message")};

	//have a view object
	if (req.cookies.userinfo) {
		viewObj.user = req.cookies.userinfo;
	}

	//render the view for the section
	res.render("viewsection.ejs", viewObj);
});

//this is a get request to join a section of videos
app.get("/s/subscribe/:topic", middleware.checkSignedIn, async (req, res) => {
	//get the subscribed topic and the user id from the database to check for joining or unjoining
	var subscribed = await client.query(`SELECT * FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, req.cookies.userinfo.id]);
	subscribed = subscribed.rows;

	//check to see if the user is joined or not
	if (subscribed.length == 0) {
		//add the user and the topic to the subscribedtopics table
		await client.query(`INSERT INTO subscribedtopics (topicname, user_id) VALUES ($1, $2)`, [req.params.topic, req.cookies.userinfo.id]);
		//send a value that shows that the joining happened
		res.send("true");
	} else if (subscribed.length > 0) {
		//delete the user and the topic from the subscribedtopics table
		await client.query(`DELETE FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, req.cookies.userinfo.id]);
		//send a value that shows that the unjoining happened
		res.send("false");
	}
});
