const {app, client, redisClient} = require("./configBasic");
const got = require("got");

//function for checking the health and validity of a magnet link
async function checkMagnetHealth(uri) {
	//decode the uri into the magnet link instead of url encoded stuff for proper checking
	var uri = decodeURIComponent(uri);

	//make sure the pre-existing magnet link is a valid one with working peers/seeders by sending the magnet link to a checker
	var magnetHealthResponse = await got(`https://checker.openwebtorrent.com/check?magnet=${encodeURIComponent(uri)}`);

	//get the full magnet health data from the response body
	var magnetHealth = JSON.parse(magnetHealthResponse.body);

	console.log(magnetHealth);

	//get the peers/seeders amount and turn this into a logic statement to verify the health of the magnet link
	var magnetIsHealthy = (magnetHealth.peers || magnetHealth.seeds);

	//create a regex match for checking valid magnet links
	var magnetmatch = new RegExp(/magnet:\?xt=urn:[a-z0-9]+:[a-z0-9]{32}/, "i");

	//return the result of the magnet health and the magnet regex match
	return (uri.match(magnetmatch) !== null && magnetIsHealthy);
}

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
	var magnetHealth = await checkMagnetHealth(magnetlink);

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
	var magnetHealth = await checkMagnetHealth(req.query.magnetlink);

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
