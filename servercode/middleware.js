//this is a file for storing middleware functions and functions to help the code
//to look better

//get the necessary dependencies for use in this file
const fs = require("fs");
const client = require("./dbConfig");
const redisClient = require("./redisConfig");
const crypto = require("crypto");
const readline = require("readline");
const approx = require("approximate-number");
const ffmpeg = require("ffmpeg");
const got = require("got");
const stripe = require("stripe")(process.env.SECRET_STRIPE_KEY);

//get the write stream to write to the log file
const logger = require("./logger");

/*
OBJECT STORING FUNCTIONS THAT AUTHENTICATE THE USER BETWEEN REQUESTS
*/
var userauthFunctions = {
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

	//this is a function that checks to see if this user has been given a temporary session
	//id in order to identify this user as a "visitor" to the site
	checkNotAssigned: async function (req, res, next) {
		//check for the existence of a session id and whether or not there are cookies
		if (!Object.keys(req.cookies).length || ( Object.keys(req.cookies).length && !req.cookies.hasOwnProperty('tempsessionid') && !req.cookies.hasOwnProperty('sessionid') ) ) { //if the user does not have a session id
			//generate a new session id
			var newTempId = await middleware.generateSessionId();

			//set this new session id as the temporary session id (id used until sign-in or registration)
			res.cookie("tempsessionid", newTempId, {httpOnly: true, expires: 0});

			//add this user to the redis store with blank info
			redisClient.set(newTempId, "empty");

			//get the amount of days we want to make the session last
			var daysExpire = process.env.DAYS_EXPIRE * (24 * 60 * 60);

			//set a timeout for this entry so that we don't keep sessions that don't exist
			redisClient.sendCommandAsync("EXPIRE", [newTempId, daysExpire]);

			//go to the next middleware function in the chain
			next();
		} else { //if the user has a session id
			next();
		}
	}
};

