//this is a file to store all of the express functions that handle post requests

//require the modules to work
const bcrypt = require("bcrypt");
const formidable = require("formidable");
const path = require("path");
const approx = require("approximate-number");
const fs = require("fs");
const WebSocket = require("ws");

const { app, client, redisClient, middleware} = require("./configBasic");

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
					req.flash("message", "Username Already Taken, Please Try Again.")
					return res.redirect("/register");
				}
			} else { //if the user is a new user, then register them
				var valuesarr = [newuserid, fields.username, fields.email, hashedPassword, channeliconpath, channelbannerpath, fields.channeldesc, fields.topics, streamkey];
				var newuser = await client.query(`INSERT INTO users (id, username, email, password, channelicon, channelbanner, description, topics, streamkey) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, username, email, password, channelicon, channelbanner, streamkey`, valuesarr);
				newuser = newuser.rows[0];
				console.log("Registered User.");
				//add a "Watch Later"playlist into the database which the user cannot delete
				var newplaylistid = await middleware.generateAlphanumId();
				valuesarr = [newuserid, "Watch Later", newplaylistid, 0, false];
				await client.query(`INSERT INTO playlists (user_id, name, id, videocount, candelete) VALUES ($1, $2, $3, $4, $5)`, valuesarr);
				//add this user's username to the redis store with the default score. if the username already exists, add to the score already inside redis
				await middleware.changeWordScore(fields.username, true, 1);
				//loop through the channel topics and add to their scores or set default scores if these words are not in there yet
				await middleware.changeWordScoreArr(fields.topics.split(" "), true, 1);
				//generate a new session id
				var newsessid = middleware.generateSessionId();
				//store the user info inside redis db
				redisClient.set(newsessid, JSON.stringify(newuser));
				//store the session id in the browser of the user
				res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});
				//set the default language to english
				res.cookie("language", "en", {httpOnly: false, expires: 0});
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
		req.flash("errors", errors);
		res.redirect("/login");
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
				//generate a new session id
				var newsessid = middleware.generateSessionId();
				//store the user in redis
				redisClient.set(newsessid, JSON.stringify(user));
				//store the session id on the client side
				res.cookie("sessionid", newsessid, {httpOnly: true, expires: 0});
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
		} else { // if the user does not exist, then tell the user
			req.flash("message", "User does not exist yet, please register.");
			res.redirect("/register");
		}
	}
});

