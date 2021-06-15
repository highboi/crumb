const {app, client, middleware} = require("./configBasic");
const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");

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
	//set the object to be passed to the rendering function
	var viewObj = await middleware.getViewObj(req);

	//select the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.videoid]);
	video = video.rows[0];

	//get the video creator
	var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
	videocreator = videocreator.rows[0];

	//check to see that the video is not deleted or private before getting information that is not needed or does not exist
	if (!video.deleted && !video.private) {
		//get the resolutions possible for this video
		var resolutions = await client.query(`SELECT resolution FROM videofiles WHERE id=$1`, [req.params.videoid]);
		resolutions = resolutions.rows[0].resolution;

		//get the reccomendations for this video
		var reccomendations = await middleware.getReccomendations(req, video);

		//select the comments that belong to the video and order the comments by the amount of likes (most likes to least likes)
		var comments = await client.query(`SELECT * FROM comments WHERE video_id=$1 AND base_parent_id IS NULL ORDER BY likes DESC`, [req.params.videoid]);
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
			var userChatInfo = await client.query(`SELECT channelicon, username FROM users WHERE id=$1 LIMIT 1`, [item]);
			userChatInfo = userChatInfo.rows[0];

			//insert the channel icon and username into the object with the key being the user id
			chatMessageInfo[item] = userChatInfo;
		}));

		//map the chat replay messages to have both the original chat message object and the extra user info all in one object
		chatReplayMessages = chatReplayMessages.rows.map((item) => {
			return Object.assign({}, item, chatMessageInfo[item.user_id]);
		});

		//get the subtitles object according to the file of this video
		if (video.subtitles != null) {
			var subtitles = await middleware.getSubtitles(global.appRoot + "/storage" + video.subtitles);
		} else {
			var subtitles = video.subtitles;
		}

		//create the new view object with the new objects
		viewObj = Object.assign({}, viewObj, {video: video, reccomendations: reccomendations, videocreator: videocreator, approx: approx, comments: comments, resolutions: resolutions, subtitles: subtitles});

		//check to see if there are any chat messages to replay
		if (chatReplayMessages.length > 0) {
			viewObj.chatReplayMessages = chatReplayMessages;
		}

		//render the video view based on whether or not the user is logged in and has a session variable
		if (req.cookies.sessionid) {
			var subscribed = await client.query(`SELECT EXISTS(SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2 LIMIT 1)`, [videocreator.id, viewObj.user.id]);
			viewObj.subscribed = subscribed.rows[0].exists;
		}

		//check to see if the video needs to scroll down to a comment that was just posted
		if (req.query.scrollToComment == "true" && typeof req.query.commentid != 'undefined') {
			//tell the EJS logic to scroll to a comment
			viewObj.scrollToComment = true;

			//get the comment id into the view object
			viewObj.scrollCommentId = req.query.commentid;

			//get the base parent id for this comment to scroll to
			var comment = await client.query(`SELECT base_parent_id FROM comments WHERE id=$1 LIMIT 1`, [viewObj.scrollCommentId]);
			var base_parent_id = comment.rows[0].base_parent_id;

			//store the base parent id into the view object for processing
			viewObj.scrollCommentBaseId = base_parent_id;
		}
	} else {
		viewObj = Object.assign({}, viewObj, {video: video, videocreator: videocreator});
	}

	//render the view
	res.render("viewvideo.ejs", viewObj);
});

