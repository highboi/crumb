const {app, client, middleware, redisClient} = require("./configBasic");
const bcrypt = require("bcrypt");
const fs = require("fs");
const nodemailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const logger = require("./logger");

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

//a get path for submitting a forgotten password request
app.get("/forgotpassword", middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	return res.render("forgotpass.ejs", viewObj);
});

//a get path for submitting a new password to reset on a user account
app.get("/resetpassword/:tempid", middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	//get the user information for the person who forgot their password
	var forgetfuluser = await redisClient.getAsync(req.params.tempid);

	if (forgetfuluser != null) {
		viewObj.forgetfuluser = JSON.parse(forgetfuluser);
	} else {
		req.flash("message", "That reset link has expired, get another one!");
		return res.redirect("/forgotpassword");
	}

	return res.render("resetpass.ejs", viewObj);
});

/*
POST PATHS FOR USER AUTH
*/

//handle the user registrations
app.post('/register', async (req, res) => {
	var existinguser = await client.query(`SELECT username FROM users WHERE username=$1 OR email=$2 LIMIT 1`, [req.body.username, req.body.email]);

	if (existinguser.rows.length) {
		req.flash("message", "Username or Email Already Taken, Please Try Again.");
		req.flash("redirecturl", "/register");
		return res.redirect("/error");
	}

	var errors = [];

	var acceptedimage = ["image/png", "image/jpeg", "image/jpg"];

	if (typeof req.files.channelicon != 'undefined' && !acceptedimage.includes(req.files.channelicon.mimetype)) {
		errors.push("Invalid file type for channel icon. Use png, jpeg or jpg files.");
	}

	if (typeof req.files.channelbanner != 'undefined' && !acceptedimage.includes(req.files.channelbanner.mimetype)) {
		errors.push("Invalid file type for channel banner. Use png, jpeg or jpg files.");
	}

	if (errors.length) {
		req.flash("errors", errors);
		return res.redirect("/register");
	} else {
		var hashedPassword = await bcrypt.hash(req.body.password, 10);
		var newuserid = await middleware.generateAlphanumId();
		var streamkey = await middleware.generateStreamKey();

		if (typeof req.files.channelicon != 'undefined' && req.files.channelicon.size) {
			var channeliconpath = middleware.saveFile(req.files.channelicon, "/storage/users/icons/");
		} else {
			var channeliconpath = "/content/icons/astro_logo.png";
		}

		if (typeof req.files.channelbanner != 'undefined' && req.files.channelbanner.size) {
			var channelbannerpath = middleware.saveFile(req.files.channelbanner, "/storage/users/banners/");
		} else {
			var channelbannerpath = "/content/icons/astro_flat.png";
		}

		var valuesarr = [newuserid, req.body.username, req.body.email, hashedPassword, channeliconpath, channelbannerpath, req.body.channeldesc, " " + req.body.topics + " ", streamkey];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == 'string') {
				return "\'"+ item + "\'";
			} else {
				return item;
			}
		});

		var newuser = await client.query(`INSERT INTO users (id, username, email, password, channelicon, channelbanner, description, topics, streamkey) VALUES (${valuesarr}) RETURNING id, username, password, channelicon, channelbanner, streamkey`);
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

//a post path for sending an email to reset a password
app.post("/forgotpass", middleware.checkNotSignedIn, async (req, res) => {
	//check to see if the email submitted exists in the database
	var existinguser = await client.query(`SELECT id, email FROM users WHERE email=$1`, [req.body.email]);
	if (!existinguser.rows.length) {
		req.flash("message", "This email is not attached to any user.");
		return res.redirect("/forgotpassword");
	}

	//get a new id for the redis entry
	var newid = await middleware.generateSessionId();

	//make an object to store in redis
	var forgotpassobject = {email: req.body.email, id: existinguser.rows[0].id, redisid: newid};
	forgotpassobject = JSON.stringify(forgotpassobject);

	//insert the forgotpass object into the redis server
	redisClient.set(newid, forgotpassobject);

	//make a emailer object
	var transporter = nodemailer.createTransport(smtpTransport({
		host: "smtp.astro-tv.space",
		port: 587,
		secureConnection: false,
		tls: {
			rejectUnauthorized: false
		},
		auth: {
			user: process.env.EMAILNAME,
			pass: process.env.EMAILPASS
		}
	}));

	//make an object to store information about the email to send
	var emailObject = {
		from: "astro-official@astro-tv.space",
		to: req.body.email,
		subject: "Astro Password Reset",
		text: `Reset your password at this link:\nastro-tv.space/resetpassword/${newid}\n\nIF YOU DID NOT REQUEST A PASSWORD RESET, IGNORE THIS EMAIL.`
	};

	//send the email using the transporter object
	transporter.sendMail(emailObject, (error, info) => {
		if (error) {
			throw error;
		} else {
			logger.log({level: "info", message: `Email sent: ${info.response}`});
		}
	});

	//let the user know that the email was sent
	req.flash("message", "Email has been sent with a password reset link. CHECK YOUR SPAM FOLDER!");
	return res.redirect("/forgotpassword");
});

//a post path for reseting a password
app.post("/resetpass", middleware.checkNotSignedIn, async(req, res) => {
	//get the user information based on the redis id in the form
	var forgetfuluser = await redisClient.getAsync(req.body.redisid);
	forgetfuluser = JSON.parse(forgetfuluser);

	//hash the new password
	var hashedpass = await bcrypt.hash(req.body.password, 10);

	//set the new password
	var result = await client.query(`UPDATE users SET password=$1 WHERE id=$2`, [hashedpass, forgetfuluser.id]);

	//delete the redis entry for the forgetful user to make sure that other people can't use the link maliciously
	await redisClient.del(req.body.redisid, (err, reply) => {
		if (err) throw err;
	});

	//tell the user to login with the new password
	req.flash("message", "Password Reset Successfully! You can now login.");
	return res.redirect("/");
});
