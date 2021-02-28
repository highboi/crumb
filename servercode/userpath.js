const {app, client, middleware} = require("./configBasic");

/*
GET PATHS FOR USER-RELATED CONTENT
*/

//view the channel of the user
app.get("/u/:userid", async (req, res) => {
	//get the user session info if there is any to get
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

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
			viewObj.videos = [];
			break;
		case "shoutouts":
			var shoutouts = await client.query(`SELECT * FROM shoutouts WHERE user_id=$1`, [req.params.userid]);
			viewObj.shoutouts = shoutouts.rows;
			viewObj.videos = [];
			break;
	}

	if (typeof userinfo == 'undefined' || userinfo.id != viewObj.creator.id) {
		viewObj.videos = viewObj.videos.filter((item) => {
			return !item.private;
		});
	}

	//render the view
	res.render("viewchannel.ejs", viewObj);
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
