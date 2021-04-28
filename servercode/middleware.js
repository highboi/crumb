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
/*
FUNCTIONS THAT CHECK USER AUTH:
*/
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

/*
FUNCTIONS THAT GENERATE BASIC INFO NEEDED FOR REQUEST PROCESSING (view obj, ids, session info):
*/
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
			//insert the playlists of the users
			var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [viewObj.user.id]);
			viewObj.playlists = playlists.rows;
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
		var res = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [newid]);

		//get comment ids
		var commentres = await client.query(`SELECT * FROM comments WHERE id=$1 LIMIT 1`, [newid]);

		//get the playlist ids
		var playlistres = await client.query(`SELECT * FROM playlists WHERE id=$1 LIMIT 1`, [newid]);

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
		var res = await client.query(`SELECT * FROM users WHERE streamkey=$1 LIMIT 1`, [newid]);

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
		if (typeof sessionid != 'undefined') {
			var userinfo = await redisClient.getAsync(sessionid);
			return JSON.parse(userinfo);
		}
	},

/*
FUNCTIONS THAT ARE NEEDED, BUT DON'T FIT ANYWHERE:
*/
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

	//this is a function for saving a file on to the server
	saveFile: function (file, path) {
		var oldpath = file.path; //default path for the file to be saved
		var newpath = global.appRoot + path + Date.now() + "-" + file.name; //new path to save the file on the server
		fs.rename(oldpath, newpath, function(err) { //save the file to the server on the desired path
			if (err) throw err;
		});
		//remove the dirname and the /storage folder from the string
		//this is because the ejs views look inside the storage folder already
		newpath = newpath.replace(global.appRoot, "");
		newpath = newpath.replace("/storage", "");
		//return the new file path to be stored in the database for reference
		return newpath;
	},

	//this is a function to increase/decrease likes/dislikes of videos in the database
	changeLikes: async function (req, res, increase, changelikes) {
		var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.videoid]);
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
			var querystring = `INSERT INTO ${likedTable} (user_id, ${idcolumn}) VALUES (\'${userid}\', \'${elementid}\')`;
			await client.query(querystring);
		} else if (liked.rows.length > 0) {
			var likes = parseInt(element.likes, 10);
			likes = likes - 1;
			likes = likes.toString();
			var querystring = `DELETE FROM ${likedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
			await client.query(querystring);
		}

		//handle any dislikes that come up
		if (disliked.rows.length == 0) {
			var dislikes = element.dislikes.toString();
		} else if (disliked.rows.length > 0) {
			var dislikes = parseInt(element.dislikes, 10);
			dislikes = dislikes - 1;
			dislikes = dislikes.toString();
			var querystring = `DELETE FROM ${dislikedTable} WHERE user_id=\'${userid}\' AND ${idcolumn}=\'${elementid}\'`;
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
	},

/*
FUNCTIONS FOR DELETING DATABASE DETAILS OF CERTAIN CONTENT:
*/
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

/*
FUNCTIONS THAT DEAL WITH VIDEO RECCOMENDATIONS FOR THE USER:
*/
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

		//return the videos as an array
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
	},

/*
FUNCTIONS THAT DEAL WITH SEARCHING FOR CONTENT FOR THE USER:
*/
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
	},

/*
FUNCTIONS THAT PERFORM LOGGING TASKS:
*/
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

/*
FUNCTIONS THAT HANDLE THE SHUTDOWN PROCESS OF THE SERVER:
*/
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
	}
}

//export the object with all of the middleware functions
module.exports = middleware;