//get the video data from the file in chunks for efficiency of the network
app.get("/video/:id", async (req, res) => {
	//get the video file from the supposed video id (might be a comment id)
	var videopath = await client.query(`SELECT video FROM videofiles WHERE id=$1 LIMIT 1`, [req.params.id]);
	videopath = "./storage" + videopath.rows[0].video;

	//get the query parameters just in case there are special needs for speed or resolution requirements
	var resolution = req.query.res;

	//change the filename in the video file path to match the file with the matching resolution
	if (typeof resolution != 'undefined' && resolution != "original") {
		//get the file extention
		videoext = path.extname(videopath);

		//replace the file extention with the defining name change followed by the file extention again
		videopath = videopath.replace(videoext, `(${resolution}p)` + videoext);
	}

	//get the extension of the video for the content type of the response
	var contentType = path.extname(videopath).slice(1);
	contentType = `video/${contentType}`;

	//get information about the file
	const stat = fs.statSync(videopath);
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
		const file = fs.createReadStream(videopath, {start, end});
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

//an AJAX request path to increase the video view amount for a video id
app.get("/video/incviews/:videoid", async (req, res) => {
	//increase the video entry for the video with the id in the url
	await client.query(`UPDATE videos SET views=views+1 WHERE id=$1`, [req.params.videoid]);

	//send a success message to the client
	res.send(true);
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
		var video = await client.query("SELECT * FROM videos WHERE deleted=false AND private=false AND UPPER(topics) LIKE UPPER($1) ORDER BY RANDOM() LIMIT 1", ["% " + req.query.type + " %"]);
		video = video.rows[0];
	}

	//a video was found
	if (typeof video != 'undefined') {
		//get the creator of the video
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
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
	var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.videoid]);
	video = video.rows[0];

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userinfo.id, req.params.videoid]);

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userinfo.id, req.params.videoid]);

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
	var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.videoid]);
	video = video.rows[0];

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM dislikedVideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userinfo.id, req.params.videoid]);

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM likedVideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userinfo.id, req.params.videoid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, video, liked, disliked, "likedVideos", "dislikedVideos");

	await client.query(`UPDATE videos SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.videoid]);

	res.send(data);
});

/*
POST PATHS FOR VIDEOS/MEDIA
*/

//store the submitted video to the database
app.post("/v/submit", async (req, res) => {
	//get the user information
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the mime types of the two files
	var videotype = req.files.video.mimetype;
	var thumbtype = req.files.thumbnail.mimetype;

	//make arrays which contain the accepted types for image and video files
	var acceptedvideo = ["video/mp4", "video/ogg", "video/webm"];
	var acceptedthumbnail = ["image/png", "image/jpeg", "image/jpg"];

	//if the video has an mp4, ogg, or webm extension and the thumbnail is a png, jpeg or jpg image, load the video
	if ( (acceptedvideo.includes(videotype)) && (acceptedthumbnail.includes(thumbtype)) ) {
		//store the video file submitted
		var videopath = await middleware.saveFile(req.files.video, "/storage/videos/files/");

		//store the thumbnail file submitted
		var thumbnailpath = await middleware.saveFile(req.files.thumbnail, "/storage/videos/thumbnails/");

		//if there is an SRT file submitted for subtitles and the file is indeed an SRT file (mimetype), save this
		if (typeof req.files.subtitles != 'undefined' && req.files.subtitles.mimetype == "application/x-subrip") {
			var subtitlepath = await middleware.saveFile(req.files.subtitles, "/storage/videos/subtitles");
		} else if (req.files.subtitles.mimetype != 'application/x-subrip') {
			req.flash("message", "Unsupported file type for subtitles, please use SRT formatted files.");
			res.redirect("/v/submit");
		} else {
			var subtitlepath = "";
		}

		//store the video details for later reference

		//generate a unique video id for each video (await the result of this function)
		var videoid = await middleware.generateAlphanumId();

		//the array to contain the values to insert into the db
		var valuesArr = [videoid, req.body.title, req.body.description, thumbnailpath, videopath, userinfo.id, 0, new Date().toISOString(), " " + req.body.topics + " ", userinfo.username, userinfo.channelicon, false, req.body.private, subtitlepath];

		//load the video into the database
		await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, private, subtitles) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, valuesArr);

		//insert the video file paths into the db
		await client.query(`INSERT INTO videofiles (id, thumbnail, video) VALUES ($1, $2, $3)`, [videoid, thumbnailpath, videopath]);

		//create all permutations of the video file path
		await middleware.getVideoPermutations(global.appRoot + "/storage" + videopath);

		//change the video count on the user db entry
		await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [userinfo.id]);

		//redirect the user to their video
		res.redirect(`/v/${videoid}`); //redirect to the url
	} else if (!(thumbtype in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
		req.flash("message", "Unsupported file type for thumbnail, please use png, jpeg or jpg.");
		res.redirect("/v/submit");
	} else if (!(videotype in acceptedvideo)) { //if the video file types are not supported, then show errors
		req.flash("Unsupported file type for video, please use mp4, ogg, or webm.");
		res.redirect("/v/submit");
	}
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
