/*
*********************************
* GET DEPENDENCIES FOR THE SITE *
*********************************
*/

const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const bcrypt = require("bcrypt");
const ejs = require("ejs");
const formidable = require("formidable");
const fs = require("fs");
const approx = require("approximate-number");
const crypto = require("crypto");
const path = require("path");

/*
***********************
* BASIC CONFIGURATION *
***********************
*/

//generate the express app
const app = express();

//get the database client to make queries
const client = require("./dbConfig");

//get the port for the server to listen on
const PORT = 3000;

//the salt value for encrypting session data
const SALT = "superawesomesecretsaltime";

//set up the rendering engine for the views
app.set("view engine", "ejs");

//allow the server to parse requests with url encoded payloads
app.use(express.urlencoded({ extended: false }));

//set up the session for the server
app.use(session({
		cookie: {maxAge: 60000},
		secret: SALT, ///the salt to encrypt the information in the session
		resave: false, //do not resave session variables if nothing is changed
		saveUninitialized: false //do not save uninitialized variables
	})
);

//allow the app to use flash messages
app.use(flash());

//declare a static directory for things like stylesheets and other content
app.use(express.static(__dirname + '/views/content'));

//declare a static directory for the file contents of the site
app.use(express.static(__dirname + "/storage"));


/*
************************
* GET REQUEST HANDLING *
************************
*/

//get the index of the site working
app.get('/', (req, res) => {
	//select all of the videos from the database to be displayed
	client.query(
		`SELECT * FROM videos`,
		(err, results) => {
			if (req.session.user) {
				res.render("index.ejs", { message: req.flash('message'), user: req.session.user, videos: results.rows, webroot: __dirname });
			} else {
				res.render("index.ejs", { message: req.flash('message'), videos: results.rows, webroot: __dirname});
			}
		}
	);
});

//get the registration page
app.get('/register', checkNotSignedIn, (req, res) => {
	res.render("register.ejs", { message: req.flash('message') });
});

//get the login page
app.get('/login', checkNotSignedIn, (req, res) => {
	res.render("login.ejs", {message: req.flash("message")});
});

//log the user out of the session
app.get("/logout", checkSignedIn, (req, res) => {
	req.session.user = null;
	console.log("Logged out.");
	req.flash("message", "Logged out!");
	res.redirect("/");
});

//view the channel of the user
app.get("/u/:userid", (req, res) => {
	client.query(
		`SELECT * FROM videos WHERE user_id=$1`,
		[req.params.userid],
		(err, results) => {
			if (err) throw err;
			console.log(results.rows);
			if (typeof results.rows[0] != 'undefined') {
				var creator = JSON.parse(results.rows[0].creator);
				res.render("viewchannel.ejs", {videos: results.rows, creator: creator});
			} else {
				client.query(
					`SELECT * FROM users WHERE id=$1`,
					[req.params.userid],
					(err, results) => {
						if (err) throw err;
						var creator = results.rows[0];
						res.render("viewchannel.ejs", {creator: creator});
					}
				);
			}
		}
	);
});

//get the form for submitting videos
app.get("/v/submit", checkSignedIn, (req, res) => {
	res.render("submitvideo.ejs", { message: req.flash("message") });
});

//views individual videos on the site
app.get("/v/:videoid", (req, res) => {
	client.query(
		`SELECT * FROM videos WHERE id=$1`,
		[req.params.videoid],
		(err, results) => {
			if (err) throw err;
			console.log(`Viewing video with id: ${req.params.videoid}`);
			if (results.rows.length <= 0) {
				res.render("404.ejs");
			} else {
				//store the video
				var video = results.rows[0];
				//get the creator of the video
				var videocreator = JSON.parse(video.creator);
				//get the amount of views that the video currently has
				var views = parseInt(video.views, 10);
				//add 1 to the amount of views that the video has
				var newcount = views + 1;
				console.log(newcount);
				//update the amount of views that the video has
				client.query(
					`UPDATE videos SET views = $1 WHERE id = $2`,
					[newcount, req.params.videoid],
					(err, results) => {
						if (err) throw err;
						console.log("Video has been viewed");
					}
				);
				//get all videos excluding the one being viewed to put in the reccomendations for now
				client.query(
					`SELECT * FROM videos WHERE id != $1`,
					[video.id],
					(err, results) => {
						if (err) throw err;
						//render the view with the video from the database and all of the other videos
						if (req.session.user) {
							res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, user: req.session.user, approx: approx});
						} else {
							res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, approx: approx});
						}
					}
				);
			}
		}
	);
});

