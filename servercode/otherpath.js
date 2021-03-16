const {app, client, middleware} = require("./configBasic");

//get the index of the site working
app.get('/', async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//select all of the videos from the database to be displayed
	var videos = await client.query(`SELECT * FROM videos WHERE deleted=${false} AND private=${false} LIMIT 50`);

	//insert the video rows into the view object
	viewObj.videos = videos.rows;

	//render the view
	res.render("index.ejs", viewObj);
});

//the error path for error rendering
app.get('/error', async (req, res) => {
	var viewObj = await middleware.getViewObj(req);
	res.render("error.ejs", viewObj);
});

//get request for searching for videos
app.get("/search", async (req, res) => {
	//a search object to store things about our search
	var search = {};

	//store the query in a variable so that it will be easier to recall the variable
	var query = req.query.searchquery;

	//store the original query
	search.humanquery = query;

	//get the phrases/keywords from the query through the algorithm
	var phrases = middleware.getSearchTerms(search.humanquery);

	//add the results for the regular phrases into the results array
	var videos = await middleware.searchVideos("*", phrases);

	//get the channels that match the search terms
	var channels = await middleware.searchChannels("*", phrases);

	//get the playlists that match the search terms
	var playlists = await middleware.searchPlaylists("*", phrases);

	//store the array of video objects inside the search object
	search.videos = videos;
	search.channels = channels;
	search.playlists = playlists;

	//get the view object and insert the search results
	var viewObj = await middleware.getViewObj(req);
	viewObj.search = search;

	res.render("searchresults.ejs", viewObj);
});

//this is a get path for search reccomendations as the user types them into the search bar
app.get("/getsearchrecs", async (req, res) => {
	//get the search query
	var searchquery = req.query.searchquery;

	//get all of the titles of videos and streams that are most similar to the search query
	var videos = await client.query(`SELECT title FROM videos WHERE UPPER(title) LIKE UPPER($1) ORDER BY likes`, ["%" + searchquery + "%"]);
	videos = videos.rows;

	//get all of the titles of playlists
	var playlists = await client.query(`SELECT name FROM playlists WHERE UPPER(name) LIKE UPPER($1)`, ["%" + searchquery + "%"]);
	playlists = playlists.rows;

	//get all of the channels with the search query in the title
	var channels = await client.query(`SELECT username FROM users WHERE UPPER(username) LIKE UPPER($1) ORDER BY subscribers`, ["%" + searchquery + "%"]);
	channels = channels.rows;

	//get popular channels which contain occurrences of the keyword(s) in the search query
	var popchannels = await client.query(`SELECT username FROM users WHERE id IN (SELECT user_id FROM videos WHERE UPPER(title) LIKE UPPER($1)) ORDER BY subscribers`, ["%" + searchquery.trim() + "%"]);;
	popchannels = popchannels.rows;

	//get popular keywords associated with the channel (if there is one) typed into the search query
	var popkeywords = await client.query(`SELECT title FROM videos WHERE user_id IN (SELECT id FROM users WHERE UPPER(username) LIKE UPPER($1)) ORDER BY likes`, ["%" + searchquery.trim() + "%"]);
	popkeywords = popkeywords.rows;

	//combine the total results of all of the reccomendations, with videos and channels being the top priority before playlists
	var results = videos.concat(channels, playlists, popchannels, popkeywords);

	//get all of the values of each object, as these are the reccomendation values
	results = results.map((item, index) => {
		return Object.values(item);
	});

	//concatenate with the ellipsis (...) to turn the 2d array to a 1d array
	results = [].concat(...results);

	//send the resulting video titles to the client side
	res.send(results);
});
