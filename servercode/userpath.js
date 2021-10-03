const {app, client, middleware} = require("./configBasic");

/*
GET PATHS FOR USER-RELATED CONTENT
*/

//view the channel of the user
app.get("/u/:userid", async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var viewObj = await middleware.getViewObj(req, res);

	var creator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [req.params.userid]);

	viewObj.creator = creator.rows[0];

	if (typeof req.query.section != 'undefined') {
		viewObj.section = req.query.section;
	} else {
		viewObj.section = "home";
	}

	switch(viewObj.section) {
		case "home":
			var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=$2 ORDER BY views DESC LIMIT 10`, [req.params.userid, false]);
			viewObj.videos = videos.rows;
			break;
		case "videos":
			var videos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=$2`, [req.params.userid, false]);
			viewObj.videos = videos.rows;
			break;
		case "playlists":
			var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [req.params.userid]);
			viewObj.playlists = playlists.rows;
			break;
		case "shoutouts":
			var shoutouts = await client.query(`SELECT shoutout_id FROM shoutouts WHERE user_id=$1`, [req.params.userid]);
			var shoutoutids = shoutouts.rows.map((shoutout) => {
				return "\'" + shoutout.shoutout_id + "\'";
			});

			if (shoutoutids.length) {
				newshoutouts = await client.query(`SELECT * FROM users WHERE id IN (${shoutoutids})`);
				viewObj.shoutouts = newshoutouts.rows;
			} else {
				viewObj.shoutouts = [];
			}

			break;
	}

	if ( (typeof userinfo == 'undefined' || userinfo.id != viewObj.creator.id) && (typeof viewObj.videos != 'undefined') ) {
		viewObj.videos = viewObj.videos.filter((item) => {
			return !item.private;
		});
	}

	return res.render("viewchannel.ejs", viewObj);
});

//get request for subscribing to a channel
app.get("/subscribe/:channelid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var channelsubscribed = await client.query(`SELECT EXISTS(SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2 LIMIT 1)`, [req.params.channelid, userinfo.id]);
	channelsubscribed = channelsubscribed.rows[0].exists;

	if (channelsubscribed) {
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, userinfo.id]);
		await client.query(`UPDATE users SET subscribers=subscribers-1 WHERE id=$1`, [req.params.channelid]);

		return res.send({subscribed: false});
	} else {
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, userinfo.id]);
		await client.query(`UPDATE users SET subscribers=subscribers+1 WHERE id=$1`, [req.params.channelid]);

		return res.send({subscribed: true});
	}
});

//this is a get request for sections of videos on the site
app.get("/s/:topic", async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var videos = await client.query(`SELECT * FROM videos WHERE topics LIKE $1 LIMIT 50`, ["%" + req.params.topic + "%"]);
	videos = videos.rows;

	viewObj = Object.assign({}, viewObj, {videos: videos, sectionname: req.params.topic});

	return res.render("viewsection.ejs", viewObj);
});

//this is a get request to join a section of videos
app.get("/s/subscribe/:topic", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var topicsubscribed = await client.query(`SELECT EXISTS(SELECT * FROM subscribedtopics WHERE topicname=$1 AND user_id=$2 LIMIT 1)`, [req.params.topic, userinfo.id]);
	topicsubscribed = topicsubscribed.rows[0].exists;

	if (topicsubscribed) {
		await client.query(`DELETE FROM subscribedtopics WHERE topicname=$1 AND user_id=$2`, [req.params.topic, userinfo.id]);
		return res.send({joined: false});
	} else {
		await client.query(`INSERT INTO subscribedtopics (topicname, user_id) VALUES ($1, $2)`, [req.params.topic, userinfo.id]);
		return res.send({joined: true});
	}
});

//get path for deleting a shoutout from a channel
app.get("/shoutout/delete/:shoutoutid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var shoutoutexists = await client.query(`SELECT EXISTS(SELECT * FROM shoutouts WHERE shoutout_id=$1 AND user_id=$2 LIMIT 1)`, [req.params.shoutoutid, userinfo.id]);
	shoutoutexists = shoutoutexists.rows[0].exists;

	if (shoutoutexists) {
		await client.query(`DELETE FROM shoutouts WHERE shoutout_id=$1 AND user_id=$2`, [req.params.shoutoutid, userinfo.id]);
		req.flash("message", "Deleted shoutout!");
		return res.redirect(`/u/${userinfo.id}/?section=shoutouts`);
	} else {
		req.flash("message", "Shoutout does not exist.");
		req.flash("redirecturl", `/u/${userinfo.id}/?section=shoutouts`);
		return res.redirect("/error");
	}
});

/*
POST PATHS FOR USER-RELATED CONTENT
*/

//this is a post path to post a shoutout channel in the "shoutouts" section of one's channel
app.post("/shoutout/add", middleware.checkSignedIn, async (req, res) => {
	//process the shoutout url to get the channel id
	var channelreq = req.body.shoutout.split("?")[0];
	channelreq = channelreq.split("/");
	channelreq = channelreq.filter(word => word); //filter out empty strings
	var channelid = channelreq[channelreq.length-1];

	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var shoutoutexists = await client.query(`SELECT EXISTS(SELECT * FROM shoutouts WHERE shoutout_id=$1 AND user_id=$2 LIMIT 1)`, [channelid, userinfo.id]);
	shoutoutexists = shoutoutexists.rows[0].exists;

	if (shoutoutexists) {
		req.flash("message", "This shoutout already exists.");
		req.flash("redirecturl", `/u/${userinfo.id}/?section=shoutouts`);
		return res.redirect("/error");
	} else {
		var channelexists = await client.query(`SELECT EXISTS(SELECT * FROM users WHERE id=$1)`, [channelid]);
		channelexists = channelexists.rows[0].exists;

		if (channelexists) {
			await client.query(`INSERT INTO shoutouts (user_id, shoutout_id) VALUES ($1, $2)`, [userinfo.id, channelid]);
			return res.redirect(`/u/${userinfo.id}/?section=shoutouts`);
		} else {
			req.flash("message", `The channel with the id: ${channelid} does not exist.`);
			req.flash("redirecturl", `/u/${userinfo.id}/?section=shoutouts`);
			return res.redirect("/error");
		}
	}
});

//post path for reporting a video
app.post("/report/video/:videoid", middleware.checkSignedIn, async (req, res) => {
	var videoexists = await client.query(`SELECT EXISTS(SELECT * FROM videos WHERE id=$1 LIMIT 1)`, [req.params.videoid]);
	videoexists = videoexists.rows[0].exists;

	if (videoexists) {
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		//get the time into the video in seconds where the user reported the video
		var timestamp = 0;
		timestamp += (req.body.hours*60*60);
		timestamp += (req.body.minutes*60);
		timestamp += (req.body.seconds);

		var valuesarr = [userinfo.id, req.params.videoid, "video", req.body.reason, timestamp];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == 'string') {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO reports (reporter_id, content_id, content_type, reason, timestamp) VALUES (${valuesarr})`);

		req.flash("message", "Video reported, the report will be reviewed.");
		return res.redirect(`/v/${req.params.videoid}`);
	} else {
		req.flash("message", "Video does not exist.");
		return res.redirect("/error");
	}
});
