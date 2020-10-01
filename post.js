//this is a file to store all of the express functions that handle post requests

//require the modules to work
const bcrypt = require("bcrypt");
const formidable = require("formidable");
const path = require("path");
const approx = require("approximate-number");

const { app, client, middleware, PORT, viewObject } = require("./configBasic");

//handle the user registrations
app.post('/register', (req, res) => {
	var form = new formidable.IncomingForm();

	form.parse(req, async (err, fields, files) => {
		//store errors to be shown in the registration page (if needed)
		var errors = [];

		//check for empty values (the email entry is optional, but we need a username)
		if (!fields.username || !fields.password || !fields.password2) {
			errors.push({message: "Please fill all fields."});
		}

		//check for the length of the password (minimum 6 chars)
		if (fields.password.length < 6) {
			errors.push({message: "Password must be at least 6 chars."});
		}

		//check for mismatched passwords
		if (fields.password != fields.password2) {
			errors.push({message: "Passwords do not match"});
		}

		if (errors.length > 0) {
			var viewObj = Object.assign({}, viewObject, {errors: errors});
			//render the register page with errors if there are errors to show the user
			res.render('register.ejs', viewObj);
		} else {
			//hash the password for secure storage in database
			var hashedPassword = await bcrypt.hash(fields.password, 10);

			//generate an alphanumeric id inside the async function here
			var newuserid = await middleware.generateAlphanumId();

			//save the channel icon submitted in the form
			if (files.channelicon.name != '') { //if the name is not blank, then a file was submitted
				var channeliconpath = middleware.saveFile(files.channelicon, "/storage/users/icons/");
			} else { //if the channel icon file field was empty, use the default image
				var channeliconpath = middleware.copyFile("/views/content/default.png", "/storage/users/icons/", "default.png");
			}

			//save the channel banner submitted in the form
			if (files.channelbanner.name != '') { //if the name is not blank, then the file was submitted
				var channelbannerpath = middleware.saveFile(files.channelbanner, "/storage/users/banners/");
			} else { //if the name is blank, then the file was not submitted
				var channelbannerpath = middleware.copyFile("/views/content/default.png", "/storage/users/banners/", "default.png");
			}

			//check to see if the user does not already exist
			var existinguser = await client.query(`SELECT * FROM users WHERE email=$1 OR username=$2`, [fields.email, fields.username]);

			//do something according to if the user is already registered or not
			if (existinguser.rows.length > 0) { //if the user is registered
				if (existinguser.rows[0].email == fields.email) {
					req.flash("message", "Email is Already Registered. Please Log In.");
					return res.redirect("/login");
				} else if (existinguser.rows[0].username == field.username) {
					return res.render("register.ejs", {message: "Username Already Taken, Please Try Again."});
				}
			} else { //if the user is a new user, then register them
				var valuesarr = [newuserid, fields.username, fields.email, hashedPassword, channeliconpath, channelbannerpath, fields.channeldesc, fields.topics];
				var newuser = await client.query(`INSERT INTO users (id, username, email, password, channelicon, channelbanner, description, topics) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, username, email, password, channelicon, channelbanner`, valuesarr);
				newuser = newuser.rows[0];
				console.log("Registered User.");
				//store the user in the session
				req.session.user = newuser;
				//store the user into the global view object
				viewObject.user = req.session.user;
				//flash message to let the user know they are registered
				req.flash("message", "Registered!");
				//redirect to the home page
				res.redirect("/");
			}
		}
	});
});

//have the user log in
app.post("/login", async (req, res) => {
	var errors = [];

	if (!req.body.username && !req.body.email) {
		errors.push({message: "Enter a Username or Email please."});
	}

	if (!req.body.password) {
		errors.push({message: "Fill out password please."});
	}

	if (errors.length > 0) {
		var viewObj = Object.assign({}, viewObject, {errors: errors});
		res.render("login.ejs", viewObj);
	} else {
		//select the users from the database with the specified fields
		var user = await client.query(`SELECT * FROM users WHERE email=$1 OR username=$2`, [req.body.email, req.body.username]);
		user = user.rows[0];
		//check to see if the user exists
		if (typeof user != 'undefined') { //if the user exists, then log them in
			var match = await bcrypt.compare(req.body.password, user.password); //compare the password entered with the password in the db
			if (match) { //if the password is a match, log the user in
				//get the list of the channels that the user is subscribed to
				var subscribedChannels = await client.query(`SELECT channel_id FROM subscribed WHERE user_id=$1`, [user.id]);
				//store the values of the objects inside the rows array into one array of values into the user session variable
				user.subscribedChannels = subscribedChannels.rows.map(({channel_id}) => channel_id);
				//store the user in the current session
				req.session.user = user;
				//store the user in the global view object
				viewObject.user = req.session.user;
				//messages to let the server and the client know that a user logged in
				console.log("Logged In!");
				req.flash("message", "Logged In!");
				//redirect to the home page
				res.redirect("/");
			} else { //if the password is incorrect, then let the user know
				var viewObj = Object.assign({}, viewObject, {message: "Password Incorrect."});
				res.render("login.ejs", viewObj);
			}
		} else { // if the user does not exist, then tell the user
			var viewObj = Object.assign({}, viewObject, {message: "User does not exist yet, please register."});
			res.render("login.ejs", viewObj);
		}
	}
});

