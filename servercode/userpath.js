const {app, client, middleware} = require("./configBasic");
const formidable = require("formidable");
const path = require("path");

/*
GET PATHS FOR USER-RELATED CONTENT
*/

//view the channel of the user
app.get("/u/:userid", async (req, res) => {
	//get the base view object
	var viewObj = await middleware.getViewObj(req);

	//get the actual user that the channel belongs to
	var creator = await client.query(`SELECT * FROM users WHERE id=$1`, [req.params.userid]);

	//put the creator into the view object
	viewObj.creator = creator.rows[0];

	//get any variables from the query string in order to render the right things
	if (typeof req.query.section != 'undefined') {
		//add the section that the user wants to see in the channel page
		viewObj.section = req.query.section;
	} else {
		//the default section is the home page
		viewObj.section = "home";
	}

	//add the videos to the view object if the videos exist on the channel and if the section actually needs the videos to be sent with the view
	switch(viewObj.section) {
		case "home":
			var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1 ORDER BY views DESC LIMIT 10`, [req.params.userid]);
			viewObj.videos = videos.rows;
			break;
		case "videos":
			var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1`, [req.params.userid]);
			viewObj.videos = videos.rows;
			break;
		case "playlists":
			var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [req.params.userid]);
			viewObj.playlists = playlists.rows;
			break;
		case "shoutouts":
			var shoutouts = await client.query(`SELECT * FROM shoutouts WHERE user_id=$1`, [req.params.userid]);
			viewObj.shoutouts = shoutouts.rows;
			break;
	}

	//render the view
	res.render("viewchannel.ejs", viewObj);
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

	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//create view object to pass into the view
	viewObj = Object.assign({}, viewObj, {creator: creator, videos: videos, playlist: playlist});

	//render the view for the playlist
	res.render("viewplaylist.ejs", viewObj);
});

//this is a get path for adding videos to playlists on the site
app.get("/playlistvideo/add/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user info from the session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see if the video is in the playlist already
	if (typeof playlistvideo != 'undefined') { //if the video has already been added, then render an error
		req.flash("message", "Video has already been added to the playlist.");
		res.redirect("/error");
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
			req.flash("message", "This playlist does not belong to you.");
			res.redirect("/error");
		}
	}
});

//this is a get path for deleting videos from playlists on the site
app.get("/playlistvideo/delete/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user from the session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
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
			req.flash("message", "Playlist does not belong to you.")
			res.redirect("/error");
		}
	} else { //if the video is not in the playlist, then render an error
		req.flash("message", `Video with ID: ${playlistvideo.video_id} not in playlist.`);
		res.redirect("/error");
	}
});

//this is a get request for creating a new playlist
app.get("/playlist/new", middleware.checkSignedIn, async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//insert the video id to insert into the playlist on creation
	if (typeof req.query.videoid != 'undefined') {
		viewObj.videoid = req.query.videoid;
	}

	//render the form for creating a new playlist
	res.render("createplaylist.ejs", viewObj);
});

