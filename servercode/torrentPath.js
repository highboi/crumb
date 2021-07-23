const {app, client, redisClient, middleware} = require("./configBasic");
const got = require("got");

/*
GET PATHS FOR TORRENTING DATA AND SAVING MAGNET LINKS
*/

//a get path to retrieve a magnet link based on a video/content id
app.get("/getmagnet/:contentid", async (req, res) => {
	//get the content id we want the magnet link of
	var contentid = req.params.contentid;

	//get the magnet URI from the redis server
	var magnetlink = await redisClient.getAsync(contentid);

	//get the magnet health status
	var magnetHealth = await middleware.checkMagnetHealth(magnetlink);

	//check for the validity of the current magnet link
	if (magnetlink != null && magnetHealth) { //if the magnet link is existent, working, and valid
		res.send(magnetlink);
	} else { //if the current magnet link doesn't exist, isn't valid in structure, or doesn't work
		res.send(false);
	}
});


//a get path to set the magnet link for a piece of content
app.get("/setmagnet/:contentid", async (req, res) => {
	//get the content id
	var contentid = req.params.contentid;

	console.log(`ATTEMPT TO SET MAGNET FOR CONTENT ID: ${contentid}`);

	//get the magnet health status
	var magnetHealth = await middleware.checkMagnetHealth(req.query.magnetlink);

	//check for the validity of the magnet link given in the query params
	if (magnetHealth) { //if this is a valid magnet link
		//get data from the redis server to make sure this entry is empty
		var magnetlink = await redisClient.getAsync(contentid);

		//do something based on if the magnet link exists in the redis store or not
		if (magnetlink == null) { //if there is no entry for this piece of content
			//enter the new magnet link with this content id
			redisClient.set(contentid, req.query.magnetlink);
			console.log("SETTING MAGNET LINK");
			res.send(true);
		} else { //if there is an existing magnet link for this piece of content
			console.log("PRE-EXISTING HEALTHY MAGNET LINK");
			res.send(false);
		}
	} else { //if this is an invalid magnet link
		console.log("INVALID/UNHEALTHY MAGNET LINK");
		res.send(false);
	}
});
