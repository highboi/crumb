//this is a file to handle all of the get requests for the server

const { app, client, middleware, PORT} = require("./configBasic");

const fs = require("fs");
const approx = require("approximate-number");

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
app.get('/register', middleware.checkNotSignedIn, (req, res) => {
	res.render("register.ejs", { message: req.flash('message') });
});

//get the login page
app.get('/login', middleware.checkNotSignedIn, (req, res) => {
	res.render("login.ejs", {message: req.flash("message")});
});

//log the user out of the session
app.get("/logout", middleware.checkSignedIn, (req, res) => {
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
app.get("/v/submit", middleware.checkSignedIn, (req, res) => {
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
				//update the amount of views that the video has
				client.query(
					`UPDATE videos SET views = $1 WHERE id = $2`,
					[newcount, req.params.videoid],
					(err, results) => {
						if (err) throw err;
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
			console.log("Deleting video with id: " + req.params.videoid);
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

//get request for the like button
app.get("/like/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM liked WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM disliked WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//change the number of likes on the video based on if the user liked it or not
	if (liked.rows.length == 0) {
		var likes = await middleware.changeLikes(req, res, true, true);
		await client.query(`INSERT INTO liked (videoid, userid) VALUES ($1, $2)`, [req.params.videoid, req.session.user.id]);
	} else if (liked.rows.length > 0) {
		var likes = await middleware.changeLikes(req, res, false, true);
		await client.query(`DELETE FROM liked WHERE videoid=$1 AND userid=$2`, [req.params.videoid, req.session.user.id]);
	}

	//change the amount of dislikes on the video based on if the video is already dislikes
	if (disliked.rows.length > 0) {
		var dislikes = await middleware.changeLikes(req, res, false, false);
		await client.query(`DELETE FROM disliked WHERE videoid=$1 AND userid=$2`, [req.params.videoid, req.session.user.id]);
	} else {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
		var dislikes = video.rows[0].dislikes;
	}

	var data = [likes, dislikes];
	res.send(data);
});

//get request for the dislike button
app.get("/dislike/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the disliked video from the database
	var disliked = await client.query(`SELECT * FROM disliked WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//get the liked video from the database
	var liked = await client.query(`SELECT * FROM liked WHERE userid=$1 AND videoid=$2`, [req.session.user.id, req.params.videoid]);

	//change the amount of dislikes on the video based on if the user disliked it or not
	if (disliked.rows.length == 0) {
		var dislikes = await middleware.changeLikes(req, res, true, false);
		await client.query(`INSERT INTO disliked (videoid, userid) VALUES ($1, $2)`, [req.params.videoid, req.session.user.id]);
	} else if (disliked.rows.length > 0) {
		var dislikes = await middleware.changeLikes(req, res, false, false);
		await client.query(`DELETE FROM disliked WHERE videoid=$1 AND userid=$2`, [req.params.videoid, req.session.user.id]);
	}

	//change the amount of dislikes on the video based on if the video is already dislikes
	if (liked.rows.length > 0) {
		var likes = await middleware.changeLikes(req, res, false, true);
		await client.query(`DELETE FROM liked WHERE videoid=$1 AND userid=$2`, [req.params.videoid, req.session.user.id]);
	} else {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
		var likes = video.rows[0].likes;
	}

	var data = [likes, dislikes];
	res.send(data);
});

//get request for subscribing to a channel
app.get("/subscribe/:channelid", middleware.checkSignedIn, async (req, res) => {
	//get the subscribed channel from the database
	var channel = await client.query(`SELECT * FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.session.user.id]);

	console.log("Request recieved.");

	//check to see what to do to update the subscribed list
	if (channel.rows.length == 0) { //if the user has not subscribed to this channel yet, then add the user id and channel id into the database
		await client.query(`INSERT INTO subscribed (channel_id, user_id) VALUES ($1, $2)`, [req.params.channelid, req.session.user.id]);
		//send a response that is true, meaning that the user has subscribed
		res.send("true");
	} else if (channel.rows.length > 0) { //if the user has already subscribed to the channel, then the user wants to undo the subscription (a confirm in javascript will be done in the front end to check if the user clicked accidentally)
		await client.query(`DELETE FROM subscribed WHERE channel_id=$1 AND user_id=$2`, [req.params.channelid, req.session.user.id]);
		//send a response that is false, meaning the user unsubscribed
		res.send("false");
	}
});

//get request for searching for videos
app.get("/search", async (req, res) => {
	//a search object to store things about our search
	var search = {};

	//store the query in a variable so that it will be easier to recall the variable
	var query = req.query.searchquery;

	//get the autocorrected string
	var autocorrectedquery = middleware.autoCorrect(query);

	//check if the original query is different from the autocorrected version
	if (query == autocorrectedquery) { //if both queries are the same, then this means that nothing was autocorrected in the query
		search.autocorrected = false;
	} else { //if the original query and the autocorrected query are different, this means that the search was autocorrected
		search.autocorrected = true
	}

	//store the autocorrected search query inside the search object
	search.humanquery = query;
	search.query = autocorrectedquery;


	//a variable to store the results of the video
	var results = [];

	//get the phrases/keywords from the query through the algorithm
	var phrases = middleware.getSearchTerms(search.query);

	//loop through the extracted phrases to find videos with titles or descriptions containing the key phrases
	for (var i=0; i<phrases.length; i++) {
		//get all of the videos containing the phrase in the title
		var result = await client.query(`SELECT * FROM videos WHERE title LIKE $1`, ["%" + phrases[i] + "%"]);
		//check to see that the same video is not put into the results twice
		result.rows.forEach((item, index) => {
			//a variable to use to check if a video has been added
			var added = false;
			//loop through the videos already in the results array and compare them to the videos found in the current query
			for (var j=0; j<results.length; j++) {
				//if the video has been added already, then set the added variable to true so that we do not add it in the results again
				if (JSON.stringify(item) == JSON.stringify(results[j])) {
					added = true;
				}
			}
			//if the video has not been added, then add it to the results array
			if (!added) {
				results.push(item);
			}
		});
	}

	//store the array of video objects inside the search object
	search.videos = results;


	console.log("Search: " + search.humanquery);

	res.render("searchresults.ejs", {search: search});
});
