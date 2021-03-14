const {app, client, middleware, redisClient} = require("./configBasic");
const bcrypt = require("bcrypt");
const formidable = require("formidable");

/*
GET FILE PATHS FOR USER AUTH
*/

//get the registration page
app.get('/register', middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req);
	res.render("register.ejs", viewObj);
});

//delete the user and all traces of the user like videos
app.get('/u/delete/:userid', middleware.checkSignedIn, async (req, res) => {
	//get the user info for verification later on
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//check to see if the user id in the url matches the one in the session
	if (userinfo.id == req.params.userid) {
		//get all of the videos belonging to this user
		var videos = await client.query(`SELECT id FROM videos WHERE user_id=$1`, [req.params.userid]);
		videos = videos.rows;

		//delete all of the video details for the videos belonging to this user
		videos.forEach(async (item, index) => {
			await middleware.deleteVideoDetails(userinfo, item.id);
		});

		//delete all of the playlists of the user
		var playlistids = await client.query(`SELECT id FROM playlists WHERE user_id=$1`, [req.params.userid]);
		playlistids = playlistids.rows;

		//loop through the playlist ids and delete the playlist details
		playlistids.forEach(async (item, index) => {
			await middleware.deletePlaylistDetails(userinfo, item.id);
		});

		//delete the comments of this user
		await client.query(`DELETE FROM comments WHERE user_id=$1`, [req.params.userid]);

		//delete the actual user
		await client.query(`DELETE FROM users WHERE id=$1`, [req.params.userid]);

		//delete the session on the browser
		redisClient.del(req.cookies.sessionid, (err, reply) => {
			if (err) throw err;
			console.log("Redis Session Deleted");
		});
		res.cookie('sessionid', '', {expires: new Date(0)});

		//redirect to the index page after setting a flash message
		req.flash("message", "Deleted Your Account!");
		res.redirect("/");
	} else {
		//let the user know that this is not their account
		req.flash("message", "Not Your Account!");
		res.redirect("/");
	}
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req);
	res.render("login.ejs", viewObj);
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
	//delete the session from redis
	redisClient.del(req.cookies.sessionid, (err, reply) => {
		if (err) throw err;
		console.log("Redis Session Deleted");
	});

	//set the session cookies to expire immediately to delete them
	res.cookie('sessionid', '', {expires: new Date(0)});
	res.cookie("hasSession", false, {httpOnly: false, expires: 0});

	//message to the server
	console.log("[+] Logged out.");

	//tell the user that they have logged out of the site
	req.flash("message", "Logged out!");
	res.redirect("/");
});


/*
POST PATHS FOR USER AUTH
*/

