const {app, client, redisClient} = require("./configBasic");

/*
GET PATHS FOR TORRENTING DATA AND SAVING MAGNET LINKS
*/

//a get path to retrieve a magnet link based on a video/content id
app.get("/magnet/:contentid", async (req, res) => {
	//get the content id we want the magnet link of
	var contentid = req.params.contentid;

	//get the magnet URI from the redis server
	var magnetlink = await redisClient.getAsync(contentid);

	//check for the existence of the magnet link
	if (magnetlink != null) {
		res.send(magnetlink);
	} else {
		res.send(undefined);
	}
});


//a get path to set the magnet link for a piece of content
app.get("/setmagnet/:contentid", async (req, res) => {
	//get the content id
	var contentid = req.params.contentid;

	//get data from the redis server to make sure this entry is empty
	var magnetlink = await redisClient.getAsync(contentid);


	//do something based on if the magnet link exists or not
	if (magnetlink == null) { //if there is no entry for this piece of content
		//enter the new magnet link with this content id
		redisClient.set(contentid, req.query.magnetlink);
		res.send(true);
	} else { //if there is an existing magnet link for this piece of content
		//check to see that the pre-existing magnet link is ok
		console.log("pre-existing magnet link");
		res.send(false);
	}
});
