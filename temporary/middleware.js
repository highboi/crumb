//this is a file for storing middleware functions and functions to help the code
//to look better

//get the necessary dependencies for use in this file
const fs = require("fs");
const client = require("./dbConfig");
const redisClient = require("./redisConfig");
const crypto = require("crypto");
const {v4: uuidv4} = require("uuid");
const readline = require("readline");
const schedule = require("node-schedule");
const approx = require("approximate-number");

//get the write stream to write to the log file
const logger = require("./logger");

middleware = {
	//this is a function that redirects users to the login page if the user is not signed in
	//this is used for pages and requests that require a login
	checkSignedIn: function (req, res, next) {
		if (req.cookies.hasOwnProperty('sessionid')) {
			next();
		} else {
			req.flash("message", "Please sign in.");
			res.redirect("/login");
		}
	},

	//this is a function to redirect users to the index page if they are signed in already
	//this is used for login pages and other forms that sign the user in
	checkNotSignedIn: function (req, res, next) {
		if (req.cookies.hasOwnProperty('sessionid')) {
			req.flash("message", "Already Logged In!");
			res.redirect("/");
		} else {
			next();
		}
	},

	//this is a function to insert universal things into the view object such as flash messages
	//and language translation
	getViewObj: async function(req) {
		//create the view object
		var viewObj = {};

		//insert the user info and other info related to a user
		if (typeof req.cookies.sessionid != 'undefined') {
			//get user info
			viewObj.user = await middleware.getUserSession(req.cookies.sessionid);
			//insert subscribed channels
			var subscribedChannels = await client.query(`SELECT channel_id FROM subscribed WHERE user_id=$1`, [viewObj.user.id]);
			viewObj.subscribedChannels = subscribedChannels.rows.map((obj) => {return obj.channel_id});
		} else {
			viewObj.subscribedChannels = [];
		}

		//insert the flash message
		viewObj.message = req.flash("message");

		//insert the flash errors
		viewObj.errors = req.flash("errors");

		//insert the number approximator (turns 1000 to 1k, etc)
		viewObj.approx = approx;

		//insert the language cookie value
		if (typeof req.cookies.language != 'undefined') {
			viewObj.language = req.cookies.language;
		}

		//return the view object with the complete set of stuff
		return viewObj;
	},

	//this is the function that generates a unique id for each video
	//this function needs to be asynchronous as to allow for
	//the value of a DB query to be stored in a variable
	generateAlphanumId: async function () {
		//get the supposed new id
		var newid = uuidv4();

		console.log("Generated new ID: " + newid);

		//get the response from the database
		var res = await client.query(`SELECT * FROM videos WHERE id=$1`, [newid]);

		//get comment ids
		var commentres = await client.query(`SELECT * FROM comments WHERE id=$1`, [newid]);

		//get the playlist ids
		var playlistres = await client.query(`SELECT * FROM playlists WHERE id=$1`, [newid]);

		//if the database returned more than 0 rows, this means that a video
		//with the generated id exists, meaning that the function must be
		//executed again in order to generate a truly unique id
		if (res.rows.length > 0 || commentres.rows.length > 0 || playlistres.rows.length > 0) {
			middleware.generateAlphanumId();
		} else { //if a unique id has been found, return this id
			console.log("Valid ID Found: " + newid.toString());
			return newid;
		}
	},

	//this is a function that generates stream keys for OBS streaming
	generateStreamKey: async function () {
		//generate random bytes for the user's stream key instead of using uuid
		var newid = crypto.randomBytes(32).toString("base64");

		//check to see if there are any existing users with the same stream key
		var res = await client.query(`SELECT * FROM users WHERE streamkey=$1`, [newid]);

		if (res.rows.length > 0) {
			middleware.generateStreamKey();
		} else {
			console.log("Valid Stream Key Found: " + newid.toString());
			return newid;
		}
	},

	//this is a function for generating a unique session id
	generateSessionId: function () {
	    var sha = crypto.createHash('sha256');
	    sha.update(Math.random().toString());
	    return sha.digest('hex');
	},

	//this gets a user from the redis session store and returns the object for this user
	getUserSession: async function (sessionid) {
		var userinfo = await redisClient.getAsync(sessionid);
		return JSON.parse(userinfo);
	},

	//this is a function to return all of the cases of a string (titlecase, all caps, lowercase)
	getAllStringCases: function (words) {
		//get the string version in lowercase, uppercase, and titlecase
		var lowercase = words.toLowerCase();
		var uppercase = words.toUpperCase();
		var titlecase = words.replace(
			/\w\S*/g,
			function(txt) {
				return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
			}
		);

		//return an array with all of these types of cases
		return [lowercase, titlecase, uppercase];
	},

	//this is a function to delete video details
	deleteVideoDetails: async function (userinfo, videoid) {
		//get the video to be deleted
		var video = await client.query(`SELECT thumbnail, video, user_id FROM videos WHERE id=$1`, [videoid]);
		video = video.rows[0];
		//get the paths of the files for the thumbnail and the video
		var thumbnailpath = __dirname + "/storage" + video.thumbnail;
		var videopath = __dirname + "/storage" + video.video;
		//check to see if the user trying to delete the video actually owns the video
		if (userinfo.id == video.user_id) {
			//delete all of the playlist entries for this video
			await client.query(`DELETE FROM playlistvideos WHERE video_id=$1`, [videoid]);
			//delete all of the comments for this video
			await client.query(`DELETE FROM comments WHERE video_id=$1`, [videoid]);
			//delete the video file entry and the comment file entries
			await client.query(`DELETE FROM videofiles WHERE parentid=$1`, [videoid]);
			await client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);
			//delete the video details in the database
			await client.query(`DELETE FROM videos WHERE id=$1`, [videoid]);
			//delete the actual files for the video and thumbnail
			fs.unlink(videopath, (err) => {
				if (err) throw err;
			});
			fs.unlink(thumbnailpath, (err) => {
				if (err) throw err;
			});
			//return true as the files and database entry were successfully deleted
			return true;
		} else { //if the video does not belong to the user, return false
			return false;
		}
	},

	//this is a function to delete playlist details
	deletePlaylistDetails: async function (userinfo, playlistid) {
		var playlist = await client.query(`SELECT user_id FROM playlists WHERE id=$1`, [playlistid]);
		playlist = playlist.rows[0];

		//if the playlist's user id matches the given user info, then delete the playlist video entries
		//as well as the playlist itself and return true on success
		if (playlist.user_id == userinfo.id) {
			await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1`, [playlistid]);
			await client.query(`DELETE FROM playlists WHERE id=$1`, [playlistid]);
			return true;
		} else { //if the playlist apparently does not belong to the user, then return false
			return false;
		}
	},

	//this is a function that returns a path for a file you want to save
	getFilePath: function (file, path) {
		var filepath = path + Date.now() + "-" + file.name;
		filepath = filepath.replace("/storage", "");
		return filepath;
	},

	//this is a function for saving a file on to the server
	saveFile: function (file, path) {
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
	},

	//this is a function to copy files on the server (used to save default images to peoples channels such as default icons etc.)
	copyFile: function (oldpath, newpath, filename) {
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
	},


	//this is a function to increase/decrease likes/dislikes of videos in the database
	changeLikes: async function (req, res, increase, changelikes) {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1`, [req.params.videoid]);
		if (changelikes == true) {
			var likes = parseInt(video.rows[0].likes, 10);
			//increase or decrease the amount of likes based on the increase parameter
			if (increase) {
				var newcount = likes+=1;
			} else {
				var newcount = likes-=1;
			}
			//update the amount of likes on the video
			await client.query(`UPDATE videos SET likes=$1 WHERE id=$2`, [newcount, req.params.videoid]);
			//return the updated amount of dislikes
			return newcount.toString();
		} else if (changelikes == false) {
			var dislikes = parseInt(video.rows[0].dislikes, 10);
			//increase or decrease the amount of dislikes based on the increase parameter
			if (increase) {
				var newcount = dislikes+=1;
			} else {
				var newcount = dislikes-=1;
			}
			//update the amount of dislikes on the video
			await client.query(`UPDATE videos SET dislikes=$1 WHERE id=$2`, [newcount, req.params.videoid]);
			//return the value of the updated dislikes
			return newcount.toString();
		}
	},

	//this is a function to schedule a job for a function. this uses the cron format for
	//scheduling jobs
	scheduleFunction: function(cronstring, job) {
		schedule.scheduleJob(cronstring, job);
	},

	//this is a function that changes the word score in the wordlist file
	changeWordScore: async function (word, add, amount) {
		//get the current wordscore
		var wordscore = await client.query(`SELECT score FROM commonwords WHERE word=$1`, [word]);
		wordscore = wordscore.rows[0];

		//check to see if this words exists inside the redis store
		if (typeof wordscore != 'undefined') {
			//get the actual score attribute now that we know that this is a defined entry in the database
			wordscore = wordscore.score;

			//check to see if we add or subtract from the wordscore
			if (add) {
				wordscore = wordscore + amount;
			} else {
				wordscore = wordscore - amount;
			}

			//set the wordscore of this word
			await client.query(`UPDATE commonwords SET score=$1 WHERE word=$2`, [wordscore, word]);
		} else { //if the word does not exist yet
			//set the default word score
			await client.query(`INSERT INTO commonwords (word, score) VALUES ($1, $2)`, [word, 0]);
		}
	},

	//this is a function that loops through all of the wordlist terms in an array and changes the wordscore
	changeWordScoreArr: function (words, add, amount) {
		//loop through the word array provided in the parameters
		words.forEach(async (item, index) => {
			await middleware.changeWordScore(item, add, amount);
		});
	},

	//this is a function to update the wordscore of a video
	changeVideoWordScore: async function (videoid) {
		//get the video information
		var video = await client.query(`SELECT topics, title, username, user_id FROM videos WHERE id=$1`, videoid);
		video = video.rows[0];
		//change the wordscore of each of these attributes
		var wordsArr = video.title.split(" ").concat([video.username], video.topics.split(" "));
		//change the actual wordscore for each word/phrase
		await changeWordScoreArr(wordsArr, true, 1);
	},

	//this is a function that puts together a list of phrases to use in our search algorithm
	getSearchTerms: function (searchterm) {
		//break the search term into individual words
		searchterm = searchterm.split(" ");
		//get the length of the search term
		var searchlength = searchterm.length;

		//array of terms
		var terms = [];

		//have a for loop decreasing the amount of words to work with in each examination
		for (var i=searchlength; i>0; i--) {
			//the amount of times to loop
			var looptimes = (searchlength+1)-i;
			//store the subterms
			var subterms = [];
			//looping through the substrings
			for (var j=0; j<looptimes; j++) {
				var end = j + i;
				//include subterms with and without special characters just in case
				var subterm = searchterm.slice(j, end).join(" ");
				var subterm2 = subterm.replace(/[^a-zA-Z ]/g, "");
				subterms.push(subterm);
				subterms.push(subterm2);
			}
			//add the new phrases to the array
			terms = terms.concat(subterms);
		}

		return terms;
	},

	//this is a function that selects videos from the database based on a given array of search terms and a selector (i.e what if we only want titles?)
	searchVideos: async (selector, phrases) => {
		//an array to store all of the video objects selected from the database
		var results = [];
		//get all of the videos from the database with titles like the search term
		for (var i=0; i<phrases.length; i++) {
			//get all of the videos from the database with a title matching the current term
			var result = await client.query(`SELECT ${selector} FROM videos WHERE UPPER(title) LIKE UPPER($1) OR UPPER(description) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($1) OR UPPER(username) LIKE UPPER($1)`, ["%" + phrases[i] + "%"]);
			//check to see that the same video is not included in the results twice
			result.rows.forEach((item, index) => {
				//a boolean to check to see if the video has been added
				var added = false;
				//loop through the videos already in the results array and compare the two objects as strings
				for (var j=0; j<results.length; j++) {
					//if the video in the results and the video in the results array are the same, then the video has been added
					if (JSON.stringify(results[j]) == JSON.stringify(item)) {
						added = true;
					}
				}
				//if the video has not been added, then add the video to the results
				if (!added) {
					results.push(item);
				}
			});
		}
		//return the results
		return results;
	},

	//this is a function that returns the channels that come up in search results
	searchChannels: async (selector, phrases) => {
		var results = [];
		for (var i=0; i < phrases.length; i++) {
			var result = await client.query(`SELECT ${selector} FROM users WHERE UPPER(username) LIKE UPPER($1) OR UPPER(description) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($1)`, ["%" + phrases[i] +"%"]);
			result.rows.forEach((item, index) => {
				var added = false;
				for (var j=0; j < results.length; j++) {
					if (JSON.stringify(results[j]) == JSON.stringify(item)) {
						added = true;
					}
				}
				if (!added) {
					results.push(item);
				}
			});
		}
		return results;
	},

	//this is a function that returns the playlists that come up in the search results
	searchPlaylists: async (selector, phrases) => {
		var results = [];
		for (var i=0; i < phrases.length; i++) {
			var result = await client.query(`SELECT ${selector} FROM playlists WHERE UPPER(name) LIKE UPPER($1)`, ["%" + phrases[i] + "%"]);
			result.rows.forEach((item, index) => {
				var added = false;
				for (var j=0; j < results.length; j++) {
					if (JSON.stringify(results[j]) == JSON.stringify(item)) {
						added = true;
					}
				}
				if (!added) {
					results.push(item);
				}
			});
		}
		return results;
	},

	//this is a function for getting the reccomendations for the videos according to the title and description of the video being viewed
	getReccomendations: async function (video) {
		//get a list of phrases to use in searching for results in the database
		var phrases = middleware.getSearchTerms(video.title);

		//get the results of searching for the videos based on the list of phrases in the db
		var vids = await middleware.searchVideos("*", phrases);

		//eliminate the video from the list if the video being viewed is in the list
		vids.forEach((item, index) => {
			if (item.id == video.id) {
				vids.splice(index, 1);
			}
		});

		//return the videos
		return vids;
	},

	//this is a function that counts the amount of hits on the site
	hitCounter: async function(req, res, next) {
		//get the session info of the user
		if (typeof req.cookies.sessionid != 'undefined') {
			var userinfo = await middleware.getUserSession(req.cookies.sessionid);
		}

		//if this is a get request, then this is a hit
		if (req.method == "GET") {
			console.log("HIT FROM: " + req.ip.toString());
			if (typeof userinfo != 'undefined' && userinfo != null) {
				var logstring = `GET ${req.url.toString()} FROM --> IP: ${req.ip.toString()}, ID: ${userinfo.id}, USERNAME: ${userinfo.username}`;
			} else {
				var logstring = `GET ${req.url.toString()} FROM --> IP: ${req.ip.toString()}`;
			}
			middleware.log("info", logstring);
		}

		//check to see if this is a post request in order to log actions on the site
		if (req.method == "POST") {
			console.log("ACTION FROM: " + req.ip.toString());
			if (typeof userinfo != 'undefined') {
				var logstring = `POST ${req.url.toString()} FROM --> IP: ${req.ip.toString()}, ID: ${userinfo.id}, USERNAME: ${userinfo.username}`;
			} else {
				var logstring = `POST ${req.url.toString()} FROM --> IP: ${req.ip.toString()}`;
			}
			middleware.log("info", logstring);
		}

		//go to the next action on the server
		next();
	},

	//this is a function that writes to a log file to see the traffic
	log: function(level, message) {
		//get the human readable time/date info
		var currenttime = new Date().toISOString();

		//combine the date and time with the message
		message = `(${currenttime[1]} : ${currenttime[0]}) --> ${message}`;

		//log the message to the file
		logger.log({level: level, message: message})
	},

	//this is a function that executes whenever the node process is killed (server shuts down)
	shutDown: function() {
		//delete all magnet links from all videos in the database (these are invalid now)
		client.query("UPDATE videos SET magnetlink = null").then((res) => {
			console.log("DELETED MAGNET LINKS");
		}).catch((err) => {
			console.log(err);
		});

		//message that the server is shutting down
		console.log("Shutting Down...");

		//exit the node process
		process.exit(0);
	},

	//check to see if the server should execute the shutdown process
	onShutdown: function() {
		//if the node server is interrupted or terminated, execute the shutdown process
		process.on("SIGINT", middleware.shutDown);
		process.on("SIGTERM", middleware.shutDown);
	},

	//this is a function to handle the likes on certain elements of the site
	handleLikes: async function(req, element, liked, disliked, likedTable, dislikedTable) {
		//get the user info from redis session store
		var userinfo = await redisClient.getAsync(req.cookies.sessionid);
		userinfo = JSON.parse(userinfo);

		//get the user id and the element id
		var userid = userinfo.id.toString();
		var elementid = element.id.toString();

		//get the id column name based on if the element has a video or not
		if (typeof element.video != 'undefined') {
			var idcolumn = "video_id";
		} else {
			var idcolumn = "comment_id";
		}

		//handle the liking and unliking of the element
		if (liked.rows.length == 0) {
			var likes = parseInt(element.likes, 10)
			likes = likes + 1;
			likes = likes.toString();
			var querystring = `INSERT INTO ${likedTable} (userid, ${idcolumn}) VALUES (\'${userid}\', \'${elementid}\')`;
			await client.query(querystring);
		} else if (liked.rows.length > 0) {
			var likes = parseInt(element.likes, 10);
			likes = likes - 1;
			likes = likes.toString();
			var querystring = `DELETE FROM ${likedTable} WHERE userid=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		//handle any dislikes that come up
		if (disliked.rows.length == 0) {
			var dislikes = element.dislikes.toString();
		} else if (disliked.rows.length > 0) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes - 1;
			dislikes = dislikes.toString();
			var querystring = `DELETE FROM ${dislikedTable} WHERE userid=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		return [likes, dislikes];
	},

	//this is a function to handle the dislikes on certain elements of the site
	handleDislikes: async function (req, element, liked, disliked, likedTable, dislikedTable) {
		//get the user info from redis session store
		var userinfo = await redisClient.getAsync(req.cookies.sessionid);
		userinfo = JSON.parse(userinfo);

		//get the userid and element id
		var userid = userinfo.id.toString();
		var elementid = element.id.toString();

		//get the id column name
		if (typeof element.video != 'undefined') {
			var idcolumn = "video_id";
		} else {
			var idcolumn = "comment_id";
		}

		//handle the disliking and the un-disliking of the element
		if (disliked.rows.length == 0) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes + 1;
			dislikes = dislikes.toString();
			var querystring = `INSERT INTO ${dislikedTable} (userid, ${idcolumn}) VALUES (\'${userid}\', \'${elementid}\')`;
			await client.query(querystring);
		} else if (disliked.rows.length > 0) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes - 1;
			dislikes = dislikes.toString();
			var querystring = `DELETE FROM ${dislikedTable} WHERE userid=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		//handle any likes that come up
		if (liked.rows.length == 0) {
			var likes = element.likes.toString();
		} else if (liked.rows.length > 0) {
			var likes = parseInt(element.likes, 10);
			likes = likes - 1;
			likes = likes.toString();
			var querystring = `DELETE FROM ${likedTable} WHERE userid=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		return [likes, dislikes];
	}
}

//export the object with all of the middleware functions
module.exports = middleware;
