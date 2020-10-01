//this is a file to handle all of the get requests for the server

const { app, client, middleware, PORT, viewObject, server, wss} = require("./configBasic");

const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");
const {v4: uuidv4} = require("uuid");
const WebSocket = require("ws");

//calculate the amount of hits on the site
app.use(middleware.hitCounter);

//get the index of the site working
app.get('/', async (req, res) => {
	//select all of the videos from the database to be displayed
	var videos = await client.query("SELECT * FROM videos LIMIT 50");
	videos = videos.rows;

	//select all of the playlists in the database that belong to the user if they are signed in
	if (req.session.user) {
		var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [req.session.user.id]);
		playlists = playlists.rows;
		//object for the view with the playlists included
		var viewObj = Object.assign({}, viewObject, {message: req.flash("message"), videos: videos, playlists: playlists});
	} else {
		//create an object for the view
		var viewObj = Object.assign({}, viewObject, {message: req.flash("message"), videos: videos});
	}

	//render the view
	res.render("index.ejs", viewObj);
});

//get the registration page
app.get('/register', middleware.checkNotSignedIn, (req, res) => {
	var viewObj = Object.assign({}, viewObject, {message: req.flash("message")});
	res.render("register.ejs", viewObj);
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, (req, res) => {
	var viewObj = Object.assign({}, viewObject, {message: req.flash("message")});
	res.render("login.ejs", viewObj);
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
	req.session.user = null;
	delete viewObject.user;
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
	viewObj = Object.assign({}, viewObject, viewObj);

	//render the view
	res.render("viewchannel.ejs", viewObj);
});

//get the form for submitting videos
app.get("/v/submit", middleware.checkSignedIn, (req, res) => {
	var viewObj = Object.assign({}, viewObject, {message: req.flash("message")});
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

	//set the object to be passed to the rendering function
	var viewObj = {video: video, videos: videos, videocreator: videocreator, approx: approx, comments: comments};

	//render the video view based on whether or not the user is logged in and has a session variable
	if (req.session.user) {
		viewObj.user = req.session.user;
		var subscribed = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [videocreator.id, req.session.user.id]);
		viewObj.subscribed = subscribed.rows.length;
	}

	//check to see if the video needs to scroll down to a comment that was just posted
	if (req.query.scrollToComment == "true" && typeof req.query.commentid != 'undefined') {
		viewObj.scrollToComment = true;
		viewObj.commentid = req.query.commentid;
	}

	viewObj.message = req.flash("message");

	viewObj = Object.assign({}, viewObject, viewObj);

	res.render("viewvideo.ejs", viewObj);
});

app.get("/l/view/:streamid", (req, res) => {
	//create a view object with a specific
	var viewObj = Object.assign({}, viewObject);

	//isolate the websocket with the livestream id in the url
	var streams = Array.from(wss.clients).filter((socket) => {
		return typeof socket.streamid != 'undefined';
	}).filter((socket) => {
		return socket.streamid == req.params.streamid;
	});

	//if there are no streams with the id in the url, then redirect to an error
	if (streams.length == 0) {
		res.render("error.ejs", {error: `Stream with ID: '${req.params.streamid}' does not exist.`});
	}

	//check for connections to the server
	wss.on("connection", (ws) => {
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
});

//this is a get request to get basic info about a live stream
app.get("/l/start", middleware.checkSignedIn, (req, res) => {
	var viewObj = Object.assign({}, viewObject);

	res.render("startstream.ejs", viewObj);
});

//this is a get request to start streaming on the site
app.get("/l/stream", middleware.checkSignedIn, (req, res) => {
	//this is a view object
	var viewObj = Object.assign({}, viewObject, {streamname: req.query.name, enableChat: req.query.enableChat});

	var streamid = uuidv4();

	console.log("Stream Id: " + streamid);

	wss.on("connection", (ws) => {
		//set the stream id for this socket
		ws.streamid = streamid;

		//a data buffer to store the video data for later, store this inside
		//the websocket in order to be able to access it from other websockets
		ws.dataBuffer = [];

		//create a file stream for saving the contents of the live stream
		var fileName = "./storage/videos/files/" + Date.now() + "-" + req.query.name + ".webm";
		var writeStream = fs.createWriteStream(fileName);

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
			var clients = Array.from(wss.clients).filter((socket) => {
				return socket.room == streamid;
			}).filter((socket) => {
				return socket.readyState == WebSocket.OPEN;
			});

			//send the new data to each of the corresponding clients
			clients.forEach((item, index) => {
				item.send(message);
			});
		});

		//whenever the websocket closes, close the write stream to the file as well
		ws.on("close", () => {
			console.log("Stream Viewer Disconnected.");
			writeStream.end();
		});
	});

	//render the view for starting a stream
	res.render("stream.ejs", viewObj);
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
	viewObj = Object.assign({}, viewObject, viewObj);

	//render the view for the playlist
	res.render("viewplaylist.ejs", viewObj);
});

