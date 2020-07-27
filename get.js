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
app.get("/v/:videoid", async (req, res) => {
	//select the video from the database
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];

	//get the video creator
	var videocreator = JSON.parse(video.creator);

	//update the views on the video
	var views = parseInt(video.views, 10); //get the current amount of views on the video
	var newcount = views + 1; //increase the amount of views on the video
	await client.query(`UPDATE videos SET views=$1 WHERE id=$2`, [newcount, req.params.videoid]); //update the views on the video

	//get videos for the reccomendations
	var videos = await middleware.getReccomendations(video);

	//select the comments that belong to the video
	var comments = await client.query(`SELECT * FROM comments WHERE videoid=$1 ORDER BY posttime DESC`, [req.params.videoid]);
	comments = comments.rows;

	//set the object to be passed to the rendering function
	var viewobj = {video: video, videos: videos, videocreator: videocreator, approx: approx, comments: comments};

	//render the video view based on whether or not the user is logged in and has a session variable
	if (req.session.user) {
		viewobj.user = req.session.user;
	}

	//check to see if the video needs to scroll down to a comment that was just posted
	if (req.query.scrollToComment == "true" && typeof req.query.commentid != 'undefined') {
		viewobj.scrollToComment = true;
		viewobj.commentid = req.query.commentid;
	}

	res.render("viewvideo.ejs", viewobj);
});

//delete a video
app.get("/v/delete/:videoid", async (req, res) => {
	//select the video to be deleted
	var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
	video = video.rows[0];
	console.log("Deleting video with id: " + req.params.videoid);

	//get the video creator
	var videocreator = JSON.parse(video.creator);

	//verify the user is authorized to delete this video
	if (typeof req.session.user != 'undefined') {
		if (videocreator.id == req.session.user.id) { //if the user and the video creator have the same id
			if (videocreator.password == req.session.user.password) {
				//get the file paths for the video files to be deleted
				var videopath = "storage" + video.video;
				var thumbpath = "storage" + video.thumbnail;

				//delete the video file
				fs.unlink(videopath, (err) => {
					if (err) throw err;
					console.log("Deleted Video File!");
				});

				//delete the thumbnail file
				fs.unlink(thumbpath, (err) => {
					if (err) throw err;
					console.log("Deleted Thumbnail!");
				});


				//delete the video from the database
				await client.query(`DELETE FROM videos WHERE id=$1`, [video.id]);
				console.log("Deleted video details.");

				//redirect to the home page
				res.redirect("/");
			} else {
				//get the reccomendations
				var videos = await middleware.getReccomendations(video);

				//render the view and let the user know that they are not authorized to do this action
				res.render("viewvideo.ejs", {video: video, videos: videos, videocreator: videocreator, user: req.session.user, approx: approx, errors: [{message: "Not Authorized To Delete Video."}]});
			}
		} else {
			//get the reccomendations
			var videos = await middleware.getReccomendations(video);

			//render the view and let the user know that they are not authorized to do this action
			res.render("viewvideo.ejs", {video: video, videos: videos, videocreator: videocreator, user: req.session.user, approx: approx, errors: [{message: "Not Authorized To Delete Video."}]});
		}
	}
});

//get request for the like button
app.get("/v/like/:videoid", middleware.checkSignedIn, async (req, res) => {
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
app.get("/v/dislike/:videoid", middleware.checkSignedIn, async (req, res) => {
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
	var autocorrectedquery = middleware.autoCorrect(query, false, false);

	//get the autocorrected string but check for capitalization
	var autocorrectedCapsQuery = middleware.autoCorrect(query, true, false);

	//get the autocorrected string but check for title case
	var autocorrectedTitle = middleware.autoCorrect(query, false, true);

	//check if the original query is different from the autocorrected version
	if (query == autocorrectedquery && query == autocorrectedCapsQuery && query == autocorrectedTitle) { //if both queries are the same, then this means that nothing was autocorrected in the query
		search.autocorrected = false;
		search.autocorrectedNormal = false;
		search.autocorrectedCaps = false;
		search.autocorrectedTitleCase = false;
	} else {
		search.autocorrected = true;
	}
	//check for autocorrected normal
	if (query != autocorrectedquery ) {
		search.autocorrectedNormal = true;
	}
	//check for autocorrecting caps
	if (query != autocorrectedCapsQuery) {
		search.autocorrectedCaps = true;
	}
	//check for autocorrecting title case
	if (query != autocorrectedTitle) {
		search.autocorrectedTitleCase = true;
	}

	//store the autocorrected search query inside the search object
	search.humanquery = query; //the original query
	search.query = autocorrectedquery; //the regular autocorrected query
	search.queryCaps = autocorrectedCapsQuery; //autocorrected while checking for all caps
	search.queryTitle = autocorrectedTitle; //autocorrected checking for title case


	//get the phrases/keywords from the query through the algorithm
	var phrases = middleware.getSearchTerms(search.query);
	var capPhrases = middleware.getSearchTerms(search.queryCaps);
	var titlePhrases = middleware.getSearchTerms(search.queryTitle);

	//add the results for the regular phrases into the results array
	var results = await middleware.searchVideos(phrases, results);

	//add the results for the phrases (checking for capitalization)
	results = results.concat(await middleware.searchVideos(capPhrases, results));

	//store the array of video objects inside the search object
	search.videos = results;


	console.log("Search: " + search.humanquery);

	res.render("searchresults.ejs", {search: search});
});

//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//change the number of likes
	var likes = comment.likes;
	var newcount = likes += 1;

	//get the dislikes
	var dislikes = comment.dislikes;

	//insert the updated amount of likes into the database
	await client.query(`UPDATE comments SET likes=$1 WHERE id=$2`, [newcount, req.params.commentid]);

	//send the likes and dislikes
	var data = [likes, dislikes];
	res.send(data);
});

//a get request for disliking a comment on the site
app.get("/comment/dislike/:commentid", middleware.checkSignedIn, async (req, res) => {
	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//change the number of dislikes
	var dislikes = comment.dislikes;
	var newcount = dislikes += 1;

	//get the likes
	var likes = comment.likes;

	//insert the updated amount of dislikes
	await client.query(`UPDATE comments SET dislikes=$1 WHERE id=$2`, [req.params.commentid]);

	//send the likes and dislikes
	var data = [likes, dislikes];
	res.send(data);
});