//delete a video
app.get("/v/delete/:videoid", (req, res) => {
	//select the video to be deleted
	client.query(
		`SELECT * FROM videos WHERE id=$1`,
		[req.params.videoid],
		(err, results) => {
			if (err) throw err;
			console.log(req.params);
			var video = results.rows[0];
			var videocreator = JSON.parse(video.creator);

			client.query(
				`SELECT * FROM users WHERE id=$1`,
				[videocreator.id],
				(err, results) => {
					if (err) throw err;
					var user = results.rows[0];
					//check to see if the video belongs to the user deleting the video
					if (typeof req.session.user != 'undefined') {
						if (videocreator.id == req.session.user.id) {
							//if the password for the creator of the video matches the password of the current session
							//delete the video (we don't want random people getting the delete link and deleting the video)
							if (req.session.user.password == user.password) {
								//we have to add "storage" to the front of the path because this is relative to the server root
								//the path is stored relative to the storage folder because the views have access to the storage folder already
								//through express.static
								var videopath = "storage" + video.video;
								var thumbpath = "storage" + video.thumbnail;

								fs.unlink(videopath, (err) => {
									if (err) throw err;
									console.log("Deleted Video File!");
								});

								fs.unlink(thumbpath, (err) => {
									if (err) throw err;
									console.log("Deleted Thumbnail!");
								});

								client.query(
									`DELETE FROM videos WHERE id=$1`,
									[video.id],
									(err, results) => {
										if (err) throw err;
										console.log("Deleted Video Details");
										res.redirect("/");
									}
								);
							} else {
								client.query(
									`SELECT * FROM videos WHERE id != $1`,
									[video.id],
									(err, results) => {
										if (err) throw err;
										//render the view with the video from the database and all of the other videos
										if (req.session.user) {
											res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, user: req.session.user, approx: approx, errors: [{message: "Not Authorized to Delete Video."}]});
										} else {
											res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, approx: approx, errors: [{message: "Not Authorized to Delete Video."}]});
										}
									}
								);
							}
						}
					} else {
						client.query(
							`SELECT * FROM videos WHERE id != $1`,
							[video.id],
							(err, results) => {
								if (err) throw err;
								//render the view with the video from the database and all of the other videos
								if (req.session.user) {
									res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, user: req.session.user, approx: approx, errors: [{message: "Not Authorized to Delete Video."}]});
								} else {
									res.render("viewvideo.ejs", {video: video, videos: results.rows, videocreator: videocreator, approx: approx, errors: [{message: "Not Authorized to Delete Video."}]});
								}
							}
						);
					}
				}
			);
		}
	);
});


