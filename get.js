//this is a file to handle all of the get requests for the server

const { app, client, middleware, PORT} = require("./configBasic");

const fs = require("fs");
const approx = require("approximate-number");
const path = require("path");

//calculate the amount of hits on the site
app.use(middleware.hitCounter);

//get the index of the site working
app.get('/', async (req, res) => {
	//select all of the videos from the database to be displayed
	var videos = await client.query("SELECT * FROM videos LIMIT 50");
	videos = videos.rows;

	//select the 

	//create an object for the view
	var viewobj = {message: req.flash("message"), videos: videos, webroot: __dirname};

	//check to see if the user exists in the session or not
	if (req.session.user) {
		viewobj.user = req.session.user;
	}

	//render the view
	res.render("index.ejs", viewobj);
});

//get the registration page
app.get('/register', middleware.checkNotSignedIn, (req, res) => {
	res.render("register.ejs", { message: req.flash('message') });
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, (req, res) => {
	res.render("login.ejs", {message: req.flash("message")});
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
	req.session.user = null;
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
	var viewObj = {creator: creator};

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
		}
		if (typeof videos != 'undefined') {
			viewObj.videos = videos;
		}
	}

	//render the view
	res.render("viewchannel.ejs", viewObj);
});

//get the form for submitting videos
app.get("/v/submit", middleware.checkSignedIn, (req, res) => {
	res.render("submitvideo.ejs", { message: req.flash("message") });
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
	var viewobj = {video: video, videos: videos, videocreator: videocreator, approx: approx, comments: comments};

	//render the video view based on whether or not the user is logged in and has a session variable
	if (req.session.user) {
		viewobj.user = req.session.user;
		var subscribed = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [videocreator.id, req.session.user.id]);
		viewobj.subscribed = subscribed.rows.length;
	}

	//check to see if the video needs to scroll down to a comment that was just posted
	if (req.query.scrollToComment == "true" && typeof req.query.commentid != 'undefined') {
		viewobj.scrollToComment = true;
		viewobj.commentid = req.query.commentid;
	}

	res.render("viewvideo.ejs", viewobj);
});

//this is a get request for the playlists on the site
app.get("/playlist/:playlistid", async(req, res) => {
	//select all of the videos from the database with the matching playlist id
	var videos = await client.query(`SELECT * FROM videos WHERE playlist_id=$1`, [req.params.playlistid]);
	videos = videos.rows;

	//get the creator of the playlist
	var creator = await client.query(`SELECT * FROM users WHERE id=$1`, [videos[0].user_id]);
	creator = creator.rows[0];

	//get the playlist object which contains the name of the playlist and the id of the user that created it
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1`, [req.params.playlistid]);
	playlist = playlist.rows[0];

	//create view object to pass into the view
	var viewObj = {creator: creator, videos: videos, playlist: playlist};

	//render the view for the playlist
	res.render("viewplaylist.ejs", viewObj);
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
	var results = await middleware.searchVideos(totalphrases);

	//get the channels that match the search terms
	var channels = await middleware.searchChannels(totalphrases);

	//store the array of video objects inside the search object
	search.videos = results;
	search.channels = channels;

	console.log("Search: " + search.humanquery);

	//create a search object to be passed to the view
	var searchObj = {search: search};

	//add the user to the variable if they are signed in
	if (req.session.user) {
		searchObj.user = req.session.user;
	}

	res.render("searchresults.ejs", searchObj);
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
	var viewObj = {videos: videos, sectionname: req.params.topic};

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
