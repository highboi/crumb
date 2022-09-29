const {app, client, middleware} = require("./configBasic");
const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");

/*
GET PATHS FOR VIDEOS/MEDIA
*/

//get the form for submitting videos
app.get("/v/submit", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);
	return res.render("submitvideo.ejs", viewObj);
});

//views individual videos on the site
app.get("/v/:videoid", async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.videoid]);
	video = video.rows[0];

	if (!video.deleted && !video.private) {
		var videoInfo = await middleware.getVideoInfo(video);

		var reccomendations = await middleware.getReccomendations(req, video);

		viewObj = Object.assign({}, viewObj, {video: video, reccomendations: reccomendations, approx: approx}, videoInfo);

		if (viewObj.user) {
			var subscribed = await client.query(`SELECT EXISTS(SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2 LIMIT 1)`, [viewObj.videocreator.id, viewObj.user.id]);
			viewObj.subscribed = subscribed.rows[0].exists;
		}

		if (typeof req.query.scrollcommentid != 'undefined') {
			viewObj.scrollCommentId = req.query.scrollcommentid;

			var comment = await client.query(`SELECT id FROM comments WHERE id=$1 LIMIT 1`, [viewObj.scrollCommentId]);

			if (comment.rows.length) {
				viewObj.scrollCommentBaseId = comment.rows[0].id;
			} else {
				delete viewObj.scrollCommentId;
			}
		}

		await client.query(`UPDATE videos SET views=views+1 WHERE id=$1`, [video.id]);
	} else {
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
		videocreator = videocreator.rows[0];

		viewObj = Object.assign({}, viewObj, {video: video, videocreator: videocreator});
	}

	return res.render("viewvideo.ejs", viewObj);
});

//get the video data from the file in chunks for efficiency of the network
app.get("/video/:id", async (req, res) => {
	var videopath = await client.query(`SELECT video FROM videofiles WHERE id=$1 LIMIT 1`, [req.params.id]);
	videopath = "./storage" + videopath.rows[0].video;

	var resolution = req.query.res;

	if (typeof resolution != 'undefined' && resolution != "original") {
		videoext = path.extname(videopath);

		videopath = videopath.replace(videoext, `(${resolution}p)` + videoext);
	}

	var contentType = path.extname(videopath).slice(1);
	contentType = `video/${contentType}`;

	/*
	get the file size and the range from the headers if there is one. the range
	will indicate which part of a given file to deliver as a response
	*/
	var stat = fs.statSync(videopath);
	var fileSize = stat.size;
	var range = req.headers.range;

	//check to see if there is a range in the headers or not
	if (range) {
		//the range is a string formatted like this: "bytes=0-1000", get the starting and ending parts
		var parts = range.replace(/bytes=/, "").split("-");
		var start = parseInt(parts[0], 10);
		var end = parts[1] ? parseInt(parts[1], 10) : fileSize-1; //ternary operator checks for the existence of a second part of the range

		var chunksize = (end-start)+1

		var file = fs.createReadStream(videopath, {start, end});

		var head = {
			'Content-Range': `bytes ${start}-${end}/${fileSize}`,
			'Accept-Ranges': 'bytes',
			'Content-Length': chunksize,
			'Content-Type': contentType
		}

		res.writeHead(206, head);

		file.pipe(res);
	} else {
		var head = {
			'Content-Length': fileSize,
			'Content-Type': contentType
		}

		res.writeHead(200, head)

		fs.createReadStream(videopath).pipe(res)
	}
});

//delete a video
app.get("/v/delete/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var result = await middleware.deleteVideoDetails(userinfo.id, req.params.videoid);

	if (result) {
		req.flash("message", "Deleted Video Details.");
		return res.redirect("/");
	} else {
		req.flash("message", "Error: Could not delete video, user information does not match or video does not exist.");
		req.flash("redirecturl", `/v/${req.params.videoid}`);
		return res.redirect("/error");
	}
});

//this is a get path for the TV/Random video feature on the site
app.get("/tv", async (req, res) => {
	var types = ["meme", "funny", "short", "gaming", "satisfying", "crime", "documentaries", "news", "horror", "conspiracy"];

	if (typeof req.query.type == 'undefined') {
		var video = await client.query("SELECT * FROM videos WHERE deleted=false AND private=false ORDER BY RANDOM() LIMIT 1");
		video = video.rows[0];
	} else {
		var typelist = req.query.type.split(" ");

		var finaltype = typelist[Math.floor(Math.random() * typelist.length)];

		var video = await client.query("SELECT * FROM videos WHERE deleted=false AND private=false AND UPPER(topics) LIKE UPPER($1) ORDER BY RANDOM() LIMIT 1", ["%" + finaltype + "%"]);
		video = video.rows[0];
	}

	if (typeof video != 'undefined') {
		var viewObj = await middleware.getViewObj(req, res);

		viewObj.video = video;
		viewObj.types = types;

		return res.render("tv.ejs", viewObj);
	} else {
		req.flash("message", `No videos found for \"${req.query.type}\", here's a random video!`);

		return res.redirect("/tv");
	}
});

//get request for the like button
app.get("/v/like/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var data = await middleware.likeVideo(userinfo.id, req.params.videoid);

	return res.send(data);
});

//get request for the dislike button
app.get("/v/dislike/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var data = await middleware.dislikeVideo(userinfo.id, req.params.videoid);

	return res.send(data);
});

/*
POST PATHS FOR VIDEOS/MEDIA
*/

//store the submitted video to the database
app.post("/v/submit", async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var videopath = await middleware.saveFile(req.files.video, "/storage/videos/files/");
	var thumbnailpath = await middleware.saveFile(req.files.thumbnail, "/storage/videos/thumbnails/");

	if (typeof req.files.subtitles != 'undefined') {
		if (req.files.subtitles.mimetype == "application/x-subrip") {
			var subtitlepath = await middleware.saveFile(req.files.subtitles, "/storage/videos/subtitles/");
		} else {
			req.flash("message", "Unsupported file type for subtitles, please use SRT formatted files.");
			req.flash("redirecturl", "/v/submit");
			return res.redirect("/error");
		}
	} else {
		var subtitlepath = "";
	}

	var videoid = await middleware.generateAlphanumId();

	var valuesarr = [videoid, req.body.title, req.body.description, thumbnailpath, videopath, userinfo.id, new Date().toISOString(), " " + req.body.topics + " ", userinfo.username, userinfo.channelicon, req.body.private, subtitlepath];
	valuesarr = valuesarr.map((item) => {
		if (typeof item == "string") {
			return "\'" + item + "\'";
		} else {
			return item;
		}
	});

	await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, posttime, topics, username, channelicon, private, subtitles) VALUES (${valuesarr})`);
	await client.query(`INSERT INTO videofiles (id, thumbnail, video) VALUES ($1, $2, $3)`, [videoid, thumbnailpath, videopath]);

	await middleware.getVideoPermutations(global.appRoot + "/storage" + videopath);

	await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [userinfo.id]);

	return res.redirect(`/v/${videoid}`);
});
