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

//declare a static directory for stylesheets
app.use(express.static(__dirname + '/views/stylesheets'));

//declare a static directory for the file contents
app.use(express.static(__dirname + "/storage"));

//allow the server to access the files but not the user
app.use("/storage", (req, res, next) => {
	res.status(403);
	res.render("403.ejs");
});


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
			//render the view with the video from the database
			res.render("viewvideo.ejs", {video: results.rows[0]});
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
	if (!username || !email || !password || !password2) {
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
			`SELECT * FROM users WHERE email=$1`,
			[req.body.email],
			(err, results) => {
				if (err) throw err;

				if (results.rows.length > 0) {
					return res.render("register.ejs", {message: "Email Already Regtistered."});
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

	if (!req.body.email || !req.body.password) {
		errors.push({message: "Fill out all fields please."});
	}

	if (errors.length > 0) {
		res.render("login.ejs", {errors: errors});
	} else {
		client.query(
			`SELECT * FROM users WHERE email = $1`,
			[req.body.email],
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
app.post("/v/submit", checkSignedIn, (req, res) => {
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
		var thumbnailpath = "/videos/thumbnails/" + Date.now() + "-" + files.thumbnail.name;

		//store the paths of the files so that the database can know where the files are
		client.query(
			`INSERT INTO videos (title, description, thumbnail, video) VALUES ($1, $2, $3, $4)`,
			[fields.title, fields.description, thumbnailpath, videopath],
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
****************************
* AUTHENTICATION FUNCTIONS *
****************************
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


/*
******************
* ERROR HANDLING *
******************
*/

app.use((req, res) => {
	res.status(404);
	res.render("404.ejs");
});
