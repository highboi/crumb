const {app, client, middleware} = require("./configBasic");
const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");
const formidable = require("formidable");

/*
GET PATHS FOR VIDEOS/MEDIA
*/

//get the form for submitting videos
app.get("/v/submit", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req);
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

	//select the comments that belong to the video and order the comments by the amount of likes (most likes to least likes)
	var comments = await client.query(`SELECT * FROM comments WHERE video_id=$1 ORDER BY likes DESC`, [req.params.videoid]);
	comments = comments.rows;

	//select all of the chat messages that were typed if this was a live stream
	var chatReplayMessages = await client.query(`SELECT * FROM livechat WHERE stream_id=$1`, [req.params.videoid]);

	//get all of the user ids from the live chat and remove duplicates by putting them in a set
	var chatUserIds = chatReplayMessages.rows.map((item) => {
		return item.user_id;
	});
	chatUserIds = [...new Set(chatUserIds)];

	//put the channel icons and usernames associated with the user ids above into an object
	var chatMessageInfo = {};

	//use the .map() method with async function to iterate over promises which are passed to Promise.all(),
	//which can then be "awaited" on to finish/complete all promises being iterated before proceeding
	await Promise.all(chatUserIds.map(async (item) => {
		//get the channel icon and username if this user with this id
		var userChatInfo = await client.query(`SELECT channelicon, username FROM users WHERE id=$1`, [item]);
		userChatInfo = userChatInfo.rows[0];

		//insert the channel icon and username into the object with the key being the user id
		chatMessageInfo[item] = userChatInfo;
	}));

	//map the chat replay messages to have both the original chat message object and the extra user info all in one object
	chatReplayMessages = chatReplayMessages.rows.map((item) => {
		return Object.assign({}, item, chatMessageInfo[item.user_id]);
	});

	//set the object to be passed to the rendering function
	var viewObj = await middleware.getViewObj(req);
	viewObj = Object.assign({}, viewObj, {video: video, videos: videos, videocreator: videocreator, approx: approx, comments: comments});

	//check to see if there are any chat messages to replay
	if (chatReplayMessages.length > 0) {
		viewObj.chatReplayMessages = chatReplayMessages;
	}

	//render the video view based on whether or not the user is logged in and has a session variable
	if (req.cookies.sessionid) {
		var subscribed = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [videocreator.id, viewObj.user.id]);
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
	//get the video file from the supposed video id (might be a comment id)
	var path = await client.query(`SELECT video FROM videofiles WHERE id=$1`, [req.params.id]);
	path = "./storage" + path.rows[0].video;

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
		const file = fs.createReadStream(path, {start, end});
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

//delete a video
app.get("/v/delete/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get user from session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the result of deleting the video details
	var result = await middleware.deleteVideoDetails(userinfo, req.params.videoid);

	//check to see if the deletion of the video was a success
	if (result) {
		//redirect to the index page
		req.flash("message", "Deleted Video Details.");
		res.redirect("/");
	} else {
		//rerender the video page with a message that the video deletion didn't work
		req.flash("message", "Error: Could not delete video.");
		res.redirect(`/v/${req.params.videoid}`);
	}
});

//this is a get path to set the magnet link for a video if there are no peers/seeders for a file
app.get("/setmagnet/:id", async (req, res) => {
	console.log("SETTING MAGNET:", req.query.magnet);

	try {
		//set the new magnetlink to the video in the database
		await client.query(`UPDATE videos SET magnetlink=$1 WHERE id=$2`, [req.query.magnet, req.params.id]);

		//send a response of "true" to let the client know that we have successfully updated the magnet link status
		res.send("true");
	} catch(e) {
		//console log the error
		console.log(e);

		//send a response of "false" back to the client
		res.send("false");
	}
});

//this is a get path for the TV/Random video feature on the site
app.get("/tv", async (req, res) => {
	//create a view object
	var viewObj = {};

	//create an array for the basic "types" of videos to search for
	var types = ["meme", "funny", "short", "gaming", "satisfying", "crime", "documentaries", "news", "horror", "conspiracy"];

	//check the query parameters for showing the user specific stuff
	if (typeof req.query.type == 'undefined') { //if the user is going to the TV link for the first time this session
		//get a random video from the database
		var video = await client.query("SELECT * FROM videos ORDER BY RANDOM() LIMIT 1");
		video = video.rows[0];
	} else { //if the user wanted a specific type of video/channel by clicking the buttons on the "remote"
		//select a video from the database that includes this topic (of course select this randomly)
		var video = await client.query("SELECT * FROM videos WHERE UPPER(topics) LIKE UPPER($1) ORDER BY RANDOM() LIMIT 1", ["%" + req.query.type + "%"]);
		video = video.rows[0];
	}

	//a video was found
	if (typeof video != 'undefined') {
		//get the creator of the video
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1`, [video.user_id]);
		videocreator = videocreator.rows[0];

		//get the view object
		var viewObj = await middleware.getViewObj(req);

		//insert the necessary elements into the view object
		viewObj.video = video;
		viewObj.types = types;
		viewObj.videocreator = videocreator;

		//render the view
		res.render("tv.ejs", viewObj);
	} else { //there was no video found to show the user
		//let the user know that there are no videos in this category and show a random video
		req.flash("message", `No videos found for \"${req.query.type}\", here's a random video!:`);

		//redirect to the same /tv url to get a truly random video
		res.redirect("/tv");
	}
});

