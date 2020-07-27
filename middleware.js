//this is a file for storing middleware functions and functions to help the code
//to look better

//get the necessary dependencies for use in this file
const fs = require("fs");
const client = require("./dbConfig");
const crypto = require("crypto");

//import the autocorrect library with a custom path to a custom dictionary file
var dictpath = "/home/merlin/webdev/crumb/storage/server/words.txt";
const autocorrect = require("autocorrect")({dictionary: dictpath});

middleware = {
	//this is a function that redirects users to the login page if the user is not signed in
	//this is used for pages and requests that require a login
	checkSignedIn: function (req, res, next) {
		if (req.session.user) {
			next();
		} else {
			req.flash("message", "Please sign in.");
			res.redirect("/login");
		}
	},

	//this is a function to redirect users to the index page if they are signed in already
	//this is used for login pages and other forms that sign the user in
	checkNotSignedIn: function (req, res, next) {
		if (req.session.user) {
			req.flash("message", "Already Logged In!");
			res.redirect("/");
		} else {
			next();
		}
	},

	//this is the function that generates a unique id for each video
	//this function needs to be asynchronous as to allow for
	//the value of a DB query to be stored in a variable
	generateAlphanumId: async function () {
		//generate random bytes for the random id
		var newid = crypto.randomBytes(11).toString("hex");

		console.log("Generated new ID: " + newid);

		//get the response from the database
		var res = await client.query(`SELECT * FROM videos WHERE id=$1`, [newid]);

		//get comment ids
		var commentres = await client.query(`SELECT * FROM comments WHERE id=$1`, [newid]);

		//if the database returned more than 0 rows, this means that a video
		//with the generated id exists, meaning that the function must be
		//executed again in order to generate a truly unique id
		if (res.rows.length > 0 || commentres.rows.length > 0) {
			middleware.generateAlphanumId();
		} else { //if a unique id has been found, return this id
			console.log("Valid ID Found: " + newid.toString());
			return newid;
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

	//this is a function for managing auto-correcting strings for searches on the site
	autoCorrect: function (query, checkCaps=false, checkTitle=false) {
		//this is the regex to filter for special characters
		var regexp = /[^a-zA-Z ]/g;

		//an array to store the matches for special characters
		var matches = [];

		//loop and find all of the matches for special characters so that we can put them back later
		while ((match = regexp.exec(query)) != null) {
			var arr = [];
			arr.push(match.index);
			arr.push(match);
			matches.push(arr);
		}

		//strip the query of special characters so that they dont get autocorrected to "aa"
		//this is the array to search through for words to be corrected
		var searcharray = query.replace(regexp, "").split(" ");

		//a variable to store the autocorrected words
		var correctedarray = [];

		//search through the array and autocorrect each word if need be
		searcharray.forEach((item, index) => {
			if (checkCaps) {
				correctedarray.push(autocorrect(item.toLowerCase()));
			} else if (checkTitle) {
				var titlecase = item.charAt(0).toUpperCase() + item.substr(1).toLowerCase();
				if (titlecase == item) {
					//autocorrect the actual word in lower case to prevent errors
					autocorrectedTitle = autocorrect(item.toLowerCase());
					//convert the word back into title case and put it back into the corrected array
					autocorrectedTitle = autocorrectedTitle.charAt(0).toUpperCase() + autocorrectedTitle.substr(1).toLowerCase();
					correctedarray.push(autocorrectedTitle);
				} else {
					correctedarray.push(item);
				}
			} else {
				correctedarray.push(autocorrect(item));
			}
		});

		//join the corrected array into a corrected string
		var correctedstring = correctedarray.join(" ");

		console.log("CORRECTED: " + correctedstring);

		//place the special characters back into the array based on the index
		matches.forEach((item, index) => {
			var charindex = item[0];
			var char = item[1];
			correctedstring = correctedstring.slice(0, charindex) + char + correctedstring.slice(charindex);
		});

		//return the corrected query string with special characters included
		return correctedstring;
	},

	//this is a function that selects videos from the database based on a given array of search terms
	searchVideos: async (phrases, existingResults=[]) => {
		//an array to store all of the video objects selected from the database
		var results = [];
		//get all of the videos from the database based on the list of phrases
		for (var i=0; i<phrases.length; i++) {
			//get all of the videos from the database with a title matching the current term
			var result = await client.query(`SELECT * FROM videos WHERE title LIKE $1`, ["%" + phrases[i] + "%"]);
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
				//loop through the existing results and check if the videos have already been added in a previous function call
				for (var j=0; j<existingResults.length; j++) {
					//if the video in the existing results array contains the video being added currently, then it has already been added
					//to the results
					if (JSON.stringify(existingResults[j]) == JSON.stringify(item)) {
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

	//a function for getting a date string for showing the post date of videos, etc
	getDate: function () {
		//get the current time at the time of executing the function
		var currenttime = new Date();

		//get the minutes
		var minutes = currenttime.getMinutes();

		//get the hours
		var hours = currenttime.getHours();

		//get the day
		var day = currenttime.getDate();

		//get the month
		var month = currenttime.getMonth()+1;

		//get the year
		var year = currenttime.getFullYear();

		//bring all of the details into one date string, having each number seperated by dashes for splitting the string later on
		var datestring = [year.toString(), month.toString(), day.toString(), hours.toString(), minutes.toString()];
		datestring = datestring.join("-");

		//return the date string
		return datestring;
	},

	//this is a function for getting the reccomendations for the videos according to the title and description of the video being viewed
	getReccomendations: async function (video) {
		//get a list of phrases to use in searching for results in the database
		var phrases = middleware.getSearchTerms(video.title);

		//get the results of searching for the videos based on the list of phrases in the db
		var vids = await middleware.searchVideos(phrases);

		//eliminate the video from the list if the video being viewed is in the list
		vids.forEach((item, index) => {
			if (item.id == video.id) {
				vids.splice(index, 1);
			}
		});

		//return the videos
		return vids;
	}
}

//export the object with all of the middleware functions
module.exports = middleware;
