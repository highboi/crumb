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
	var videos = await middleware.searchVideos(phrases);

	//get the channels that match the search terms
	var channels = await middleware.searchChannels(phrases);

	//get the playlists that match the search terms
	var playlists = await middleware.searchPlaylists(phrases);

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

	//get the individual phrases of the search query
	var phrases = await middleware.getSearchTerms(searchquery);

	//get all of the video title values that match the phrases
	var videos = await middleware.getMatching("videos", "title", phrases);

	//get all of the channel names that match the search query
	var channels = await middleware.getMatching("users", "username", phrases);

	//get all of the playlist names that match the search query
	var playlists = await middleware.getMatching("playlists", "name", phrases);

	//get all of the channel usernames that match up with videos that have a title similar to the search query
	var popchannels = await middleware.getPopularChannels(phrases);

	//get all of the popular video titles associated with channels that have a similar title to the search query
	var popvideos = await middleware.getPopularVideos(phrases);

	//combine the total results of all of the reccomendations, with videos and channels being the top priority before playlists
	var results = videos.concat(channels, playlists, popchannels, popvideos);

	//send the resulting video titles to the client side
	res.send(results);
});
