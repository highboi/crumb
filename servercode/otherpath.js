const {app, client, middleware} = require("./configBasic");

//get the index of the site working
app.get('/', async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//get videos for the index page
	var videos = await middleware.getReccomendations(req);

	//insert the video rows into the view object
	viewObj.videos = videos;

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

	//get all of the video, channel, and playlist titles based on the search query
	var videos = await middleware.getMatching("videos", "title", phrases);
	var channels = await middleware.getMatching("users", "username", phrases);
	var playlists = await middleware.getMatching("playlists", "name", phrases);

	/*
	get channel names that belong to channels containing video titles that match the search query
	and do the opposite as well. Gets two arrays, an array of related names, and the phrases that match
	with these values
	*/
	var [popusernames, usernamephrases] = await middleware.getPopularChannels(phrases);
	var [popvideos, videophrases] = await middleware.getPopularVideos(phrases);

	//get popular video and channel reccomendation phrase combos
	var popvideorecs = await middleware.getPhraseCombos(usernamephrases, popusernames);
	var popchannelrecs = await middleware.getPhraseCombos(videophrases, popvideos);

	//combine the total results of all of the reccomendations, with videos and channels being the top priority before playlists
	var results = [].concat(videos, channels, playlists, popvideorecs, popchannelrecs);

	//make sure that these are all lowercase values
	results = results.map((item) => {
		return item.toLowerCase();
	});

	//remove duplicate values
	results = [...new Set(results)];

	//send the resulting video titles to the client side
	res.send(results);
});