/*
OBJECT WHICH STORES FUNCTIONS THAT HANDLE REQUEST INFORMATION
*/
var reqHandling = {
	//this is a function to insert universal things into the view object such as flash messages
	//and language translation
	getViewObj: async function(req, res) {
		//create the view object
		var viewObj = {};

		//insert the user info and other info related to a user
		if (typeof req.cookies.sessionid != 'undefined') {
			//get user info
			viewObj.user = await middleware.getUserSession(req.cookies.sessionid);

			//make sure the user is registered in the session store first
			if (typeof viewObj.user != 'undefined') {
				//insert subscribed channels
				var subscribedChannels = await client.query(`SELECT channel_id FROM subscribed WHERE user_id=$1`, [viewObj.user.id]);
				viewObj.subscribedChannels = subscribedChannels.rows.map((obj) => {return obj.channel_id});
				//insert the playlists of the users
				var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [viewObj.user.id]);
				viewObj.playlists = playlists.rows;
			} else {
				res.cookie('sessionid', '', {expires: new Date(0)});
			}
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

	//a function for getting the relevant information about a video for the view object
	getVideoInfo: async function (video) {
		//get the creator of the video
		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
		videocreator = videocreator.rows[0];

		//get the comments for this video
		var comments = await client.query(`SELECT * FROM comments WHERE video_id=$1`, [video.id]);
		comments = comments.rows;

		//get the accepted resolutions for this video
		var resolutions = await client.query(`SELECT resolution FROM videofiles WHERE id=$1 LIMIT 1`, [video.id]);
		resolutions = resolutions.rows[0].resolution;

		//get the subtitles object according to the file of this video
		if (video.subtitles != null) {
			var subtitles = await middleware.getSubtitles(global.appRoot + "/storage" + video.subtitles);
		} else {
			var subtitles = video.subtitles;
		}

		//select all of the chat messages that were typed if this was a live stream
		var chatReplayMessages = await client.query(`SELECT * FROM livechat WHERE stream_id=$1`, [video.id]);

		//check to see if the chat replay messages are undefined or not
		if (typeof chatReplayMessages.rows != 'undefined' && chatReplayMessages.rows.length > 0) {
			//get all of the user ids from the live chat and remove duplicates by putting them in a set
			var chatUserIds = chatReplayMessages.rows.map((item) => {
				return item.user_id;
			});
			chatUserIds = [...new Set(chatUserIds)];

			//put the channel icons and usernames associated with the user ids above into an object
			var chatMessageInfo = {};

			//use the .map() method with async function to iterate over promises which are passed to Promise.all(),
			//which can then be "awaited" on to finish/complete all promises being iterated before proceeding
			await Promise.all(chatUserIds.map(async (item) => {
				//get the channel icon and username if this user with this id
				var userChatInfo = await client.query(`SELECT channelicon, username FROM users WHERE id=$1 LIMIT 1`, [item]);
				userChatInfo = userChatInfo.rows[0];

				//insert the channel icon and username into the object with the key being the user id
				chatMessageInfo[item] = userChatInfo;
			}));

			//map the chat replay messages to have both the original chat message object and the extra user info all in one object
			chatReplayMessages = chatReplayMessages.rows.map((item) => {
				return Object.assign({}, item, chatMessageInfo[item.user_id]);
			});
		} else {
			chatReplayMessages = undefined;
		}

		//create an object out of all of this information
		var videoInfo = {videocreator: videocreator, comments: comments, resolutions: resolutions, subtitles: subtitles, chatReplayMessages: chatReplayMessages};
		return videoInfo;
	},

	//this is a function that generates a new alphanumeric id
	generateAlphanumId: async function () {
		//alphanumeric character set
		var chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";

		//a string to store the resulting id
		var resultid = "";

		//add 8 random alphanumeric characters to the result id variable
		for (var i=0; i < 8; i++) {
			resultid += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		/*
		check this result alphanumeric id against all DB entries that use unique new ids
		*/
		//check against users
		var user = await client.query(`SELECT id FROM users WHERE id=$1 LIMIT 1`, [resultid]);
		user = user.rows.length;

		//check against videos
		var video = await client.query(`SELECT id FROM videos WHERE id=$1 LIMIT 1`, [resultid]);
		video = video.rows.length;

		//check against comments
		var comment = await client.query(`SELECT id FROM comments WHERE id=$1 LIMIT 1`, [resultid]);
		comment = comment.rows.length;

		//check against playlists
		var playlist = await client.query(`SELECT id FROM playlists WHERE id=$1 LIMIT 1`, [resultid]);
		playlist = playlist.rows.length;

		//check for the existence of anything in the DB with this same id
		if (user || video || comment || playlist) {
			return await middleware.generateAlphanumId();
		} else {
			console.log("VALID ID FOUND:", resultid);
			return resultid;
		}
	},

	//this is a function that generates stream keys for OBS streaming
	generateStreamKey: async function () {
		//generate random bytes for the user's stream key instead of using uuid
		var newid = crypto.randomBytes(32).toString("base64");

		//check to see if there are any existing users with the same stream key
		var res = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [newid]);

		if (res.rows.length) {
			return await middleware.generateStreamKey();
		} else {
			console.log("Valid Stream Key Found: " + newid.toString());
			return newid;
		}
	},

	//this is a function that generates ids for advertisements
	generateAdvertId: async function () {
		//generate random bytes (16 bytes instead of 32 used for stream keys) for the new id
		var newid = crypto.randomBytes(16).toString("hex");

		//check for ads with the same id as the newly generated one
		var res = await client.query(`SELECT id FROM adverts WHERE id=$1 LIMIT 1`, [newid]);

		if (res.rows.length) {
			return await middleware.generateAdvertId();
		} else {
			console.log("Valid Advert ID Found:", newid);
			return newid;
		}
	},

	//this is a function for generating a unique session id
	generateSessionId: async function () {
		//create a sha256 hash
		var sha = crypto.createHash('sha256');

		//add data to the hash in order to give it data to work with
		sha.update(Math.random().toString());

		//get the new id in hex format
		var newid = sha.digest('hex');

		//get any existing sessions with this id
		var existingSession = await middleware.getUserSession(newid);

		//check for the existence of an existing session with the new id
		if (typeof existingSession == 'undefined') { //if the id is new
			//return the id
			return newid;
		} else { //if the id is in use
			//recursively call this same function to get an original session id
			return await middleware.generateSessionId();
		}
	},

	//this gets a user from the redis session store and returns the object for this user
	getUserSession: async function (sessionid) {
		if (typeof sessionid != 'undefined') {
			var userinfo = await redisClient.getAsync(sessionid);
			if (userinfo != null) {
				return JSON.parse(userinfo);
			} else {
				return undefined;
			}
		}
	}
};

/*
OBJECT FOR STORING FUNCTIONS WHICH DELETE CONTENT
*/
var deletionHandling = {
	//this is a function to delete video details
	deleteVideoDetails: async function (userinfo, videoid) {
		//get the video to be deleted
		var video = await client.query(`SELECT thumbnail, video FROM videofiles WHERE id=$1 LIMIT 1`, [videoid]);
		video = video.rows[0];
		//get the paths of the files for the thumbnail and the video
		var thumbnailpath = global.appRoot + "/storage" + video.thumbnail;
		var videopath = global.appRoot + "/storage" + video.video;

		var video_user_id = await client.query(`SELECT user_id FROM videos WHERE id=$1 LIMIT 1`, [videoid]);
		video_user_id = video_user_id.rows[0].user_id;

		//check to see if the user trying to delete the video actually owns the video
		if (userinfo.id == video_user_id) {
			//delete all of the comments for this video
			await client.query(`DELETE FROM comments WHERE video_id=$1`, [videoid]);
			//delete the video file entry and the comment file entries
			await client.query(`DELETE FROM videofiles WHERE parentid=$1`, [videoid]);
			await client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);
			//delete the video details in the database
			await client.query(`UPDATE videos SET title=$1, thumbnail=$2, video=$3, views=$4, username=$5, channelicon=$6, deleted=$7 WHERE id=$8`, ["", "/server/deleteicon.png", "", 0, "", "/server/deletechannelicon.png", true, videoid]);
			//delete the live chat messages from the video
			await client.query(`DELETE FROM livechat WHERE stream_id=$1`, [videoid]);
			//update the amount of videos the user has
			await client.query(`UPDATE users SET videocount=videocount-1 WHERE id=$1`, [userinfo.id]);
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
		//get the playlist
		var playlist = await client.query(`SELECT user_id FROM playlists WHERE id=$1 LIMIT 1`, [playlistid]);
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

	//this is a function to delete advertisement details
	deleteAdvertDetails: async function (userinfo, advertid) {
		//get the id of the subscription associated with this advertisement and the file path
		var advert = await client.query(`SELECT subscriptionid, adfile FROM adverts WHERE id=$1 AND businessid=$2 LIMIT 1`, [advertid, userinfo.id]);

		//check for the authenticity of this advertisement deletion
		if (advert.rows.length) {
			var subscriptionid = advert.rows[0].subscriptionid;
			var adfile = global.appRoot + "/storage" + advert.rows[0].adfile;

			//delete/cancel the subscription for this advertisement
			var result = await stripe.subscriptions.del(subscriptionid);

			//delete the file associated with the advertisement
			fs.unlink(adfile, (err) => {
				if (err) throw err;
			});

			//delete the advertisement itself from the database
			await client.query(`DELETE FROM adverts WHERE id=$1`, [advertid]);

			return true;
		} else {
			return false;
		}
	}
};

/*
OBJECT STORING MISCELLANEOUS FUNCTIONS
*/
var miscFunctions = {
	//this is a function that removes special characters from user input so that no XSS/SQLi/HTMLi happens
	removeSpecialChars: async function (req, res, next) {
		//get the values of the request body if there are any values being submitted
		var bodyKeys = Object.keys(req.body);
		var bodyValues = Object.values(req.body);

		//a value to store the new request body value
		var newBody = {};

		//loop through the values for each item in the request body and clear any bad characters
		bodyValues.forEach((item, index) => {
			var safe = item.replace(/[^a-zA-Z 0-9@.,]+/g, "");

			newBody[bodyKeys[index]] = safe;
		});

		req.body = newBody;

		//go on to the next middleware function
		next();
	},

	//this is a function that eliminates duplicates from an object
	deleteDuplicates: async function(arr) {
		//get stringified versions of the objects inside
		var stringobjs = arr.map((item) => {
			return JSON.stringify(item);
		});

		//filter the array based on the array of stringified objects
		arr = arr.filter((item, index) => {
			return !stringobjs.includes(JSON.stringify(item), index+1);
		});

		//return the filtered array
		return arr;
	},

	//this function gets the filename of an OBS stream file from a timestamp
	getObsName: function(timestamp) {
		var offset = new Date(timestamp).getTimezoneOffset()*60000;
		var newtimestamp = new Date(timestamp - offset).toISOString();
		return newtimestamp.replace(/T/, "-").replace(/\..+/, "").replace(/:/g, "-");
	},

	//this is a function to increase/decrease likes/dislikes of videos in the database
	changeLikes: async function (req, res, increase, changelikes) {
		if (changelikes) {
			if (increase) {
				var newcount = await client.query(`UPDATE videos SET likes=likes+1 WHERE id=$1 LIMIT 1 RETURNING likes`, [req.params.videoid]);
			} else {
				var newcount = await client.query(`UPDATE videos SET likes=likes-1 WHERE id=$1 LIMIT 1 RETURNING likes`, [req.params.videoid]);
			}

			newcount = newcount.rows[0].likes;

			//return the updated amount of dislikes
			return newcount;
		} else {
			if (increase) {
				var newcount = await client.query(`UPDATE videos SET dislikes=dislikes+1 WHERE id=$1 LIMIT 1 RETURNING dislikes`, [req.params.videoid]);
			} else {
				var newcount = await client.query(`UPDATE videos SET dislikes=dislikes-1 WHERE id=$1 LIMIT 1 RETURNING dislikes`, [req.params.videoid]);
			}

			newcount = newcount.rows[0].dislikes;

			//return the value of the updated dislikes
			return newcount;
		}
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


		//handle the addition and removal of likes on a piece of content
		if (liked.rows.length) {
			var likes = parseInt(element.likes, 10);
			likes = likes - 1;
			likes = likes.toString();
			var querystring = `DELETE FROM ${likedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		} else {
			var likes = parseInt(element.likes, 10)
			likes = likes + 1;
			likes = likes.toString();
			var querystring = `INSERT INTO ${likedTable} (user_id, ${idcolumn}) VALUES (\'${userid}\', \'${elementid}\')`;
			await client.query(querystring);
		}

		//handle any dislikes that come up
		if (disliked.rows.length) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes - 1;
			dislikes = dislikes.toString();
			var querystring = `DELETE FROM ${dislikedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		} else {
			var dislikes = element.dislikes.toString();
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
			var querystring = `INSERT INTO ${dislikedTable} (user_id, ${idcolumn}) VALUES (\'${userid}\', \'${elementid}\')`;
			await client.query(querystring);
		} else if (disliked.rows.length > 0) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes - 1;
			dislikes = dislikes.toString();
			var querystring = `DELETE FROM ${dislikedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		//handle any likes that come up
		if (liked.rows.length == 0) {
			var likes = element.likes.toString();
		} else if (liked.rows.length > 0) {
			var likes = parseInt(element.likes, 10);
			likes = likes - 1;
			likes = likes.toString();
			var querystring = `DELETE FROM ${likedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		return [likes, dislikes];
	}
};

/*
OBJECT STORING CONTENT-SEARCHING FUNCTIONS
*/
var searchFunctions = {
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

	//this is a function that selects videos from the database based on a given array of search terms
	searchVideos: async (phrases) => {
		//an array to store all of the video objects selected from the database
		var results = [];
		//get all of the videos from the database with titles like the search term
		for (var i=0; i<phrases.length; i++) {
			//get all of the videos from the database with a title matching the current term
			var result = await client.query(`SELECT * FROM videos WHERE private=${false} AND deleted=${false} AND (UPPER(title) LIKE UPPER($1) OR UPPER(description) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($1) OR UPPER(username) LIKE UPPER($1))`, ["% " + phrases[i] + " %"]);

			//add the entries to the results
			result.rows.forEach((item, index) => {
				//check to see that the array does not have this item already
				var isDuplicate = results.some((res) => {
					return JSON.stringify(res) == JSON.stringify(item);
				});

				//if this item is not a duplicate, then add it to the array
				if (!isDuplicate) {
					results.push(item);
				}
			});
		}

		//return the results
		return results;
	},

	//this is a function that returns the channels that come up in search results
	searchChannels: async (phrases) => {
		var results = [];
		for (var i=0; i < phrases.length; i++) {
			var result = await client.query(`SELECT * FROM users WHERE UPPER(username) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($2)`, ["%" + phrases[i] +"%", "% " + phrases[i] + " %"]);
			result.rows.forEach((item, index) => {
				var isDuplicate = results.some((res) => {
					return JSON.stringify(res) == JSON.stringify(item);
				});

				if (!isDuplicate) {
					results.push(item);
				}
			});
		}

		return results;
	},

	//this is a function that returns the playlists that come up in the search results
	searchPlaylists: async (phrases) => {
		var results = [];
		for (var i=0; i < phrases.length; i++) {
			var result = await client.query(`SELECT * FROM playlists WHERE private=${false} AND (UPPER(name) LIKE UPPER($1))`, ["%" + phrases[i] + "%"]);
			result = result.rows;

			for (var j=0; j < result.length; j++) {
				var item = result[j];

				var video = await client.query(`SELECT id, thumbnail FROM videos WHERE id IN (SELECT video_id FROM playlistvideos WHERE playlist_id=$1 LIMIT 1) LIMIT 1`, [item.id]);
				video = video.rows[0];

				item = Object.assign({}, item, {thumbnail: video.thumbnail, firstvideoid: video.id});

				var isDuplicate = results.some((res) => {
					return JSON.stringify(res) == JSON.stringify(item);
				});

				if (!isDuplicate) {
					results.push(item);
				}
			};
		}

		return results;
	},

	//this is a function that gets all of the titles from a certain table based on an array of phrases
	getMatching: async (table, selector, phrases) => {
		//make an array to store all of the title values
		var titles = [];

		//loop through all of the phrases
		for (var i=0; i < phrases.length; i++) {
			//get the titles of all the matching entries
			var title = await client.query(`SELECT ${selector} FROM ${table} WHERE UPPER(${selector}) LIKE UPPER($1)`, ["%" + phrases[i] + "%"]);
			title = title.rows;

			//add each title to the array
			title.forEach((item, index) => {
				titles.push(item[`${selector}`]);
			});
		}

		//remove duplicate title values with a set
		titles = [...new Set(titles)];

		//return the title values
		return titles;
	},

	//this is a function that gets all of the popular channel names based on a list of video titles/phrases
	getPopularChannels: async (phrases) => {
		//an array to store all of the usernames
		var usernames = [];

		//loop through all of the phrases and get all of the channel usernames and subcriber counts
		for (var i=0; i < phrases.length; i++) {
			var username = await client.query(`SELECT username, subscribers FROM users WHERE id IN (SELECT user_id FROM videos WHERE UPPER(title) LIKE UPPER($1) LIMIT 10) LIMIT 10`, ["%" + phrases[i] + "%"]);
			username = username.rows;

			username.forEach((item, index) => {
				//get the final object with the phrase included
				var final = Object.assign({}, item, {phrase: phrases[i]});

				//get a boolean to see if this is a duplicate
				var isDuplicate = usernames.some((res) => {
					return JSON.stringify(res) == JSON.stringify(final);
				});

				//insert the item based on the boolean value above
				if (!isDuplicate) {
					usernames.push(final);
				}
			});
		}

		//sort the usernames by the subscribers in descending order
		usernames.sort((a, b) => {
			return b.subscribers-a.subscribers;
		});

		//create the final username and phrase arrays
		var finalusernames = usernames.map((item) => {
			return item.username;
		});

		var finalphrases = usernames.map((item) => {
			return item.phrase;
		});

		//return the username values
		return [finalusernames, finalphrases];
	},

	//this is a function that gets all of the popular video titles based on a list of channel names/phrases
	getPopularVideos: async (phrases) => {
		//an array to store all of the video titles
		var titles = [];

		//loop through the phrases to get all of the video titles and view counts
		for (var i=0; i < phrases.length; i++) {
			var title = await client.query(`SELECT title, views FROM videos WHERE user_id IN (SELECT id FROM users WHERE UPPER(username) LIKE UPPER($1) LIMIT 10) LIMIT 10`, ["%" + phrases[i] + "%"]);
			title = title.rows;

			title.forEach((item, index) => {
				var final = Object.assign({}, item, {phrase: phrases[i]});

				//get a boolean value which tells us if this is a duplicate object
				var isDuplicate = titles.some((res) => {
					return JSON.stringify(res) == JSON.stringify(final);
				});

				//add this object if it is not a duplicate
				if (!isDuplicate) {
					titles.push(final);
				}
			});
		}

		//sort the titles by the view count on the videos
		titles.sort((a, b) => {
			return b.views-a.views;
		});

		//get the values of the titles only
		titles = titles.map((item) => {
			delete item.views;
			return item;
		});

		//get the final title and phrase array values
		var finaltitles = titles.map((item) => {
			return item.title;
		});

		var finalphrases = titles.map((item) => {
			return item.phrase;
		});

		//return the title values and phrase values that match
		return [finaltitles, finalphrases];
	},

	//this is a function that returns combination phrases between two arrays. the functionality of this is used for the purpose of combining search
	//query input with video and channel titles that are indirectly related to strings in the search query (I.E the term "websocket" in the search query
	//might be in the title of a video owned by the user "jane", but since we cannot give just the phrase "jane" as a search reccomendation, we have to combine
	//the word "websocket" with "jane" to have a proper/relevant search reccomendation that matches up with the user input)
	getPhraseCombos: async (phrases, items) => {
		//a result array to store all of the phrase combos
		var result = [];

		//loop through the phrases
		phrases.forEach((phrase) => {
			//loop through the items
			items.forEach((item) => {
				//add the complete combination to the array
				result.push(phrase + " " + item);
			});
		});

		//remove duplicates
		result = [...new Set(result)];

		//return the array
		return result;
	}
};

/*
OBJECT STORING RECCOMENDATION FUNCTIONS
*/
var reccomendationFunctions = {
	//this is a function for getting reccomendations based on all of the other functions below, checking for all edge cases
	getReccomendations: async function (req, video=undefined) {
		//get reccomendation cookies
		var reccookies = await middleware.getReccomendationCookies(req);

		//check for the existence of reccomendation cookies
		if (reccookies.length) {
			var reccomendations = await middleware.getCookieReccomendations(reccookies);
			var randomvids = await middleware.getRandomReccomendations(15);
			reccomendations = reccomendations.concat(randomvids);
		} else { //check for other edge cases
			if (typeof video == 'undefined') {
				var reccomendations = await middleware.getRandomReccomendations(30);
			} else {
				var reccomendations = await middleware.getVideoReccomendations(video);
			}
		}

		//filter the video object out if the function parameter is defined
		if (typeof video != 'undefined') {
			reccomendations = reccomendations.filter((item) => {
				return !(JSON.stringify(item) == JSON.stringify(video));
			});
		}

		//delete any duplicate videos
		reccomendations = await middleware.deleteDuplicates(reccomendations);

		//return the complete reccomendations list
		return reccomendations;
	},

	//this is a function for getting the reccomendations for the videos according to the title and description of the video being viewed
	getVideoReccomendations: async function (video) {
		//get a list of phrases to use in searching for results in the database
		var phrases = middleware.getSearchTerms(video.title);
		phrases = phrases.concat(middleware.getSearchTerms(video.username));

		//get the results of searching for the videos based on the list of phrases in the db
		var vids = await middleware.searchVideos(phrases);

		//eliminate the video from the list if the video being viewed is in the list
		vids = vids.filter((item) => {
			return !(JSON.stringify(video) == JSON.stringify(item));
		});

		//return the videos
		return vids;
	},

	//this is a function that gets random reccomendations from the database
	getRandomReccomendations: async function (amount=5) {
		//randomly select videos with a limited amount defined in the function (or defined by the user params)
		var videos = await client.query(`SELECT * FROM videos WHERE deleted=${false} AND private=${false} ORDER BY random() LIMIT $1`, [amount]);

		//return the video results
		return videos.rows;
	},

	//this is a function to get all of the reccomendation cookies from the user's current session
	getReccomendationCookies: async function (req) {
		//get all of the key-value pairs as an array of objects
		var newCookies = Object.keys(req.cookies).map((item) => {
			var obj = {};
			obj[item] = req.cookies[item];
			return obj;
		});

		//filter the new cookies based on the beginning prefix with regex
		newCookies = newCookies.filter((item) => {
			var cookiename = Object.keys(item)[0];
			return cookiename.match(/^VR-|^SR-|^CR-/);
		});

		//return the new reccomendation cookies
		return newCookies;
	},

	//this is a function that gets reccomendations based on all of the search reccomendation cookies in the user's session
	getCookieReccomendations: async function (cookies) {
		//make an array of reccomendations
		var recs = [];

		//filter for search cookies
		var searchcookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^SR-/);
		});

		//get videos based on search cookies
		for (var i=0; i < searchcookies.length; i++) {
			//get the cookie value
			var cookievalue = Object.values(searchcookies[i])[0];

			//get phrases based on the original cookie value
			var phrases = await middleware.getSearchTerms(cookievalue);

			//loop through all of the phrases and select videos
			for (var phrase=0; phrase < phrases.length; phrase++) {
				var video = await client.query(`SELECT * FROM videos WHERE (UPPER(title) LIKE UPPER($1) OR UPPER(username) LIKE UPPER($1)) AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 1`, ["%" + phrases[phrase] + "%"]);
				if (typeof video.rows[0] != 'undefined') {
					recs.push(video.rows[0]);
				}
			}
		}

		//filter for video cookies
		var videocookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^VR-/);
		});

		//get videos based on the title of a viewed video and associated channel
		for (var i=0; i < videocookies.length; i++) {
			//get the cookie value
			var cookievalue = Object.values(videocookies[i])[0];
			cookievalue = cookievalue.split("+");

			//get phrases based on the video title
			var titlephrases = await middleware.getSearchTerms(cookievalue[0]);

			//loop through the title phrases and get videos
			for (var phrase = 0; phrase < titlephrases.length; phrase++) {
				var video = await client.query(`SELECT * FROM videos WHERE UPPER(title) LIKE UPPER($1) AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 1`, ["%" + titlephrases[phrase] + "%"]);
				recs.push(video.rows[0]);
			}

			//get some videos based on the channel id associated with this viewed video
			var channelvideos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 5`, [cookievalue[1]]);

			//add the channel-based videos to the reccomendations array
			channelvideos.rows.forEach((item) => {
				recs.push(item);
			});
		}

		//filter for channel cookies
		var channelcookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^CR-/);
		});

		//get videos based on the viewed channels by the user
		for (var i=0; i < channelcookies.length; i++) {
			//get the cookie value
			var cookievalue = Object.values(channelcookies[i])[0];

			//get videos based on the viewed channel id
			var channelvideos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 5`, [cookievalue]);

			//add all of the channel videos to the reccomendations array
			channelvideos.rows.forEach((item) => {
				recs.push(item);
			});
		}

		//delete the duplicates in the array
		recs = await middleware.deleteDuplicates(recs);

		//return the completed recccomendations array
		return recs;
	}
};

