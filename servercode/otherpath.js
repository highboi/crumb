const {app, client, middleware} = require("./configBasic");

//get the index of the site working
app.get('/', async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var videos = await middleware.getReccomendations(req);

	viewObj.videos = videos;

	return res.render("index.ejs", viewObj);
});

//the error path for error rendering
app.get('/error', async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	viewObj.redirecturl = req.flash("redirecturl");

	return res.render("error.ejs", viewObj);
});

//get request for searching for videos
app.get("/search", async (req, res) => {
	var search = {};

	search.humanquery = req.query.searchquery;

	var phrases = middleware.getSearchTerms(search.humanquery);

	search.videos = await middleware.searchVideos(phrases);
	search.channels = await middleware.searchChannels(phrases);
	search.playlists = await middleware.searchPlaylists(phrases);

	var viewObj = await middleware.getViewObj(req, res);
	viewObj.search = search;

	return res.render("searchresults.ejs", viewObj);
});

//this is a get path for search reccomendations as the user types them into the search bar
app.get("/getsearchrecs", async (req, res) => {
	var searchquery = req.query.searchquery;

	var phrases = await middleware.getSearchTerms(searchquery);

	//get the names of the videos, channels, and playlists that match with the search query
	var videos = await middleware.getMatching("videos", "title", phrases);
	var channels = await middleware.getMatching("users", "username", phrases);
	var playlists = await middleware.getMatching("playlists", "name", phrases);

	//get popular video and channel names/titles along with the phrases that linked those titles together
	var [popusernames, usernamephrases] = await middleware.getPopularChannels(phrases);
	var [popvideos, videophrases] = await middleware.getPopularVideos(phrases);

	//combine the popular video/channel titles with the phrases that were linked to them
	var popvideorecs = await middleware.getPhraseCombos(usernamephrases, popusernames);
	var popchannelrecs = await middleware.getPhraseCombos(videophrases, popvideos);

	var results = [].concat(videos, channels, playlists, popvideorecs, popchannelrecs);
	results = results.map((item) => {
		return item.toLowerCase();
	});
	results = [...new Set(results)];

	return res.send(results);
});

//a get path for returning the accepted image types on the server
app.get("/imgtypes", async (req, res) => {
	var acceptedtypes = ["png", "jpeg", "jpg", "gif"];
	acceptedtypes = acceptedtypes.map((item) => {
		return "image/" + item;
	});

	res.send({acceptedTypes: acceptedtypes});
});

//a get path for returning the accepted video types on the server
app.get("/vidtypes", async (req, res) => {
	var acceptedtypes = ["webm", "ogg", "mp4"];
	acceptedtypes = acceptedtypes.map((item) => {
		return "video/" + item;
	});

	res.send({acceptedTypes: acceptedtypes});
});

//a get path for returning the accepted file signatures for images
app.get("/imgheaders", async (req, res) => {
	var acceptedheaders = ["89504e47", "47494638", "ffd8ffdb", "ffd8ffe0", "ffd8ffee", "ffd8ffe1"];

	res.send({acceptedHeaders: acceptedheaders});
});

//a get path for returning the accepted file signatures for videos
app.get("/vidheaders", async (req, res) => {
	var acceptedheaders = ["00000018", "00000020", "1a45dFa3", "4f676753"];

	res.send({acceptedHeaders: acceptedheaders});
});