//delete a video
app.get("/v/delete/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get user from session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the result of deleting the video details
	var result = await middleware.deleteVideoDetails(userinfo, req.params.videoid);

	//check to see if the deletion of the video was a success
	if (result) {
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
	//get user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE user_id=$1 AND video_id=$2`, [userinfo.id, req.params.videoid]);

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE user_id=$1 AND video_id=$2`, [userinfo.id, req.params.videoid]);

	//get the updated amount of likes and dislikes
	var data = await middleware.handleLikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});

//get request for the dislike button
app.get("/v/dislike/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//select the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE user_id=$1 AND video_id=$2`, [userinfo.id, req.params.videoid]);

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE user_id=$1 AND video_id=$2`, [userinfo.id, req.params.videoid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});

/*
POST PATHS FOR VIDEOS/MEDIA
*/

//store the submitted video to the database
app.post("/v/submit", (req, res) => {
	//get the form
	var form = new formidable.IncomingForm();

	//parse the form and store the files
	form.parse(req, async (err, fields, files) => {
		//get user from redis
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		//get the video and thumbnail file types to be checked (file upload vuln)
		var videotype = files.video.type;
		var thumbtype = files.thumbnail.type;

		//make arrays of accepted file types
		var acceptedvideo = ["video/mp4", "video/ogg", "video/webm"];
		var acceptedthumbnail = ["image/png", "image/jpeg", "image/jpg"];

		//if the video has an mp4, ogg, or webm extension and the thumbnail is a png, jpeg or jpg image, load the video
		if ( (acceptedvideo.includes(videotype)) && (acceptedthumbnail.includes(thumbtype)) ) {
			//store the video file submitted
			var videopath = await middleware.saveFile(files.video, "/storage/videos/files/");

			//store the thumbnail file submitted
			var thumbnailpath = await middleware.saveFile(files.thumbnail, "/storage/videos/thumbnails/");

			//store the video details for later reference

			//generate a unique video id for each video (await the result of this function)
			var videoid = await middleware.generateAlphanumId();

			//the array to contain the values to insert into the db
			var valuesArr = [videoid, fields.title, fields.description, thumbnailpath, videopath, userinfo.id, 0, new Date().toISOString(), fields.topics, userinfo.username, userinfo.channelicon, false];

			//load the video into the database
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, valuesArr);

			//insert the video file paths into the db
			await client.query(`INSERT INTO videofiles (id, thumbnail, video) VALUES ($1, $2, $3)`, [videoid, thumbnailpath, videopath]);

			//change the video count on the user db entry
			await client.query(`UPDATE users SET videos=$1 WHERE id=$2`, [userinfo.videos+1, userinfo.id]);

			//redirect the user to their video
			var videourl = `/v/${videoid}`; //get the url to redirect to now that the video has been created
			res.redirect(videourl); //redirect to the url
		} else if (!(thumbtype in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
			req.flash("message", "Unsupported file type for thumbnail, please use png, jpeg or jpg.");
			res.redirect("/v/submit");
		} else if (!(videotype in acceptedvideo)) { //if the video file types are not supported, then show errors
			req.flash("Unsupported file type for video, please use mp4, ogg, or webm.");
			res.redirect("/v/submit");
		}
	});
});

//this is a post path to set the magnet link for a video if there are no peers/seeders for a file
app.post("/setmagnet/:id", async (req, res) => {
	console.log("SETTING MAGNET:", req.body.magnet);

	//try catch for the query
	try {
		//set the new magnetlink to the video in the database
		await client.query(`UPDATE videos SET magnetlink=$1 WHERE id=$2`, [req.body.magnet, req.params.id]);

		//send a response of "true" to let the client know that we have successfully updated the magnet link status
		res.send("true");
	} catch(e) {
		//console log the error
		console.log(e);

		//send a response of "false" back to the client
		res.send("false");
	}
});
