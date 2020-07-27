//this is a file to store all of the express functions that handle post requests

//require the modules to work
const bcrypt = require("bcrypt");
const formidable = require("formidable");
const path = require("path");
const approx = require("approximate-number");

const { app, client, middleware, PORT } = require("./configBasic");

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
			//render the register page with errors if there are errors to show the user
			res.render('register.ejs', {errors});
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
				var newuser = await client.query(`INSERT INTO users (id, username, email, password, channelicon, channelbanner) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, password, channelicon, channelbanner`, [newuserid, fields.username, fields.email, hashedPassword, channeliconpath, channelbannerpath]);
				newuser = newuser.rows[0];
				console.log("Registered User.");
				//store the user in the session
				req.session.user = newuser;
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
		res.render("login.ejs", {errors: errors});
	} else {
		//select the users from the database with the specified fields
		var user = await client.query(`SELECT * FROM users WHERE email=$1 OR username=$2`, [req.body.email, req.body.username]);
		user = user.rows[0];
		//check to see if the user exists
		if (typeof user != 'undefined') { //if the user exists, then log them in
			var match = await bcrypt.compare(req.body.password, user.password); //compare the password entered with the password in the db
			if (match) { //if the password is a match, log the user in
				//store the user in the current session
				req.session.user = user;
				//messages to let the server and the client know that a user logged in
				console.log("Logged In!");
				req.flash("message", "Logged In!");
				//redirect to the home page
				res.redirect("/");
			} else { //if the password is incorrect, then let the user know
				res.render("login.ejs", {message: "Password Incorrect."});
			}
		} else { // if the user does not exist, then tell the user
			res.render("login.ejs", {message: "User does not exist."});
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

			//load the video into the database
			var id = await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, creator, user_id, views, posttime) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`, [videoid, fields.title, fields.description, thumbnailpath, videopath, req.session.user, req.session.user.id, 0, middleware.getDate()]);
			var videourl = `/v/${id.rows[0].id}`; //get the url to redirect to now that the video has been created
			res.redirect(videourl); //redirect to the url
		} else if (!(thumbext in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
			res.render("submitvideo.ejs", {message: "Unsupported file type for thumbnail (png, jpeg, or jpg)."});
		} else if (!(videoext in acceptedvideo)) { //if the video file types are not supported, then show errors
			res.render("submitvideo.ejs", {message: "Unsupported file type for video (mp4, ogg, or webm)."});
		}
	});
});

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get a unique comment id
	var commentid = await middleware.generateAlphanumId();

	//put the comment into the database
	await client.query(`INSERT INTO comments (id, username, userid, comment, videoid, posttime, likes, dislikes) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [commentid, req.session.user.username, req.session.user.id, req.body.commenttext, req.params.videoid, middleware.getDate(), 0, 0]);

	//redirect to the same view url (the back end will show an updated list of comments)
	//pass a query parameter to let the middleware for this path to know to scroll down to the new comment
	res.redirect(`/v/${req.params.videoid}/?scrollToComment=true&commentid=${commentid}`);
});

