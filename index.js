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
			var creator = JSON.parse(results.rows[0].creator);
			res.render("viewchannel.ejs", {videos: results.rows, creator: creator});
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
					`SELECT * FROM videos WHERE title != $1`,
					[video.title],
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
			console.log(req.params);
			var video = results.rows[0];
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
		}
	);
});


/*
*************************
* POST REQUEST HANDLING *
*************************
*/

app.post('/register', async (req, res) => {
	//store the values submitted in the form
	var { username, email, password, password2 } = req.body;

	//store errors to be shown in the registration page (if needed)
	var errors = [];

	//check for empty values
	if (!username || !password || !password2) {
		errors.push({message: "Please fill all fields."});
	}

	//check for the length of the password (minimum 6 chars)
	if (password.length < 6) {
		errors.push({message: "Password must be at least 6 chars."});
	}

	//check for mismatched passwords
	if (password != password2) {
		errors.push({message: "Passwords do not match"});
	}

	if (errors.length > 0) {
		res.render('register.ejs', {errors});
	} else {
		//hash the password for secure storage in database
		var hashedPassword = await bcrypt.hash(password, 10);

		//check to see if the user doesn't exist already
		client.query(
			`SELECT * FROM users WHERE email=$1 OR username=$2`,
			[req.body.email, req.body.username],
			(err, results) => {
				if (err) throw err;

				if (results.rows.length > 0) {
					if (results.rows[0].email == req.body.email) {
						return res.render("register.ejs", {message: "Email is Registered."});
					} else if (results.rows[0].username == req.body.username) {
						return res.render("register.ejs", {message: "Username is Registered, Please Try Again."});
					}
				} else {
					client.query(
						`INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, password`,
						[req.body.username, req.body.email, hashedPassword],
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
			[req.body.email, req.body.username ],
			(err, results) => {
				if (err) throw err;
				if (typeof results.rows[0] != 'undefined') {
					bcrypt.compare(req.body.password, results.rows[0].password, (err, isMatch) => {
						if (err) throw err;

						if (isMatch) {
							var user = results.rows[0];
							req.session.user = {id: user.id, username: user.username, email: user.email};
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
	form.parse(req, function (err, fields, files) {
		//store the video
		var oldpath = files.video.path; //this is the default path that formidable tries to store the file
		var newpath = __dirname + "/storage/videos/files/" + Date.now() + "-" + files.video.name; //the path where we want to store the file
		fs.rename(oldpath, newpath, function(err) { //move the file to a desired directory
			if (err) throw err;
			console.log("Video Saved.");
		});

		//store the thumbnail
		var oldpath = files.thumbnail.path;
		var newpath = __dirname + "/storage/videos/thumbnails/" + Date.now() + "-" + files.thumbnail.name;
		fs.rename(oldpath, newpath, function(err) {
			if (err) throw err;
			console.log("Thumbnail Saved.");
		});

		//variables to store the path (relative to server root) of the video and thumbnail
		var videopath = "/videos/files/" + Date.now() + "-" + files.video.name;
		if (files.thumbnail) {
			var thumbnailpath = "/videos/thumbnails/" + Date.now() + "-" + files.thumbnail.name;
		} else {
			var thumbnailpath = "None";
		}

		//store the title, description, thumbnail path, video file path, creator object, and user id to the database to be referenced later
		client.query(
			`INSERT INTO videos (title, description, thumbnail, video, creator, user_id, views) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
			[fields.title, fields.description, thumbnailpath, videopath, req.session.user, req.session.user.id, 0],
			(err, results) => {
				if (err) throw err;
				console.log("Saved video details in database.");
				res.redirect("/");
			}
		);
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

function checkSignedIn(req, res, next) {
	if (req.session.user) {
		next();
	} else {
		req.flash("message", "Not Authorized to visit page.");
		res.redirect("/login");
	}
}

function checkNotSignedIn(req, res, next) {
	if (req.session.user) {
		req.flash("message", "Already Logged In!");
		res.redirect("/");
	} else {
		next();
	}
}

function videoReccomendations(video) {
	//get the title of the video to be analyzed
	var title = video.title;

	//get the keywords from the title
	var keywords = title.split(" ");

	//an array of words to ignore when reccomending videos for the user
	var ignoreWords = ["for", "and", "nor", "but", "or", "yet", "so", "after", "as", "before", "if", "just", "now", "once", "since", "supposing", "that", "though", "until", "whenever", "whereas", "whenever", "which", "who", "although", "much", "because", "even"];

	//remove irrelevant words from the stored list of keywords
	ignoreWords.forEach((item, index) => {
		keywords.forEach((keyword, index2) => {
			if (item == keyword) {
				keywords.splice(index2, 1);
			}
		});
	});
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