//this is a get path for adding videos to playlists on the site
app.get("/playlistvideo/add/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.session.user.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see if the video is in the playlist already
	if (typeof playlistvideo != 'undefined') { //if the video has already been added, then render an error
		var viewObj = Object.assign({}, viewObject, {error: "Video has already been added to the playlist."});
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
			var viewObj = Object.assign({}, viewObject, {error: "This playlist does not belong to you."});
			res.render("error.ejs", viewObj);
		}
	}
});

//this is a get path for deleting videos from playlists on the site
app.get("/playlistvideo/delete/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.session.user.id]);
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
			var viewObj = Object.assign({}, viewObject, {error: "Playlist does not belong to you."});
			res.render("error.ejs", viewObj);
		}
	} else { //if the video is not in the playlist, then render an error
		var viewObj = Object.assign({}, viewObject, {error: `Video with ID: ${playlistvideo.video_id} not in playlist.`});
		res.render("error.ejs", viewObj);
	}
});

//this is a get request for creating a new playlist
app.get("/playlist/new", middleware.checkSignedIn, async (req, res) => {
	if (typeof req.query.videoid != 'undefined') {
		var viewObj = Object.assign({}, viewObject, {videoid: req.query.videoid});
	} else {
		var viewObj = Object.assign({}, viewObject);
	}
	//render the form for creating a new playlist
	res.render("createplaylist.ejs", viewObj);
});

//this is a get request for deleting a playlist
app.get("/playlist/delete/:playlistid", middleware.checkSignedIn, async (req, res) => {
	//check to see if the playlist belongs to the user
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, req.session.user.id]);
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
		var viewObj = Object.assign({}, viewObject, {error: `Playlist with ID: ${playlist.id} is nonexistent or does not belong to you.`});
		res.render("error.ejs", viewObj);
	}
});

//delete a video
app.get("/v/delete/:videoid", async (req, res) => {
	//store the video to be deleted
	var video = await client.query(`SELECT thumbnail, video, user_id FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//create a path to the videos files
	var thumbnailpath = __dirname + "/storage" + video.thumbnail;
	var videopath = __dirname + "/storage" + video.video;

	//delete the video details before deleting the files in case of any error
	if (req.session.user.id == video.user_id) { //did the user make this video?
		//delete the video details from the database
		await client.query(`DELETE FROM videos WHERE id=$1`, [req.params.videoid]);
		//delete the files associated with the videos
		fs.unlink(videopath, (err) => {
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
		req.flash("message", "Could not delete video for some reason.");
		res.redirect(`/v/${req.params.videoid}`);
	}
});

//get request for the like button
app.get("/v/like/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

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
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});

//get request for subscribing to a channel
app.get("/subscribe/:channelid", middleware.checkSignedIn, async (req, res) => {
	//get the subscribed channel from the database
	var channel = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.session.user.id]);

	//get the amount of subscribers from the channel
	var subscriberscount = await client.query(`SELECT subscribers FROM users WHERE id=$1`, [req.params.channelid]);
	subscriberscount = parseInt(subscriberscount.rows[0].subscribers, 10);

	//check to see what to do to update the subscribed list
	if (channel.rows.length == 0) { //if the user has not subscribed to this channel yet, then add the user id and channel id into the database
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, req.session.user.id]);
		//increase the amount of subscribers for the user
		await client.query(`UPDATE users SET subscribers=$1 WHERE id=$2`, [(subscriberscount + 1).toString(), req.params.channelid]);
		//update the user object inside the videos
		//send a response that is true, meaning that the user has subscribed
		res.send("true");
	} else if (channel.rows.length > 0) { //if the user has already subscribed to the channel, then the user wants to undo the subscription (a confirm in javascript will be done in the front end to check if the user clicked accidentally)
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.session.user.id]);
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

	//create the view object
	viewObj = Object.assign({}, viewObject, {search: search});

	res.render("searchresults.ejs", viewObj);
});

//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE userid=$1 AND commentid=$2`, [req.session.user.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE userid=$1 AND commentid=$2`, [req.session.user.id, req.params.commentid]);

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
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE userid=$1 AND commentid=$2`, [req.session.user.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE userid=$1 AND commentid=$2`, [req.session.user.id, req.params.commentid]);

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

	//have a view object
	var viewObj = Object.assign({}, viewObject, {videos: videos, sectionname: req.params.topic});

	//render the view for the section
	res.render("viewsection.ejs", viewObj);
});

//this is a get request to join a section of videos
app.get("/s/subscribe/:topic", middleware.checkSignedIn, async (req, res) => {
	//get the subscribed topic and the user id from the database to check for joining or unjoining
	var subscribed = await client.query(`SELECT * FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, req.session.user.id]);
	subscribed = subscribed.rows;

	//check to see if the user is joined or not
	if (subscribed.length == 0) {
		//add the user and the topic to the subscribedtopics table
		await client.query(`INSERT INTO subscribedtopics (topicname, user_id) VALUES ($1, $2)`, [req.params.topic, req.session.user.id]);
		//send a value that shows that the joining happened
		res.send("true");
	} else if (subscribed.length > 0) {
		//delete the user and the topic from the subscribedtopics table
		await client.query(`DELETE FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, req.session.user.id]);
		//send a value that shows that the unjoining happened
		res.send("false");
	}
});
