const {app, client, redisClient, middleware} = require("./configBasic");

/*
GET PATHS FOR TORRENTING DATA AND SAVING MAGNET LINKS
*/

//a get path to retrieve a magnet link based on a video/content id
app.get("/getmagnet/:contentid", async (req, res) => {
	var contentid = req.params.contentid;

	var magnetlink = await redisClient.getAsync(contentid);

	var magnetHealth = await middleware.checkMagnetHealth(magnetlink);

	if (magnetlink != null && magnetHealth) {
		res.send(magnetlink);
	} else {
		res.send(false);
	}
});


//a get path to set the magnet link for a piece of content
app.get("/setmagnet/:contentid", async (req, res) => {
	var contentid = req.params.contentid;

	var magnetHealth = await middleware.checkMagnetHealth(req.query.magnetlink);

	if (magnetHealth) {
		var magnetlink = await redisClient.getAsync(contentid);

		if (magnetlink == null) {
			redisClient.set(contentid, req.query.magnetlink);
			res.send(true);
		} else {
			res.send(false);
		}
	} else {
		res.send(false);
	}
});