//store the submitted video to the database
app.post("/v/submit", (req, res) => {
	//get the form
	var form = new formidable.IncomingForm();

	//parse the form and store the files
	form.parse(req, async (err, fields, files) => {
		//get the video and thumbnail extensions to be checked (file upload vuln)
		var videoext = path.extname(middleware.getFilePath(files.video, "/storage/videos/files/"));
		var thumbext = path.extname(middleware.getFilePath(files.thumbnail, "/storage/videos/thumbnails/"));

		//make arrays of accepted file types
		var acceptedvideo = [".mp4", ".ogg", ".webm"];
		var acceptedthumbnail = [".png", ".jpeg", ".jpg"];

		//if the video has an mp4, ogg, or webm extension and the thumbnail is a png, jpeg or jpg image, load the video
		if ( (acceptedvideo.includes(videoext)) && (acceptedthumbnail.includes(thumbext)) ) {
			//store the video file submitted
			await middleware.saveFile(files.video, "/storage/videos/files/");

			//store the thumbnail file submitted
			await middleware.saveFile(files.thumbnail, "/storage/videos/thumbnails/");

			//variables to store the path (relative to server root) of the video and thumbnail
			var videopath = "/videos/files/" + Date.now() + "-" + files.video.name;
			var thumbnailpath = "/videos/thumbnails/" + Date.now() + "-" + files.thumbnail.name;

			//store the video details for later reference

			//generate a unique video id for each video (await the result of this function)
			var videoid = await middleware.generateAlphanumId();

			//turn the list of topics into an array to be parsed
			var topics = fields.topics.split(" ");
			topics = topics.toString();

			//the array to contain the values to insert into the db
			var valuesArr = [videoid, fields.title, fields.description, thumbnailpath, videopath, req.session.user.id, 0, middleware.getDate(), topics, req.session.user.username, req.session.user.channelicon];

			//load the video into the database
			var id = await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`, valuesArr);
			var videourl = `/v/${id.rows[0].id}`; //get the url to redirect to now that the video has been created
			res.redirect(videourl); //redirect to the url
		} else if (!(thumbext in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
			var viewObj = Object.assign({}, viewObject, {message: "Unsupported file type for thumbnail, please use png, jpeg, or jpg."});
			res.render("submitvideo.ejs", viewObj);
		} else if (!(videoext in acceptedvideo)) { //if the video file types are not supported, then show errors
			var viewObj = Object.assign({}, viewObject, {message: "Unsupported file type for video, please use mp4, ogg, or webm."});
			res.render("submitvideo.ejs", viewObj);
		}
	});
});

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get a unique comment id
	var commentid = await middleware.generateAlphanumId();

	//an array of values to insert into the database
	var valuesarr = [commentid, req.session.user.username, req.session.user.id, req.body.commenttext, req.params.videoid, middleware.getDate(), 0, 0];

	//check to see if the comment belongs to a thread of some sort
	if (typeof req.query.parent_id != 'undefined') {
		//add the comment to the database with the parent id
		valuesarr.push(req.query.parent_id.toString());
		await client.query(`INSERT INTO comments (id, username, userid, comment, videoid, posttime, likes, dislikes, parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, valuesarr);
	} else {
		//add the comment to the database
		await client.query(`INSERT INTO comments (id, username, userid, comment, videoid, posttime, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, valuesarr);
	}

	//redirect to the same view url (the back end will show an updated list of comments)
	//pass a query parameter to let the middleware for this path to know to scroll down to the new comment
	res.redirect(`/v/${req.params.videoid}/?scrollToComment=true&commentid=${commentid}`);
});

//this is a post link to create a new playlist
app.post("/playlist/create", middleware.checkSignedIn, async (req, res) => {
	//generate a new id for the playlist
	var newid = await middleware.generateAlphanumId();

	//get any playlists with matching properties to the one trying to be created
	var results = await client.query(`SELECT * FROM playlists WHERE user_id=$1 AND name=$2`, [req.session.user.id, req.body.name]);

	//check to see if this playlist already exists
	if (results.rows.length > 0) { //if the playlist already exists
		//create an array of errors
		var errors = [{message: "Playlist with the same name already exists."}];
		//view object to be passed to the view
		var viewObj = Object.assign({}, viewObject, {errors: errors});
		//render the create playlist view with errors
		res.render("createplaylist.ejs", viewObj);
	} else { //add the playlist into the db
		//add the details of the playlist into the database
		await client.query(`INSERT INTO playlists (id, name, user_id) VALUES ($1, $2, $3)`, [newid, req.body.name, req.session.user.id]);
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