/*
*************************
* POST REQUEST HANDLING *
*************************
*/

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
			var newuserid = await generateAlphanumId();

			console.log(files);

			//save the channel icon submitted in the form
			if (files.channelicon.name != '') { //if the name is not blank, then a file was submitted
				var channeliconpath = saveFile(files.channelicon, "/storage/users/icons/");
			} else { //if the channel icon file field was empty, use the default image
				var channeliconpath = copyFile("/views/content/default.png", "/storage/users/icons/", "default.png");
			}

			//save the channel banner submitted in the form
			if (files.channelbanner.name != '') { //if the name is not blank, then the file was submitted
				var channelbannerpath = saveFile(files.channelbanner, "/storage/users/banners/");
			} else { //if the name is blank, then the file was not submitted
				var channelbannerpath = copyFile("/views/content/default.png", "/storage/users/banners/", "default.png");
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
		var videoext = path.extname(files.video.path);
		var thumbext = path.extname(files.thumbnail.path);
		//make arrays of accepted file types
		var acceptedvideo = [".mp4", ".ogg", ".webm"];
		var acceptedthumbnail = [".png", ".jpeg", ".jpg"];
		//if the video has an mp4, ogg, or webm extension and the thumbnail is a png, jpeg or jpg image, load the video
		if ( (videoext in acceptedvideo) && (thumbext in acceptedthumbnail) ) {
			//store the video file submitted
			await saveFile(files.video, "/storage/videos/files/");

			//store the thumbnail file submitted
			await saveFile(files.thumbnail, "/storage/videos/thumbnails/");

			//variables to store the path (relative to server root) of the video and thumbnail
			var videopath = "/videos/files/" + Date.now() + "-" + files.video.name;
			var thumbnailpath = "/videos/thumbnails/" + Date.now() + "-" + files.thumbnail.name;

			//store the video details for later reference

			//generate a unique video id for each video (await the result of this function)
			var videoid = await generateAlphanumId();

			//load the video into the database
			client.query(
				`INSERT INTO videos (id, title, description, thumbnail, video, creator, user_id, views) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
				[videoid, fields.title, fields.description, thumbnailpath, videopath, req.session.user, req.session.user.id, 0],
				(err, results) => {
					if (err) throw err;
					console.log("Saved video details in database.");

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

/*
*************************
* LISTEN TO CONNECTIONS *
*************************
*/

//listen for connections to the server
app.listen(PORT, '0.0.0.0', (req, res) => {
	console.log(`Listening on port ${PORT}...`);
});


/*
************************
* MIDDLEWARE FUNCTIONS *
************************
*/

//this is a function that redirects users to the login page if the user is not signed in
//this is used for pages and requests that require a login
function checkSignedIn(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.flash("message", "Not Authorized to visit page.");
		res.redirect("/login");
	}
}

//this is a function to redirect users to the index page if they are signed in already
//this is used for login pages and other forms that sign the user in
function checkNotSignedIn(req, res, next) {
	if (req.session.user) {
		req.flash("message", "Already Logged In!");
		res.redirect("/");
	} else {
		next();
	}
}

//this is the function that generates a unique id for each video
//this function needs to be asynchronous as to allow for
//the value of a DB query to be stored in a variable
async function generateAlphanumId() {
	//generate random bytes for the random id
	var newid = crypto.randomBytes(11).toString("hex");

	console.log("Generated new ID: " + newid);

	//get the response from the database
	var res = await client.query(`SELECT * FROM videos WHERE id=$1`, [newid]);

	//if the database returned more than 0 rows, this means that a video
	//with the generated id exists, meaning that the function must be
	//executed again in order to generate a truly unique id
	if (res.rows.length > 0) {
		generateAlphanumId();
	} else { //if a unique id has been found, return this id
		console.log("Valid ID Found: " + newid.toString());
		return newid;
	}
}

//this is a function for saving a file on to the server
function saveFile(file, path) {
	var oldpath = file.path; //default path for the file to be saved
	var newpath = __dirname + path + Date.now() + "-" + file.name; //new path to save the file on the server
	fs.rename(oldpath, newpath, function(err) { //save the file to the server on the desired path
		if (err) throw err;
		console.log("Saved file to server.");
	});
	//remove the dirname and the /storage folder from the string
	//this is because the ejs views look inside the storage folder already
	newpath = newpath.replace(__dirname, "");
	newpath = newpath.replace("/storage", "");
	//return the new file path to be stored in the database for reference
	return newpath;
}

//this is a function to copy files on the server (used to save default images to peoples channels such as default icons etc.)
function copyFile(oldpath, newpath, filename) {
	//make a full path out of the given path
	oldpath = __dirname + oldpath;
	//make a new path with a timestamp to uniquely identify the file
	var newfilepath = __dirname + newpath + Date.now() + "-" + filename;
	fs.copyFile(oldpath, newfilepath, (err) => {
		if (err) throw err;
		console.log("Copied file on server.");
	});
	//remove the dirname and the /storage folder from the string
	//this is because the ejs views look inside the storage folder already
	newfilepath = newfilepath.replace(__dirname, "");
	newfilepath = newfilepath.replace("/storage", "");
	//return the new file path to be stored in the database
	return newfilepath;
}


/*
******************
* ERROR HANDLING *
******************
*/

app.use((req, res) => {
	res.status(404);
	res.render("404.ejs");
});
