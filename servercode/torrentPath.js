const {app, client, redisClient} = require("./configBasic");

/*
GET PATHS FOR TORRENTING DATA AND SAVING MAGNET LINKS
*/

//a get path to retrieve a magnet link based on a video/content id
app.get("/getmagnet/:contentid", async (req, res) => {
	//get the content id we want the magnet link of
	var contentid = req.params.contentid;

	//get the magnet URI from the redis server
	var magnetlink = await redisClient.getAsync(contentid);

	//check for the existence of the magnet link
	if (magnetlink != null) {
		res.send(magnetlink);
	} else {
		res.send(false);
	}
});


//a get path to set the magnet link for a piece of content
app.get("/setmagnet/:contentid", async (req, res) => {
	//get the content id
	var contentid = req.params.contentid;

	console.log("CONTENT ID FOR SETTING MAGNET:", contentid);

	//create a regex match for checking valid magnet links
	var magnetmatch = new RegExp(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/, "i");

	//check for the validity of the magnet link given in the query params
	if (req.query.magnetlink.match(magnetmatch) !== null) { //if this is a valid magnet link
		//get data from the redis server to make sure this entry is empty
		var magnetlink = await redisClient.getAsync(contentid);

		//do something based on if the magnet link exists in the redis store or not
		if (magnetlink == null) { //if there is no entry for this piece of content
			//enter the new magnet link with this content id
			redisClient.set(contentid, req.query.magnetlink);
			res.send(true);
		} else { //if there is an existing magnet link for this piece of content
			console.log("pre-existing magnet link");
			res.send(false);
		}
	} else { //if this is an invalid magnet link
		console.log("INVALID MAGNET LINK");
		res.send(false);
	}
});
