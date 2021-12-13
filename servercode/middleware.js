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
		//make sure the cookies object is not inherited from a null object prototype
		var cookies = JSON.parse(JSON.stringify(req.cookies));

		if (cookies.hasOwnProperty('sessionid')) {
			next();
		} else {
			req.flash("message", "Please sign in.");
			res.redirect("/login");
		}
	},

	//this is a function to redirect users to the index page if they are signed in already
	//this is used for login pages and other forms that sign the user in
	checkNotSignedIn: function (req, res, next) {
		//make sure the cookies object is not inherited from a null object prototype
		var cookies = JSON.parse(JSON.stringify(req.cookies));

		if (cookies.hasOwnProperty('sessionid')) {
			req.flash("message", "Already Logged In!");
			res.redirect("/");
		} else {
			next();
		}
	},

	//this is a function that checks to see if this user has been given a temporary session
	//id in order to identify this user as a "visitor" to the site
	checkNotAssigned: async function (req, res, next) {
		//make sure the cookies object is not inherited from a null object prototype
		var cookies = JSON.parse(JSON.stringify(req.cookies));

		//assign a session id if there is not a session id in the cookies of the user
		if (!cookies.hasOwnProperty("tempsessionid") && !cookies.hasOwnProperty("sessionid")) {
			var newTempId = await middleware.generateSessionId();

			res.cookie("tempsessionid", newTempId, {httpOnly: true, expires: 0});

			redisClient.set(newTempId, "empty");

			var daysExpire = process.env.DAYS_EXPIRE * (24 * 60 * 60);

			redisClient.sendCommandAsync("EXPIRE", [newTempId, daysExpire]);
		}

		next();
	}
};

/*
OBJECT WHICH STORES FUNCTIONS THAT HANDLE REQUEST INFORMATION
*/
var reqHandling = {
	//this is a function to insert universal things into the view object such as flash messages
	//and language translation
	getViewObj: async function(req, res) {
		var viewObj = {};

		if (typeof req.cookies.sessionid != 'undefined') {
			viewObj.user = await middleware.getUserSession(req.cookies.sessionid);

			if (typeof viewObj.user != 'undefined') {
				var subscribedChannels = await client.query(`SELECT channel_id FROM subscribed WHERE user_id=$1`, [viewObj.user.id]);
				viewObj.subscribedChannels = subscribedChannels.rows.map((obj) => {return obj.channel_id});

				var playlists = await client.query(`SELECT * FROM playlists WHERE user_id=$1`, [viewObj.user.id]);
				viewObj.playlists = playlists.rows;
			} else {
				res.cookie('sessionid', '', {expires: new Date(0)});
			}
		}

		viewObj.message = req.flash("message");

		viewObj.errors = req.flash("errors");

		viewObj.approx = approx;

		return viewObj;
	},

	//a function for getting the relevant information about a video for the view object
	getVideoInfo: async function (video) {
		var videoInfo = {};

		var videocreator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
		videoInfo.videocreator = videocreator.rows[0];

		var comments = await client.query(`SELECT * FROM comments WHERE video_id=$1 AND depth_level=0`, [video.id]);
		videoInfo.comments = comments.rows;

		var resolutions = await client.query(`SELECT resolution FROM videofiles WHERE id=$1 LIMIT 1`, [video.id]);
		videoInfo.resolutions = resolutions.rows[0].resolution;

		if (video.subtitles != "" && video.subtitles != null) {
			videoInfo.subtitles = await middleware.getSubtitles(global.appRoot + "/storage" + video.subtitles);
		} else {
			videoInfo.subtitles = video.subtitles;
		}

		var chatReplayMessages = await client.query(`SELECT * FROM livechat WHERE stream_id=$1`, [video.id]);

		if (chatReplayMessages.rows.length) {
			//get all of the user ids from the chat replay messages, remove duplicates
			var chatUserIds = chatReplayMessages.rows.map((item) => {
				return item.user_id;
			});
			chatUserIds = [...new Set(chatUserIds)];

			//get the channel icons and usernames of the users associated with each message
			var chatMessageInfo = {};
			await Promise.all(chatUserIds.map(async (item) => {
				var userChatInfo = await client.query(`SELECT channelicon, username FROM users WHERE id=$1 LIMIT 1`, [item]);
				userChatInfo = userChatInfo.rows[0];

				chatMessageInfo[item] = userChatInfo;
			}));

			//join the chat message objects with the user info associated with these messages
			videoInfo.chatReplayMessages = chatReplayMessages.rows.map((item) => {
				return Object.assign({}, item, chatMessageInfo[item.user_id]);
			});
		} else {
			videoInfo.chatReplayMessages = undefined;
		}

		return videoInfo;
	},

	//this is a function that generates a new alphanumeric id
	generateAlphanumId: async function () {
		var chars = "QWERTYUIOPASDFGHJKLZXCVBNMqwertyuiopasdfghjklzxcvbnm1234567890";

		var resultid = "";

		for (var i=0; i < 8; i++) {
			resultid += chars.charAt(Math.floor(Math.random() * chars.length));
		}

		var user = await client.query(`SELECT id FROM users WHERE id=$1 LIMIT 1`, [resultid]);
		user = user.rows.length;

		var video = await client.query(`SELECT id FROM videos WHERE id=$1 LIMIT 1`, [resultid]);
		video = video.rows.length;

		var comment = await client.query(`SELECT id FROM comments WHERE id=$1 LIMIT 1`, [resultid]);
		comment = comment.rows.length;

		var playlist = await client.query(`SELECT id FROM playlists WHERE id=$1 LIMIT 1`, [resultid]);
		playlist = playlist.rows.length;

		if (user || video || comment || playlist) {
			return await middleware.generateAlphanumId();
		} else {
			return resultid;
		}
	},

	//this is a function that generates stream keys for OBS streaming
	generateStreamKey: async function () {
		var newid = crypto.randomBytes(32).toString("base64").replace(/\//g, "");

		var res = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [newid]);

		if (res.rows.length) {
			return await middleware.generateStreamKey();
		} else {
			return newid;
		}
	},

	//this is a function that generates ids for advertisements
	generateAdvertId: async function () {
		var newid = crypto.randomBytes(16).toString("hex");

		var res = await client.query(`SELECT id FROM adverts WHERE id=$1 LIMIT 1`, [newid]);

		if (res.rows.length) {
			return await middleware.generateAdvertId();
		} else {
			return newid;
		}
	},

	//this is a function for generating a unique session id
	generateSessionId: async function () {
		var sha = crypto.createHash('sha256');

		sha.update(Math.random().toString());

		var newid = sha.digest('hex');

		var existingSession = await middleware.getUserSession(newid);

		if (typeof existingSession == 'undefined') {
			return newid;
		} else {
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
		} else {
			return undefined;
		}
	}
};

