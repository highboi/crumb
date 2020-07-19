//this is a file to store all of the express functions that handle post requests

//require the modules to work
const bcrypt = require("bcrypt");
const formidable = require("formidable");
const path = require("path");

const { app, client, middleware, PORT } = require("./configBasic");

app.post('/register', (req, res) => {
	var form = new formidable.IncomingForm();

	form.parse(req, async (err, fields, files) => {
		//store errors to be shown in the registration page (if needed)
		var errors = [];

		//check for empty values
		if (!fields.username || !fields.email || !fields.password || !fields.password2) {
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

			//check to see if the user doesn't exist already
			client.query(
				`SELECT * FROM users WHERE email=$1 OR username=$2`,
				[fields.email, fields.username],
				(err, results) => {
					if (err) throw err;
					//check to see if the email is registered
					if (results.rows.length > 0) {
						if (results.rows[0].email == fields.email) { //check if the email is registered
							return res.render("register.ejs", {message: "Email is Registered."});
						} else if (results.rows[0].username == fields.username) { //check if the username is registered
							return res.render("register.ejs", {message: "Username is Registered, Please Try Again."});
						}
					} else { //if the user is not registered, register them
						client.query(
							`INSERT INTO users (id, username, email, password, channelicon, channelbanner) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, password`,
							[newuserid, fields.username, fields.email, hashedPassword, channeliconpath, channelbannerpath],
							(err, results) => {
								if (err) throw err;
								console.log("Registered User.");
								//store the user in the session
								req.session.user = results.rows[0];
								//set a flash message to let the user know they are registered
								req.flash("message", "Registered!");
								//redirect the user to the index of the site
								res.redirect('/');
							}
						);
					}
				}
			);
		}
	});
});

//have the user log in
app.post("/login", (req, res) => {
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
		client.query(
			`SELECT * FROM users WHERE email = $1 OR username = $2`,
			[req.body.email, req.body.username],
			(err, results) => {
				if (err) throw err;
				if (typeof results.rows[0] != 'undefined') {
					bcrypt.compare(req.body.password, results.rows[0].password, (err, isMatch) => {
						if (err) throw err;

						if (isMatch) {
							var user = results.rows[0];
							req.session.user = user;
							console.log("Logged In!");
							req.flash("message", "Logged In!");
							res.redirect("/");
						} else {
							res.render("login.ejs", {message: "Password Incorrect."});
						}
					});
				} else {
					res.render("login.ejs", {message: "User does not exist."});
				}
			}
		);
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
			client.query(
				`INSERT INTO videos (id, title, description, thumbnail, video, creator, user_id, views) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
				[videoid, fields.title, fields.description, thumbnailpath, videopath, req.session.user, req.session.user.id, 0],
				(err, results) => {
					if (err) throw err;
					console.log("Saved video files and details.");

					//once the video is saved to the database, then redirect the uploader to their video
					var videourl = `/v/${results.rows[0].id}`;
					res.redirect(videourl);
				}
			);
		} else if (!(thumbext in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
			res.render("submitvideo.ejs", {message: "Unsupported file type for thumbnail (png, jpeg, or jpg)."});
		} else if (!(videoext in acceptedvideo)) { //if the video file types are not supported, then show errors
			res.render("submitvideo.ejs", {message: "Unsupported file type for video (mp4, ogg, or webm)."});
		}
	});
});