/*
OBJECT FOR STORING LOGGING FUNCTIONS
*/
var loggingFunctions = {
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
	}
};

/*
OBJECT FOR STORING SHUTDOWN FUNCTIONS
*/
var shutdownFunctions = {
	//this is a function that executes whenever the node process is killed (server shuts down)
	shutDown: function() {
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
	}
};

/*
OBJECT FOR STORING FUNCTIONS WHICH HANDLE THE MEDIA FILES ON THE SERVER
*/
var mediaHandling = require("./mediaHandling");

/*
OBJECT FOR STORING FUNCTIONS FOR TORRENTS
*/
var torrentHandling = {
	//function for checking the health of a magnet link
	checkMagnetHealth: async (uri) => {
		//decode the uri into the magnet link instead of url encoded stuff for proper checking
		var uri = decodeURIComponent(uri);

		//make sure the pre-existing magnet link is a valid one with working peers/seeders by sending the magnet link to a checker
		var magnetHealthResponse = await got(`https://checker.openwebtorrent.com/check?magnet=${encodeURIComponent(uri)}`);

		//get the full magnet health data from the response body
		var magnetHealth = JSON.parse(magnetHealthResponse.body);

		//get the peers/seeders amount and turn this into a logic statement to verify the health of the magnet link
		var magnetIsHealthy = (magnetHealth.peers || magnetHealth.seeds);

		//create a regex match for checking valid magnet links
		var magnetmatch = new RegExp(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/, "i");

		//return the result of the magnet health and the magnet regex match
		return (uri.match(magnetmatch) !== null && magnetIsHealthy);
	}
};