/*
OBJECT FOR STORING FUNCTIONS WHICH DELETE CONTENT
*/
var deletionHandling = {
	//this is a function to delete video details
	deleteVideoDetails: async function (userid, videoid) {
		var video = await client.query(`SELECT id, thumbnail, video FROM videos WHERE id=$1 AND user_id=$2 LIMIT 1`, [videoid, userid]);

		if (video.rows.length) {
			video = video.rows[0];

			var thumbnailpath = global.appRoot + "/storage" + video.thumbnail;
			var videopath = global.appRoot + "/storage" + video.video;

			fs.unlink(videopath, (err) => {
				if (err) throw err;
			});
			fs.unlink(thumbnailpath, (err) => {
				if (err) throw err;
			});

			client.query(`UPDATE videos SET title=$1, thumbnail=$2, video=$3, views=$4, username=$5, channelicon=$6, deleted=$7 WHERE id=$8`, ["", "/server/deleteicon.png", "", 0, "", "/server/deletechannelicon.png", true, videoid]);

			client.query(`DELETE FROM likedvideos WHERE video_id=$1`, [videoid]);
			client.query(`DELETE FROM dislikedvideos WHERE video_id=$1`, [videoid]);

			client.query(`DELETE FROM comments WHERE video_id=$1`, [videoid]);

			//select all of the file paths associated with comments on this video
			var commentfiles = await client.query(`SELECT video FROM videofiles WHERE parentid=$1`, [videoid]);
			commentfiles = commentfiles.rows.map((item) => {
				return item.video;
			});

			//delete all files of comments associated with this video
			for (var file of commentfiles) {
				fs.unlink(global.appRoot + "/storage" + file, (err) => {
					if (err) throw err;
				});
			}

			client.query(`DELETE FROM videofiles WHERE parentid=$1`, [videoid]);
			client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);

			client.query(`DELETE FROM livechat WHERE stream_id=$1`, [videoid]);

			client.query(`UPDATE users SET videocount=videocount-1 WHERE id=$1`, [userid]);

			return true;
		} else {
			return false;
		}
	},

	//this is a function to delete playlist details
	deletePlaylistDetails: async function (userid, playlistid) {
		var playlist = await client.query(`SELECT candelete FROM playlists WHERE id=$1 AND user_id=$2 LIMIT 1`, [playlistid, userid]);

		if (playlist.rows.length) {
			client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1`, [playlistid]);
			client.query(`DELETE FROM playlists WHERE id=$1`, [playlistid]);
			return true;
		} else {
			return false;
		}
	},

	//this is a function to delete advertisement details
	deleteAdvertDetails: async function (userid, advertid) {
		var advert = await client.query(`SELECT subscriptionid, adfile FROM adverts WHERE id=$1 AND businessid=$2 LIMIT 1`, [advertid, userid]);

		if (advert.rows.length) {
			var subscriptionid = advert.rows[0].subscriptionid;
			var adfile = global.appRoot + "/storage" + advert.rows[0].adfile;

			stripe.subscriptions.del(subscriptionid);

			fs.unlink(adfile, (err) => {
				if (err) throw err;
			});

			client.query(`DELETE FROM adverts WHERE id=$1`, [advertid]);

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
	//this is a function that eliminates duplicates from an array of objects
	deleteDuplicates: async function(arr) {
		//turn the array of objects into strings to properly be able to detect duplicate objects
		var stringobjs = arr.map((item) => {
			return JSON.stringify(item);
		});

		/*
		filter the array based on whether or not there is a duplicate value of this object in
		the array of stringified objects (the stringobjs array is a mirror of the original array
		and so comparing the two logically makes sense)
		*/
		arr = arr.filter((item, index) => {
			return !stringobjs.includes(JSON.stringify(item), index+1);
		});

		return arr;
	},

	//this function gets the filename of an OBS stream file from a timestamp
	getObsName: function(timestamp) {
		//get the timezone offset in milliseconds
		var offset = new Date(timestamp).getTimezoneOffset()*60000;

		//get the ISO timestamp of the date with the timezone offset taken into account
		var newtimestamp = new Date(timestamp - offset).toISOString();

		//replace the "T" and colons in the timestamp with dashes and replace the decimal with an empty string
		return newtimestamp.replace(/T/, "-").replace(/\..+/, "").replace(/:/g, "-");
	},

	//this is a function to like a video based on user info and a video id
	likeVideo: async function (userid, videoid) {
		var alreadyliked = await client.query(`SELECT * FROM likedvideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userid, videoid]);

		if (alreadyliked.rows.length) {
			client.query(`DELETE FROM likedvideos WHERE user_id=$1 AND video_id=$2`, [userid, videoid]);

			var data = await client.query(`UPDATE videos SET likes=likes-1 WHERE id=$1 RETURNING likes, dislikes`, [videoid]);
			data = data.rows[0];
		} else {
			var disliked = await client.query(`DELETE FROM dislikedvideos WHERE user_id=$1 AND video_id=$2 RETURNING 1`, [userid, videoid]);
			if (disliked.rows.length) {
				client.query(`UPDATE videos SET dislikes=dislikes-1 WHERE id=$1`, [videoid]);
			}

			client.query(`INSERT INTO likedvideos(user_id, video_id) VALUES ($1, $2)`, [userid, videoid]);

			var data = await client.query(`UPDATE videos SET likes=likes+1 WHERE id=$1 RETURNING likes, dislikes`, [videoid]);
			data = data.rows[0];
		}

		return [data.likes, data.dislikes];
	},

	//this is a function to dislike a video based on user info and a video id
	dislikeVideo: async function (userid, videoid) {
		var alreadydisliked = await client.query(`SELECT * FROM dislikedvideos WHERE user_id=$1 AND video_id=$2 LIMIT 1`, [userid, videoid]);

		if (alreadydisliked.rows.length) {
			client.query(`DELETE FROM dislikedvideos WHERE user_id=$1 AND video_id=$2`, [userid, videoid]);

			var data = await client.query(`UPDATE videos SET dislikes=dislikes-1 WHERE id=$1 RETURNING likes, dislikes`, [videoid]);
			data = data.rows[0];
		} else {
			var liked = await client.query(`DELETE FROM likedvideos WHERE user_id=$1 AND video_id=$2 RETURNING 1`, [userid, videoid]);
			if (liked.rows.length) {
				client.query(`UPDATE videos SET likes=likes-1 WHERE id=$1`, [videoid]);
			}

			client.query(`INSERT INTO dislikedvideos(user_id, video_id) VALUES ($1, $2)`, [userid, videoid]);

			var data = await client.query(`UPDATE videos SET dislikes=dislikes+1 WHERE id=$1 RETURNING likes, dislikes`, [videoid]);
			data = data.rows[0];
		}

		return [data.likes, data.dislikes];
	},

	//a function to like a comment
	likeComment: async function (userid, commentid) {
		var alreadyliked = await client.query(`SELECT * FROM likedcomments WHERE user_id=$1 AND comment_id=$2 LIMIT 1`, [userid, commentid]);

		if (alreadyliked.rows.length) {
			client.query(`DELETE FROM likedcomments WHERE user_id=$1 AND comment_id=$2`, [userid, commentid]);

			var data = await client.query(`UPDATE comments SET likes=likes-1 WHERE id=$1 RETURNING likes, dislikes`, [commentid]);
			data = data.rows[0];
		} else {
			var disliked = await client.query(`DELETE FROM dislikedcomments WHERE user_id=$1 AND comment_id=$2 RETURNING 1`, [userid, commentid]);
			if (disliked.rows.length) {
				client.query(`UPDATE comments SET dislikes=dislikes-1 WHERE id=$1`, [commentid]);
			}

			client.query(`INSERT INTO likedcomments(user_id, comment_id) VALUES ($1, $2)`, [userid, commentid]);

			var data = await client.query(`UPDATE comments SET likes=likes+1 WHERE id=$1 RETURNING likes, dislikes`, [commentid]);
			data = data.rows[0];
		}

		return [data.likes, data.dislikes];
	},

	//a function to dislike a comment
	dislikeComment: async function (userid, commentid) {
		var alreadydisliked = await client.query(`SELECT * FROM dislikedcomments WHERE user_id=$1 AND comment_id=$2 LIMIT 1`, [userid, commentid]);

		if (alreadydisliked.rows.length) {
			client.query(`DELETE FROM dislikedcomments WHERE user_id=$1 AND comment_id=$2`, [userid, commentid]);

			var data = await client.query(`UPDATE comments SET dislikes=dislikes-1 WHERE id=$1 RETURNING likes, dislikes`, [commentid]);
			data = data.rows[0];
		} else {
			var liked = await client.query(`DELETE FROM likedcomments WHERE user_id=$1 AND comment_id=$2 RETURNING 1`, [userid, commentid]);
			if (liked.rows.length) {
				client.query(`UPDATE comments SET likes=likes-1 WHERE id=$1`, [commentid]);
			}

			client.query(`INSERT INTO dislikedcomments(user_id, comment_id) VALUES ($1, $2)`, [userid, commentid]);

			var data = await client.query(`UPDATE comments SET dislikes=dislikes+1 WHERE id=$1 RETURNING likes, dislikes`, [commentid]);
			data = data.rows[0];
		}

		return [data.likes, data.dislikes];
	}
};