//this is a get request for deleting a playlist
app.get("/playlist/delete/:playlistid", middleware.checkSignedIn, async (req, res) => {
	//get the user from the session store once again
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//check to see if the playlist belongs to the user
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
	playlist = playlist.rows[0];

	//check to see if the playlist exists in the first place
	if (typeof playlist != 'undefined' && playlist.candelete) { //if the playlist exists and is allowed to be deleted, then delete it
		//delete the playlist from the database
		await client.query(`DELETE FROM playlists WHERE id=$1`, [req.params.playlistid]);
		//delete any associated video ids from the playlistvideos table
		await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1`, [req.params.playlistid]);
		//redirect to the index along with a message that the playlist was deleted
		req.flash("message", "Playlist Deleted!");
		res.redirect("/");
	} else if (typeof playlist != 'undefined' && !playlist.candelete) {
		//reload the playlist and say that the playlist cannot be deleted
		req.flash("message", "Playlist cannot be deleted, it is a default.");
		res.redirect(`/p/${playlist.id}`);
	} else { //if the playlist does not exist or does not belong to the user, then render an error
		req.flash("message", `Playlist with ID: ${playlist.id} is nonexistent or does not belong to you.`);
		res.redirect("/error");
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

//get request for subscribing to a channel
app.get("/subscribe/:channelid", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the subscribed channel from the database
	var channel = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, userinfo.id]);

	//get the amount of subscribers from the channel
	var subscriberscount = await client.query(`SELECT subscribers FROM users WHERE id=$1`, [req.params.channelid]);
	subscriberscount = parseInt(subscriberscount.rows[0].subscribers, 10);

	//check to see what to do to update the subscribed list
	if (channel.rows.length == 0) { //if the user has not subscribed to this channel yet, then add the user id and channel id into the database
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, userinfo.id]);
		//increase the amount of subscribers for the user
		await client.query(`UPDATE users SET subscribers=$1 WHERE id=$2`, [(subscriberscount + 1).toString(), req.params.channelid]);
		//update the user object inside the videos
		//send a response that is true, meaning that the user has subscribed
		res.send("true");
	} else if (channel.rows.length > 0) { //if the user has already subscribed to the channel, then the user wants to undo the subscription (a confirm in javascript will be done in the front end to check if the user clicked accidentally)
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, userinfo.id]);
		//decrease the amount of subscribers that the user has
		await client.query(`UPDATE users SET subscribers=$1 WHERE id=$2`, [(subscriberscount - 1).toString(), req.params.channelid]);
		//send a response that is false, meaning the user unsubscribed
		res.send("false");
	}
});

//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleLikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the likes and dislikes of the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});

//a get request for disliking a comment on the site
app.get("/comment/dislike/:commentid", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the amount of likes and dislikes on the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});

//this is a get request for sections of videos on the site
app.get("/s/:topic", async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//select all of the videos in the database with topics that include the topic in the link
	var videos = await client.query(`SELECT * FROM videos WHERE topics LIKE $1`, ["%" + req.params.topic + "%"]);
	videos = videos.rows;

	//insert extra info into the view object
	viewObj = Object.assign({}, viewObj, {videos: videos, sectionname: req.params.topic});

	//render the view for the section
	res.render("viewsection.ejs", viewObj);
});

//this is a get request to join a section of videos
app.get("/s/subscribe/:topic", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the subscribed topic and the user id from the database to check for joining or unjoining
	var subscribed = await client.query(`SELECT * FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, userinfo.id]);
	subscribed = subscribed.rows;

	//check to see if the user is joined or not
	if (subscribed.length == 0) {
		//add the user and the topic to the subscribedtopics table
		await client.query(`INSERT INTO subscribedtopics (topicname, user_id) VALUES ($1, $2)`, [req.params.topic, userinfo.id]);
		//send a value that shows that the joining happened
		res.send("true");
	} else if (subscribed.length > 0) {
		//delete the user and the topic from the subscribedtopics table
		await client.query(`DELETE FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, userinfo.id]);
		//send a value that shows that the unjoining happened
		res.send("false");
	}
});

/*
POST PATHS FOR USER-RELATED CONTENT
*/

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	//create a formidable form object
	var form = new formidable.IncomingForm();

	//parse the form and the submitted files
	form.parse(req, async(err, fields, files) => {
		//get the user session info
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		//get a generated comment id
		var commentid = await middleware.generateAlphanumId();

		//create a values array for the comment db entry
		var valuesarr = [commentid, userinfo.username, userinfo.id, fields.commenttext, req.params.videoid, new Date().toISOString(), 0, 0];

		//check for a parent comment id for comment thread functionality
		if (typeof req.query.parent_id != 'undefined') {
			//push the parent comment id into the values array
			valuesarr.push(req.query.parent_id);

			//get the parent depth level for this comment
			var parent_depth = await client.query(`SELECT depth_level FROM comments WHERE id=$1`, [req.query.parent_id]);
			parent_depth = parent_depth.rows[0].depth_level; //get the raw depth value
			valuesarr.push(parseInt(parent_depth)+1); //insert the depth value +1 into the values array

			//push the base parent/comment id (the original comment with depth level 0)
			valuesarr.push(fields.base_parent_id);

			//insert the values into the database
			await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, parent_id, depth_level, base_parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, valuesarr);
		} else {
			//push a depth level of 0 into the values array
			valuesarr.push(0);

			//insert the comment into the database
			await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, depth_level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, valuesarr);
		}


		//check to see if there is a reaction video/image and save the file (if the file size is 0 then there was no file submitted)
		if (files.reactionfile.size > 0) {
			//get the accepted file types
			var acceptedvideo = [".mp4", ".ogg", ".webm"];
			var acceptedimg = [".png", ".jpeg", ".jpg"];

			console.log("REACTION FILE:", files.reactionfile);

			//get the file extension
			var fileext = path.extname(files.reactionfile.name);

			//check for the validity of the file being submitted
			if (acceptedvideo.includes(fileext) || acceptedimg.includes(fileext)) {
				//save the file and get the location relative to the site root
				var filepath = await middleware.saveFile(files.reactionfile, "/storage/users/comments/");

				//save the file path into the database
				await client.query(`INSERT INTO videofiles (id, video, parentid) VALUES ($1, $2, $3)`, [commentid, filepath, req.params.videoid]);

				//get the filetype for the submitted file
				if (acceptedvideo.includes(fileext)) {
					var filetype = "video";
				} else if (acceptedimg.includes(fileext)) {
					var filetype = "img";
				}

				//save the file type into the database
				await client.query(`UPDATE comments SET reactionfile=$1, filetype=$2 WHERE id=$3`, [filepath, filetype, commentid]);
			} else { //tell the user that the file that they tried to submit is not supported
				req.flash("message", "Unsupported file type, please try again.");
				res.redirect(`/v/${req.params.videoid}`);
			}
		}


		//redirect to the same view url (the back end will show an updated list of comments)
		//pass a query parameter to let the middleware for this path to know to scroll down to the new comment
		res.redirect(`/v/${req.params.videoid}/?scrollToComment=true&commentid=${commentid}`);
	});
});

//this is a post link to create a new playlist
app.post("/playlist/create", middleware.checkSignedIn, async (req, res) => {
	//get the user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//generate a new id for the playlist
	var newid = await middleware.generateAlphanumId();

	//get any playlists with matching properties to the one trying to be created
	var results = await client.query(`SELECT * FROM playlists WHERE user_id=$1 AND name=$2`, [userinfo.id, req.body.name]);

	//check to see if this playlist already exists
	if (results.rows.length > 0) { //if the playlist already exists
		//set a flash message to let the user know that the playlist already exists
		req.flash("message", "Playlist with the same name already exists.");
		//redirect the user to the playlist in question
		res.redirect(`/p/${results.rows[0].id}`);
	} else { //add the playlist into the db
		//add the details of the playlist into the database
		await client.query(`INSERT INTO playlists (id, name, user_id) VALUES ($1, $2, $3)`, [newid, req.body.name, userinfo.id]);
		//check to see if there is a video that needs to be added to the new playlist
		if (typeof req.body.videoid != 'undefined') {
			//insert the video id and playlist id into the playlistvideos table
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [newid, req.body.videoid]);
			//update the amount of videos in the playlist (which is now 1)
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [1, newid]);
		}
		//redirect to the playlist
		res.redirect(`/p/${newid}`);
	}
});

//this is a post path to post a shoutout channel in the "shoutouts" section of one's channel
app.post("/shoutout/add", middleware.checkSignedIn, async (req, res) => {
	//get the channel id of the shoutout channel
	var channelreq = req.body.shoutout.split("?")[0];
	channelreq = channelreq.split("/");
	channelreq = channelreq.filter(word => word);
	var channelid = channelreq[channelreq.length-1];

	//get the user info
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//insert the shoutout channel into the database
	await client.query(`INSERT INTO shoutouts (user_id, shoutout_id) VALUES ($1, $2)`, [userinfo.id, channelid]);

	//redirect the user to the channel section with the new channel added
	res.redirect(`/u/${userinfo.id}/?section=shoutouts`);
});