/*
OBJECT FOR STORING FUNCTIONS FOR ADVERTISEMENT/PAYMENT FUNTIONALITY
*/
var adHandling = {
	//a function for basically storing an ad resolutions array with the ad type and positioning
	getAdResolutions: async () => {
	        //make an array of the accepted dimensions for advertisements
	        var acceptedDimensions = [
			{width: 720, height: 90, type:"desktop", position: "banner"},
			{width: 728, height: 90, type: "desktop", position: "banner"},
			{width: 300, height: 250, type: "desktop", position: "square"},
			{width: 160, height: 600, type: "desktop", position: "sidebanner"},
			{width: 300, height: 50, type: "mobile", position: "banner"},
			{width: 320, height: 50, type: "mobile", position: "banner"},
			{width: 320, height: 100, type: "mobile", position: "banner"}
		];

		//return the accepted dimensions
		return acceptedDimensions;
	},

	/*
	a function for checking the resolution of an ad image against other resolutions
	and returning the resolution and type (mobile vs desktop) of the ad image if the
	ad is one of the accepted resolutions
	*/
	getAdResolution: async (adImgRes) => {
	        //make an array of the accepted dimensions for advertisements
	        var acceptedDimensions = await middleware.getAdResolutions();

	        //loop through the accepted dimensions to set the type of advertisement in the ad resolution object
	        for (var resolution of acceptedDimensions) {
	                //if the resolution matches
	                if (resolution.width == adImgRes.width && resolution.height == adImgRes.height) {
	                        //set the advertisement resolution object to have the same type
				adImgRes.type = resolution.type;

				//set the advertisement resolution object to have the same positioning
				adImgRes.position = resolution.position;
	                }
	        }

		//return the advert image resolution along with the corresponding type
		return adImgRes;
	}
};

//put all of the object above into one middleware object containing the collective middleware functions
var middleware = Object.assign({}, userauthFunctions, reqHandling, deletionHandling, miscFunctions, searchFunctions, reccomendationFunctions, loggingFunctions, shutdownFunctions, mediaHandling, torrentHandling, adHandling);

//export the object with all of the middleware functions
module.exports = middleware;