/*
OBJECT STORING CONTENT-SEARCHING FUNCTIONS
*/
var searchFunctions = {
	//this is a function that puts together a list of phrases to use in our search algorithm
	getSearchTerms: function (searchterm) {
		searchterm = searchterm.split(" ");

		var searchlength = searchterm.length;

		var terms = [];

		for (var i=searchlength; i>0; i--) {
			var looptimes = (searchlength+1)-i;

			var subterms = [];

			for (var j=0; j<looptimes; j++) {
				var end = j + i;

				var subterm = searchterm.slice(j, end).join(" ");
				var subterm2 = subterm.replace(/[^a-zA-Z ]/g, "");
				subterms.push(subterm);
				subterms.push(subterm2);
			}

			terms = terms.concat(subterms);
		}

		return terms;
	},

	//this is a function that selects videos from the database based on a given array of search terms
	searchVideos: async (phrases) => {
		var results = [];

		for (var phrase of phrases) {
			var result = await client.query(`SELECT * FROM videos WHERE private=${false} AND deleted=${false} AND (UPPER(title) LIKE UPPER($1) OR UPPER(description) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($1) OR UPPER(username) LIKE UPPER($1))`, ["%" + phrase + "%"]);

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

	//this is a function that returns the channels that come up in search results
	searchChannels: async (phrases) => {
		var results = [];

		for (var phrase of phrases) {
			var result = await client.query(`SELECT * FROM users WHERE UPPER(username) LIKE UPPER($1) OR UPPER(topics) LIKE UPPER($2)`, ["%" + phrase +"%", "%" + phrase + "%"]);

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

		for (var phrase of phrases) {
			var result = await client.query(`SELECT * FROM playlists WHERE private=${false} AND (UPPER(name) LIKE UPPER($1))`, ["%" + phrase + "%"]);
			result = result.rows;

			for (var item of result) {
				var video = await client.query(`SELECT id, thumbnail FROM videos WHERE id IN (SELECT video_id FROM playlistvideos WHERE playlist_id=$1 LIMIT 1) LIMIT 1`, [item.id]);
				video = video.rows[0];

				if (video) {
					item = Object.assign({}, item, {thumbnail: video.thumbnail, firstvideoid: video.id});

					var isDuplicate = results.some((res) => {
						return JSON.stringify(res) == JSON.stringify(item);
					});

					if (!isDuplicate) {
						results.push(item);
					}
				}
			}
		}

		return results;
	},

	//this is a function that gets all of the titles from a certain table based on an array of phrases
	getMatching: async (table, selector, phrases) => {
		var titles = [];

		for (var phrase of phrases) {
			var title = await client.query(`SELECT ${selector} FROM ${table} WHERE UPPER(${selector}) LIKE UPPER($1)`, ["%" + phrase + "%"]);
			title = title.rows;

			title.forEach((item, index) => {
				titles.push(item[`${selector}`]);
			});
		}

		titles = [...new Set(titles)];

		return titles;
	},

	//this is a function that gets all of the popular channel names based on a list of video titles/phrases
	getPopularChannels: async (phrases) => {
		var usernames = [];

		for (var phrase of phrases) {
			var username = await client.query(`SELECT username, subscribers FROM users WHERE id IN (SELECT user_id FROM videos WHERE UPPER(title) LIKE UPPER($1) LIMIT 10) LIMIT 10`, ["%" + phrase + "%"]);
			username = username.rows;

			username.forEach((item, index) => {
				var final = Object.assign({}, item, {phrase: phrase});

				var isDuplicate = usernames.some((res) => {
					return JSON.stringify(res) == JSON.stringify(final);
				});

				if (!isDuplicate) {
					usernames.push(final);
				}
			});
		}

		usernames.sort((a, b) => {
			return b.subscribers-a.subscribers;
		});

		var finalusernames = usernames.map((item) => {
			return item.username;
		});

		var finalphrases = usernames.map((item) => {
			return item.phrase;
		});

		return [finalusernames, finalphrases];
	},

	//this is a function that gets all of the popular video titles based on a list of channel names/phrases
	getPopularVideos: async (phrases) => {
		var titles = [];

		for (var phrase of phrases) {
			var title = await client.query(`SELECT title, views FROM videos WHERE user_id IN (SELECT id FROM users WHERE UPPER(username) LIKE UPPER($1) LIMIT 10) LIMIT 10`, ["%" + phrase + "%"]);
			title = title.rows;

			title.forEach((item, index) => {
				var final = Object.assign({}, item, {phrase: phrase});

				var isDuplicate = titles.some((res) => {
					return JSON.stringify(res) == JSON.stringify(final);
				});

				if (!isDuplicate) {
					titles.push(final);
				}
			});
		}

		titles.sort((a, b) => {
			return b.views-a.views;
		});

		var finaltitles = titles.map((item) => {
			return item.title;
		});

		var finalphrases = titles.map((item) => {
			return item.phrase;
		});

		return [finaltitles, finalphrases];
	},

	//this is a function that returns combination phrases between two arrays. the functionality of this is used for the purpose of combining search
	//query input with video and channel titles that are indirectly related to strings in the search query (I.E the term "websocket" in the search query
	//might be in the title of a video owned by the user "jane", but since we cannot give just the phrase "jane" as a search reccomendation, we have to combine
	//the word "websocket" with "jane" to have a proper/relevant search reccomendation that matches up with the user input)
	getPhraseCombos: async (phrases, items) => {
		var result = [];

		for (var phrase of phrases) {
			for (var item of items) {
				result.push(phrase + " " + item);
			}
		}

		result = [...new Set(result)];

		return result;
	}
};

/*
OBJECT STORING RECCOMENDATION FUNCTIONS
*/
var reccomendationFunctions = {
	//this is a function for getting reccomendations based on all of the other functions below, checking for all edge cases
	getReccomendations: async function (req, video=undefined) {
		var reccookies = await middleware.getReccomendationCookies(req);

		if (reccookies.length) {
			var cookierecs = await middleware.getCookieReccomendations(reccookies);
		} else {
			var cookierecs = [];
		}

		if (typeof video == 'undefined') {
			var reccomendations = await middleware.getRandomReccomendations(30);
			reccomendations.concat(cookierecs);
		} else {
			var reccomendations = await middleware.getVideoReccomendations(video);
			reccomendations.concat(cookierecs);
			reccomendations = reccomendations.filter((item) => {
				return !(JSON.stringify(item) == JSON.stringify(video));
			});
		}

		reccomendations = await middleware.deleteDuplicates(reccomendations);

		return reccomendations;
	},

	//this is a function for getting the reccomendations for the videos according to the title and description of the video being viewed
	getVideoReccomendations: async function (video) {
		var phrases = middleware.getSearchTerms(video.title);
		phrases = phrases.concat(middleware.getSearchTerms(video.username));

		var vids = await middleware.searchVideos(phrases);

		vids = vids.filter((item) => {
			return !(JSON.stringify(video) == JSON.stringify(item));
		});

		return vids;
	},

	//this is a function that gets random reccomendations from the database
	getRandomReccomendations: async function (amount=5) {
		var videos = await client.query(`SELECT * FROM videos WHERE deleted=false AND private=false ORDER BY random() LIMIT $1`, [amount]);

		return videos.rows;
	},

	//this is a function to get all of the reccomendation cookies from the user's current session
	getReccomendationCookies: async function (req) {
		//get an array of objects where the key-value pairs are the name-value pairs of the cookies
		var newCookies = Object.keys(req.cookies).map((item) => {
			var obj = {};
			obj[item] = req.cookies[item];
			return obj;
		});

		//get all of the cookies that have a reccomendation naming scheme (VR for video rec, SR for search rec, and CR for a channel rec)
		newCookies = newCookies.filter((item) => {
			var cookiename = Object.keys(item)[0];
			return cookiename.match(/^VR-|^SR-|^CR-/);
		});

		return newCookies;
	},

	//this is a function that gets reccomendations based on all of the search reccomendation cookies in the user's session
	getCookieReccomendations: async function (cookies) {
		var recs = [];

		var searchcookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^SR-/);
		});

		for (var cookie of searchcookies) {
			var cookievalue = Object.values(cookie)[0];

			var phrases = await middleware.getSearchTerms(cookievalue);

			for (var phrase of phrases) {
				var video = await client.query(`SELECT * FROM videos WHERE (UPPER(title) LIKE UPPER($1) OR UPPER(username) LIKE UPPER($1)) AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 1`, ["%" + phrase + "%"]);
				if (video.rows.length) {
					recs.push(video.rows[0]);
				}
			}
		}

		var videocookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^VR-/);
		});

		for (var cookie of videocookies) {
			var cookievalue = Object.values(cookie)[0];
			cookievalue = cookievalue.split("+"); //get the video title and the id of the channel that created the video

			var titlephrases = await middleware.getSearchTerms(cookievalue[0]);

			for (var phrase of titlephrases) {
				var video = await client.query(`SELECT * FROM videos WHERE UPPER(title) LIKE UPPER($1) AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 1`, ["%" + phrase + "%"]);
				if (video.rows.length) {
					recs.push(video.rows[0]);
				}
			}

			var channelvideos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 5`, [cookievalue[1]]);

			channelvideos.rows.forEach((item) => {
				recs.push(item);
			});
		}

		var channelcookies = cookies.filter((item) => {
			return Object.keys(item)[0].match(/^CR-/);
		});

		for (var cookie of channelcookies) {
			var cookievalue = Object.values(cookie)[0];

			var channelvideos = await client.query(`SELECT * FROM videos WHERE user_id=$1 AND deleted=${false} AND private=${false} ORDER BY random() LIMIT 5`, [cookievalue]);

			channelvideos.rows.forEach((item) => {
				recs.push(item);
			});
		}

		recs = await middleware.deleteDuplicates(recs);

		return recs;
	}
};

/*
OBJECT FOR STORING LOGGING FUNCTIONS
*/
var loggingFunctions = {
	//this is a function that counts the amount of hits on the site
	hitCounter: async function(req, res, next) {
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		if (req.method == "GET") {
			console.log("HIT FROM: " + req.ip.toString());
			if (typeof userinfo != 'undefined') {
				var logstring = `GET ${req.url.toString()} FROM --> IP: ${req.ip.toString()}, ID: ${userinfo.id}, USERNAME: ${userinfo.username}`;
			} else {
				var logstring = `GET ${req.url.toString()} FROM --> IP: ${req.ip.toString()}`;
			}
			middleware.log("info", logstring);
		}

		if (req.method == "POST") {
			console.log("ACTION FROM: " + req.ip.toString());
			if (typeof userinfo != 'undefined') {
				var logstring = `POST ${req.url.toString()} FROM --> IP: ${req.ip.toString()}, ID: ${userinfo.id}, USERNAME: ${userinfo.username}`;
			} else {
				var logstring = `POST ${req.url.toString()} FROM --> IP: ${req.ip.toString()}`;
			}
			middleware.log("info", logstring);
		}

		next();
	},

	//this is a function that writes to a log file to see the traffic
	log: function(level, message) {
		var currenttime = new Date().toISOString();

		message = `(${currenttime}) --> ${message}`;

		logger.log({level: level, message: message})
	}
};

/*
OBJECT FOR STORING SHUTDOWN FUNCTIONS
*/
var shutdownFunctions = {
	//this is a function that executes whenever the node process is killed (server shuts down)
	shutDown: function() {
		console.log("Shutting Down...");

		process.exit(0);
	},

	//check to see if the server should execute the shutdown process
	onShutdown: function() {
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
		var uri = decodeURIComponent(uri);

		var magnetHealthResponse = await got(`https://checker.openwebtorrent.com/check?magnet=${encodeURIComponent(uri)}`);

		var magnetHealth = JSON.parse(magnetHealthResponse.body);

		var magnetIsHealthy = (magnetHealth.peers || magnetHealth.seeds);

		var magnetmatch = new RegExp(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/, "i");

		return (uri.match(magnetmatch) !== null && magnetIsHealthy);
	}
};

