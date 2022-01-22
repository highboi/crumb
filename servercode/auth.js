const {app, client, middleware, redisClient} = require("./configBasic");
const bcrypt = require("bcrypt");
const fs = require("fs");

/*
GET FILE PATHS FOR USER AUTH
*/

//get the registration page
app.get('/register', middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);
	return res.render("register.ejs", viewObj);
});

//delete the user and all traces of the user such as videos
app.get('/u/delete/:userid', middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	if (userinfo.id == req.params.userid) {
		var videos = await client.query(`SELECT id FROM videos WHERE user_id=$1`, [req.params.userid]);
		videos = videos.rows;
		for await (const vid of videos) {
			await middleware.deleteVideoDetails(userinfo.id, vid.id);
		}

		var playlistids = await client.query(`SELECT id FROM playlists WHERE user_id=$1`, [req.params.userid]);
		playlistids = playlistids.rows;
		for await (const playlist of playlistids) {
			await middleware.deletePlaylistDetails(userinfo.id, playlist.id);
		}

		await client.query(`DELETE FROM likedcomments WHERE comment_id IN (SELECT id FROM comments WHERE user_id=$1)`, [req.params.userid]);
		await client.query(`DELETE FROM dislikedcomments WHERE comment_id IN (SELECT id FROM comments WHERE user_id=$1)`, [req.params.userid]);
		await client.query(`DELETE FROM comments WHERE user_id=$1`, [req.params.userid]);

		await client.query(`DELETE FROM subscribed WHERE user_id=$1 OR channel_id=$1`, [req.params.userid]);
		await client.query(`DELETE FROM subscribedtopics WHERE user_id=$1`, [req.params.userid]);

		await client.query(`DELETE FROM likedvideos WHERE user_id=$1`, [req.params.userid]);
		await client.query(`DELETE FROM dislikedvideos WHERE user_id=$1`, [req.params.userid]);

		await client.query(`DELETE FROM users WHERE id=$1`, [req.params.userid]);

		var channeliconpath = global.appRoot + "/storage" + userinfo.channelicon;
		var channelbannerpath = global.appRoot + "/storage" + userinfo.channelbanner;
		fs.unlink(channeliconpath, (err) => {
			if (err) throw err;
		});
		fs.unlink(channelbannerpath, (err) => {
			if (err) throw err;
		});

		redisClient.del(req.cookies.sessionid, (err, reply) => {
			if (err) throw err;
		});
		res.cookie('sessionid', '', {expires: new Date(0)});
		res.cookie('hasSession', false, {httpOnly: false, expires: 0});

		req.flash("message", "Deleted Your Account!");
		return res.redirect("/");
	} else {
		req.flash("message", "Not Your Account!");
		return res.redirect("/error");
	}
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);
	return res.render("login.ejs", viewObj);
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
	redisClient.del(req.cookies.sessionid, (err, reply) => {
		if (err) throw err;
		console.log("Redis Session Deleted");
	});

	res.cookie('sessionid', '', {expires: new Date(0)});
	res.cookie("hasSession", false, {httpOnly: false, expires: 0});

	console.log("[+] Logged out.");

	req.flash("message", "Logged out!");
	return res.redirect("/");
});


/*
POST PATHS FOR USER AUTH
*/

//handle the user registrations
app.post('/register', async (req, res) => {
	var existinguser = await client.query(`SELECT username FROM users WHERE username=$1 LIMIT 1`, [req.body.username]);
	if (existinguser.rows.length) {
		req.flash("message", "Username Already Taken, Please Try Again.");
		req.flash("redirecturl", "/register");
		return res.redirect("/error");
	}

	var errors = [];

	var acceptedimage = ["image/png", "image/jpeg", "image/jpg"];

	if (!acceptedimage.includes(req.files.channelicon.mimetype) || !acceptedimage.includes(req.files.channelbanner.mimetype)) {
		errors.push("Invalid file types for channel icon or channel banner, use png, jpeg, or jpg files.");
	}

	if (errors.length) {
		req.flash("errors", errors);
		return res.redirect("/register");
	} else {
		var hashedPassword = await bcrypt.hash(req.body.password, 10);
		var newuserid = await middleware.generateAlphanumId();
		var streamkey = await middleware.generateStreamKey();

		if (req.files.channelicon.size) {
			var channeliconpath = middleware.saveFile(req.files.channelicon, "/storage/users/icons/");
		} else {
			var channeliconpath = "/views/content/default.png";
		}

		if (req.files.channelbanner.size) {
			var channelbannerpath = middleware.saveFile(req.files.channelbanner, "/storage/users/banners/");
		} else {
			var channelbannerpath = "/views/content/default.png";
		}

		var valuesarr = [newuserid, req.body.username, hashedPassword, channeliconpath, channelbannerpath, req.body.channeldesc, " " + req.body.topics + " ", streamkey];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == 'string') {
				return "\'"+ item + "\'";
			} else {
				return item;
			}
		});

		var newuser = await client.query(`INSERT INTO users (id, username, password, channelicon, channelbanner, description, topics, streamkey) VALUES (${valuesarr}) RETURNING id, username, password, channelicon, channelbanner, streamkey`);
		newuser = newuser.rows[0];
		console.log("Registered User.");

		var newsessid = await middleware.generateSessionId();

		redisClient.set(newsessid, JSON.stringify(newuser));

		res.cookie('tempsessionid', '', {expires: new Date(0)});
		redisClient.del(req.cookies.tempsessionid, (err, reply) => {
			if (err) throw err;
		});

		res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});
		res.cookie("hasSession", true, {httpOnly: false, expires: 0});

		req.flash("message", "Registered!");
		return res.redirect("/");
	}
});

//have the user log in
app.post("/login", async (req, res) => {
	var user = await client.query(`SELECT * FROM users WHERE username=$1 LIMIT 1`, [req.body.username]);
	user = user.rows[0];

	if (typeof user == 'undefined') {
		req.flash("message", "User with this username does not exist yet, please register.");
		return res.redirect("/register");
	}

	var match = await bcrypt.compare(req.body.password, user.password);

	if (match) {
		var newsessid = await middleware.generateSessionId();

		redisClient.set(newsessid, JSON.stringify(user));

		res.cookie('tempsessionid', '', {expires: new Date(0)});
		redisClient.del(req.cookies.tempsessionid, (err, reply) => {
			if (err) throw err;
		});

		res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});
		res.cookie("hasSession", true, {httpOnly: false, expires: 0});

		console.log("Logged In!");

		req.flash("message", "Logged In!");
		return res.redirect("/");
	} else {
		req.flash("message", "Password Incorrect.");
		req.flash("redirecturl", "/login");
		return res.redirect("/error");
	}
});
