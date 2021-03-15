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
	var creator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [req.params.userid]);

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
			var shoutouts = await client.query(`SELECT shoutout_id FROM shoutouts WHERE user_id=$1`, [req.params.userid]);

			//get each individual shoutout id and wrap in escaped single quotes
			shoutoutids = shoutouts.rows.map((shoutout) => {
				return "\'" + shoutout.shoutout_id + "\'";
			});

			//make SQL search through the array of string values using the IN clause
			var newshoutouts = await client.query(`SELECT * FROM users WHERE id IN (${shoutoutids})`);

			viewObj.shoutouts = newshoutouts.rows;
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

	//get the target channel to see if it exists
	var channelexists = await client.query(`SELECT EXISTS(SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2 LIMIT 1)`, [req.params.channelid, userinfo.id]);
	channelexists = channelexists.rows[0].exists;

	//check to see what to do to update the subscribed list
	if (channelexists) { //if the user has subscribed, then unsubscribe
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, userinfo.id]);
		await client.query(`UPDATE users SET subscribers=subscribers-1 WHERE id=$1`, [req.params.channelid]);
		//send a response that is false, meaning the user unsubscribed
		res.send("false");
	} else { //if the user has not subscribed, the subscribe
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, userinfo.id]);
		await client.query(`UPDATE users SET subscribers=subscribers+1 WHERE id=$1`, [req.params.channelid]);
		//send a response that is true, meaning that the user has subscribed
		res.send("true");
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

	//check to see if the user has already subscribed to this particular topic
	var topicexists = await client.query(`SELECT EXISTS(SELECT * FROM subscribedtopics WHERE topicname=$1 AND user_id=$2 LIMIT 1)`, [req.params.topic, userinfo.id]);
	topicexists = topicexists.rows[0].exists;

	//add or delete the subscribed topic entry based on whether or not the user has subscribed to the topic
	if (topicexists) {
		await client.query(`DELETE FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, userinfo.id]);
		res.send("false");
	} else {
		await client.query(`INSERT INTO subscribedtopics (topicname, user_id) VALUES ($1, $2)`, [req.params.topic, userinfo.id]);
		res.send("true");
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

	//check for the existence of this shoutout
	var shoutoutexists = await client.query(`SELECT EXISTS(SELECT * FROM shoutouts WHERE shoutout_id=$1 AND user_id=$2 LIMIT 1)`, [channelid, userinfo.id]);
	shoutoutexists = shoutoutexists.rows[0].exists;

	//do something based on the existence of a shoutout
	if (shoutoutexists) { //if this shoutout exists, then let the user know
		req.flash("message", "This shoutout already exists");
		res.redirect(`/u/${userinfo.id}/?section=shoutouts`);
	} else { //if this shoutout does not exist, then insert it into the DB
		await client.query(`INSERT INTO shoutouts (user_id, shoutout_id) VALUES ($1, $2)`, [userinfo.id, channelid]);
		res.redirect(`/u/${userinfo.id}/?section=shoutouts`);
	}
});