//handle the user registrations
app.post('/register', (req, res) => {
	var form = new formidable.IncomingForm();

	form.parse(req, async (err, fields, files) => {
		//check to see if the user does not already exist to not register identical accounts
		var existinguser = await client.query(`SELECT username, email FROM users WHERE email=$1 OR username=$2 LIMIT 1`, [fields.email, fields.username]);
		if (existinguser.rows.length > 0) {
			if (existinguser.rows[0].email == fields.email) { //if the email is the same, then alert the user
				req.flash("message", "Email is Already Registered. Please Log In.");
				return res.redirect("/login");
			} else if (existinguser.rows[0].username == field.username) { //if the username already exists, then alert the user
				req.flash("message", "Username Already Taken, Please Try Again.")
				return res.redirect("/register");
			}
		}

		//store errors to be shown in the registration page (if needed)
		var errors = [];

		//make arrays of accepted file types
		var acceptedimage = ["image/png", "image/jpeg", "image/jpg"];

		//check to see that the filetypes submitted are valid
		if (!acceptedimage.includes(files.channelicon.type) || !acceptedimage.includes(files.channelbanner.type)) {
			errors.push("Invalid file types for channel icon or channel banner, use png, jpeg, or jpg files.");
		}

		if (errors.length > 0) {
			//insert the errors into a flash message
			req.flash("errors", errors);
			//redirect to the registration page
			res.redirect("/register");
		} else {
			//hash the password for secure storage in database
			var hashedPassword = await bcrypt.hash(fields.password, 10);

			//generate an alphanumeric id inside the async function here
			var newuserid = await middleware.generateAlphanumId();

			//get a stream key for obs streaming
			var streamkey = await middleware.generateStreamKey();

			//save the channel icon submitted in the form
			if (files.channelicon.size > 0) { //if the file size is more than 0, then a file was submitted
				var channeliconpath = middleware.saveFile(files.channelicon, "/storage/users/icons/");
			} else { //if the channel icon file field was empty, use the default image
				var channeliconpath = "/views/content/default.png";
			}

			//save the channel banner submitted in the form
			if (files.channelbanner.size > 0) { //if the file size is more than 0, then a file was submitted
				var channelbannerpath = middleware.saveFile(files.channelbanner, "/storage/users/banners/");
			} else { //if the name is blank, then the file was not submitted
				var channelbannerpath = "/views/content/default.png";
			}

			//create an array of all of the important values
			var valuesarr = [newuserid, fields.username, fields.email, hashedPassword, channeliconpath, channelbannerpath, fields.channeldesc, fields.topics, streamkey];

			//push the user into the database and get the important values as an object
			var newuser = await client.query(`INSERT INTO users (id, username, email, password, channelicon, channelbanner, description, topics, streamkey) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, email, password, channelicon, channelbanner, streamkey`, valuesarr);
			newuser = newuser.rows[0];
			console.log("Registered User.");

			//add a "Watch Later" playlist into the database which the user cannot delete
			var newplaylistid = await middleware.generateAlphanumId();
			valuesarr = [newuserid, "Watch Later", newplaylistid, 0, false];
			await client.query(`INSERT INTO playlists (user_id, name, id, videocount, candelete) VALUES ($1, $2, $3, $4, $5)`, valuesarr);

			//add a "Liked Videos" playlist into the database which the user also cannot delete
			var newplaylistid = await middleware.generateAlphanumId();
			valuesarr = [newuserid, "Liked Videos", newplaylistid, 0, false];
			await client.query(`INSERT INTO playlists (user_id, name, id, videocount, candelete) VALUES ($1, $2, $3, $4, $5)`, valuesarr);

			//generate a new session id
			var newsessid = middleware.generateSessionId();

			//store the user info inside redis db
			redisClient.set(newsessid, JSON.stringify(newuser));

			//store the session id in the browser of the user
			res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});

			//store a cookie that stores a boolean value letting javascript know the session exists (javascript and httponly coexist)
			res.cookie("hasSession", true, {httpOnly: false, expires: 0});

			//flash message to let the user know they are registered
			req.flash("message", "Registered!");

			//redirect to the home page
			res.redirect("/");
		}
	});
});

//have the user log in
app.post("/login", async (req, res) => {
	//select the user from the database with the specified fields
	var user = await client.query(`SELECT * FROM users WHERE email=$1 AND username=$2 LIMIT 1`, [req.body.email, req.body.username]);
	user = user.rows[0];

	//check to see if we need to redirect the user to the registration page
	if (typeof user == 'undefined') {
		req.flash("message", "User does not exist yet, please register.");
		return res.redirect("/register");
	}

	//compare the password entered with the password in the user entry
	var match = await bcrypt.compare(req.body.password, user.password);

	//check to see if the password entered matches up with the user entry
	if (match) { //if the password is a match, log the user in
		//get the list of the channels that the user is subscribed to
		var subscribedChannels = await client.query(`SELECT channel_id FROM subscribed WHERE user_id=$1`, [user.id]);

		//store the values of the objects inside the rows array into one array of values into the user session variable
		user.subscribedChannels = subscribedChannels.rows.map(({channel_id}) => channel_id);

		//generate a new session id
		var newsessid = middleware.generateSessionId();

		//store the user in redis
		redisClient.set(newsessid, JSON.stringify(user));

		//store the session id on the client side
		res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});

		//store a cookie to alert javascript of the existence of a session/logged-in user
		res.cookie("hasSession", true, {httpOnly: false, expires: 0});

		//set the default language to english
		res.cookie("language", "en", {httpOnly: false, expires: 0});

		//messages to let the server and the client know that a user logged in
		console.log("Logged In!");
		req.flash("message", "Logged In!");

		//redirect to the home page
		res.redirect("/");
	} else { //if the password is incorrect, then let the user know
		req.flash("message", "Password Incorrect.");
		res.redirect("/login");
	}
});