/*
OBJECT FOR STORING FUNCTIONS FOR ADVERTISEMENT/PAYMENT FUNTIONALITY
*/
var adHandling = {
	//a function for basically storing an ad resolutions array with the ad type and positioning
	getAdResolutions: async () => {
	        var acceptedDimensions = [
			{width: 720, height: 90, position: "banner"},
			{width: 728, height: 90, position: "banner"},
			{width: 300, height: 250, position: "square"},
			{width: 160, height: 600, position: "sidebanner"},
			{width: 88, height: 31, position: "square"}
		];

		return acceptedDimensions;
	},

	/*
	a function for checking the resolution of an ad image against other resolutions
	and returning the resolution of the ad image if the ad is one of the accepted
	resolutions
	*/
	getAdResolution: async (adImgRes) => {
	        var acceptedDimensions = await middleware.getAdResolutions();

	        for (var resolution of acceptedDimensions) {
	                if (resolution.width == adImgRes.width && resolution.height == adImgRes.height) {
				adImgRes.type = resolution.type;
				adImgRes.position = resolution.position;
	                }
	        }

		return adImgRes;
	}
};

var middleware = Object.assign({}, userauthFunctions, reqHandling, deletionHandling, miscFunctions, searchFunctions, reccomendationFunctions, loggingFunctions, shutdownFunctions, mediaHandling, torrentHandling, adHandling);
module.exports = middleware;