//store the submitted video to the database
app.post("/v/submit", (req, res) => {
	//get the form
	var form = new formidable.IncomingForm();

	//parse the form and store the files
	form.parse(req, async (err, fields, files) => {
		//get user from redis
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		//get the video and thumbnail extensions to be checked (file upload vuln)
		var videoext = path.extname(middleware.getFilePath(files.video, "/storage/videos/files/"));
		var thumbext = path.extname(middleware.getFilePath(files.thumbnail, "/storage/videos/thumbnails/"));

		//make arrays of accepted file types
		var acceptedvideo = [".mp4", ".ogg", ".webm"];
		var acceptedthumbnail = [".png", ".jpeg", ".jpg"];

		//if the video has an mp4, ogg, or webm extension and the thumbnail is a png, jpeg or jpg image, load the video
		if ( (acceptedvideo.includes(videoext)) && (acceptedthumbnail.includes(thumbext)) ) {
			//store the video file submitted
			var videopath = await middleware.saveFile(files.video, "/storage/videos/files/");

			//store the thumbnail file submitted
			var thumbnailpath = await middleware.saveFile(files.thumbnail, "/storage/videos/thumbnails/");

			//store the video details for later reference

			//generate a unique video id for each video (await the result of this function)
			var videoid = await middleware.generateAlphanumId();

			//the array to contain the values to insert into the db
			var valuesArr = [videoid, fields.title, fields.description, thumbnailpath, videopath, userinfo.id, 0, middleware.getDate(), fields.topics, userinfo.username, userinfo.channelicon, true];

			//change/set the word scores for the title of the video, the topics on the video, and the channel's name and topics
			if (fields.includeChannelTopics) {
				//get the topics and remove any duplicate keywords
				var topics = fields.topics.split(" ");
				topics = [...new Set(topics)];
				//get the full array of words
				var wordsArr = fields.title.split(" ").concat(topics, [userinfo.username]);
			} else {
				//get the topics and remove any duplicates
				var topics = fields.topics.split(" ").concat(fields.topics.split(" "));
				topics = [...new Set(topics)];
				//get the full array of words
				var wordsArr = fields.title.split(" ").concat(topics, [userinfo.username]);
			}
			await middleware.changeWordScoreArr(wordsArr, true, 1);

			//load the video into the database
			var id = await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`, valuesArr);
			var videourl = `/v/${id.rows[0].id}`; //get the url to redirect to now that the video has been created
			res.redirect(videourl); //redirect to the url
		} else if (!(thumbext in acceptedthumbnail)){ //if the thumbnail file types are not supported, then show errors
			req.flash("message", "Unsupported file type for thumbnail, please use png, jpeg or jpg.");
			res.redirect("/v/submit");
		} else if (!(videoext in acceptedvideo)) { //if the video file types are not supported, then show errors
			req.flash("Unsupported file type for video, please use mp4, ogg, or webm.");
			res.redirect("/v/submit");
		}
	});
});

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get a unique comment id
	var commentid = await middleware.generateAlphanumId();

	//an array of values to insert into the database
	var valuesarr = [commentid, userinfo.username, userinfo.id, req.body.commenttext, req.params.videoid, middleware.getDate(), 0, 0];

	//check to see if the comment belongs to a thread of some sort
	if (typeof req.query.parent_id != 'undefined') {
		//add the parent id to the values array
		valuesarr.push(req.query.parent_id.toString());

		//get the parent depth level
		var parent_depth = await client.query(`SELECT depth_level FROM comments WHERE id=$1`, [req.query.parent_id]);
		parent_depth = parent_depth.rows[0].depth_level;
		valuesarr.push(parseInt(parent_depth)+1);

		//get the base parent id and put it into the list
		valuesarr.push(req.body.base_parent_id);

		//add the comment into the database
		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, parent_id, depth_level, base_parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, valuesarr);
	} else {
		//add 0 into the list as the depth level
		valuesarr.push(0);

		//add the base parent id into the list
		valuesarr.push(parseInt(req.body.base_parent_id));

		//add the comment to the database
		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, depth_level, base_parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`, valuesarr);
	}

	//redirect to the same view url (the back end will show an updated list of comments)
	//pass a query parameter to let the middleware for this path to know to scroll down to the new comment
	res.redirect(`/v/${req.params.videoid}/?scrollToComment=true&commentid=${commentid}`);
});

//this is a post link to create a new playlist
app.post("/playlist/create", middleware.checkSignedIn, async (req, res) => {
	//get the user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//generate a new id for the playlist
	var newid = await middleware.generateAlphanumId();

	//get any playlists with matching properties to the one trying to be created
	var results = await client.query(`SELECT * FROM playlists WHERE user_id=$1 AND name=$2`, [userinfo.id, req.body.name]);

	//check to see if this playlist already exists
	if (results.rows.length > 0) { //if the playlist already exists
		//set a flash message to let the user know that the playlist already exists
		req.flash("message", "Playlist with the same name already exists.");
		//redirect the user to the playlist in question
		res.redirect(`/p/${results.rows[0].id}`);
	} else { //add the playlist into the db
		//add the details of the playlist into the database
		await client.query(`INSERT INTO playlists (id, name, user_id) VALUES ($1, $2, $3)`, [newid, req.body.name, userinfo.id]);
		//change the word scores of the words in the title of the video and the channel name
		var wordsArr = req.body.name.split(" ").concat([userinfo.username]);
		await middleware.changeWordScoreArr(wordsArr, true, 0.000001);
		//check to see if there is a video that needs to be added to the new playlist
		if (typeof req.body.videoid != 'undefined') {
			//insert the video id and playlist id into the playlistvideos table
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [newid, req.body.videoid]);
			//update the amount of videos in the playlist (which is now 1)
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [1, newid]);
			//change the wordscore of this video
			await changeVideoWordScore(req.body.videoid);
		}
		//redirect to the playlist
		res.redirect(`/p/${newid}`);
	}
});

//this is the post link for starting a new stream on the site
app.post("/l/stream/:type", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//make a form handler in order to save the files and details into the db
	var form = formidable.IncomingForm();

	//generate a unique stream id
	var streamid = await middleware.generateAlphanumId();

	console.log("Stream Id: " + streamid);

	//parse the form and files such as the thumbnail
	form.parse(req, async (err, fields, files) => {
		//variable for storing the stream type
		var streamtype = req.params.type;
		//check for the stream type
		if (req.params.type == "browser") {
			//save the thumbnail of the live stream
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//set all of the database details
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, middleware.getDate(), fields.topics, userinfo.username, userinfo.channelicon, 'true'];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`, valuesarr);
		} else if (req.params.type == "obs") {
			//save the thumbnail and return the path to the thumbnail
			var thumbnailpath = await middleware.saveFile(files.liveThumbnail, "/storage/videos/thumbnails/");

			//save the details into the db excluding the video path
			var valuesarr = [streamid, fields.name, fields.description, thumbnailpath, undefined, userinfo.id, 0, middleware.getDate(), fields.topics, userinfo.username, userinfo.channelicon, 'true', fields.enableChat.toString()];
			await client.query(`INSERT INTO videos (id, title, description, thumbnail, video, user_id, views, posttime, topics, username, channelicon, streaming, enableChat) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, valuesarr);
		}
		//change the word scores for the words in the stream title and the channel name
		if (fields.includeChannelTopics) {
			//get the topics and remove duplicates
			var topics = fields.topics.split(" ").concat(userinfo.topics.split(" "));
			topics = [...new Set(topics)];
			//get the full array of words
			var wordsArr = fields.name.split(" ").concat([userinfo.username], topics);
		} else {
			//get the topics and remove duplicates
			var topics = fields.topics.split(" ");
			topics = [...new Set(topics)];
			//get the full array of words
			var wordsArr = fields.name.split(" ").concat([userinfo.username], fields.topics.split(" "), userinfo.topics.split(" "));
		}
		//change the words inside the wordsArr variable
		await middleware.changeWordScoreArr(wordsArr, true, 1);

		//render the view for the streamer based on the stream type
		res.redirect(`/l/admin/${streamid}?streamtype=${streamtype}`);
	});
});
