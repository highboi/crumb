const {app, client, middleware} = require("./configBasic");

/*
GET PATHS FOR PLAYLISTS
*/

//this is a get request for the playlists on the site
app.get("/p/:playlistid", async(req, res) => {
	//get all of the videos in the db
	var videos = await client.query(`SELECT * FROM videos WHERE id IN (SELECT video_id FROM playlistvideos WHERE playlist_id=$1)`, [req.params.playlistid]);
	videos = videos.rows;

	//get the playlist object which contains the name of the playlist and the id of the user that created it
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1`, [req.params.playlistid]);
	playlist = playlist.rows[0];

	//get the creator of the playlist
	var creator = await client.query(`SELECT * FROM users WHERE id=$1`, [playlist.user_id]);
	creator = creator.rows[0];

	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//create view object to pass into the view
	viewObj = Object.assign({}, viewObj, {creator: creator, videos: videos, playlist: playlist});

	//render the view for the playlist
	res.render("viewplaylist.ejs", viewObj);
});

//this is a get path for adding videos to playlists on the site
app.get("/playlistvideo/add/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user info from the session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see if the video is in the playlist already
	if (typeof playlistvideo != 'undefined') { //if the video has already been added, then render an error
		req.flash("message", "Video has already been added to the playlist.");
		res.redirect("/error");
	} else {
		//do something based on if the playlist belongs to the user or not
		if (typeof playlist != 'undefined') {
			//get the amount of videos in the playlist
			var videocount = parseInt(playlist.videocount, 10);
			videocount = videocount + 1;
			//add the video into the playlist
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [req.params.playlistid, req.params.videoid]);
			//update the video count in the playlist
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [videocount, req.params.playlistid]);
			//redirect to the playlist again
			res.redirect(`/p/${req.params.playlistid}`);
		} else { //if the playlist does not belong to the user, render an error
			req.flash("message", "This playlist does not belong to you.");
			res.redirect("/error");
		}
	}
});

//this is a get path for deleting videos from playlists on the site
app.get("/playlistvideo/delete/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	//get the user from the session store
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//get the playlist from the database
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
	playlist = playlist.rows[0];

	//get the playlist-video relation from the database
	var playlistvideo = await client.query(`SELECT * FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
	playlistvideo = playlistvideo.rows[0];

	//check to see whether or not the video is in the playlist or not
	if (typeof playlistvideo != 'undefined') { //if the video is in the playlist, delete it
		//do something based on if the playlist belongs to the user or not
		if (typeof playlist != 'undefined') { //if the playlist belongs to the user
			//get the amount of videos in the playlist
			var videocount = parseInt(playlist.videocount, 10);
			videocount = videocount - 1;
			//delete the video from the playlist
			await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
			//update the video count on the playlist
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [videocount, req.params.playlistid]);
			req.flash("message", "Video Deleted!");
			//redirect to the playlist again
			res.redirect(`/p/${req.params.playlistid}`);
		} else { //if the playlist does not belong to the user, then render an error
			req.flash("message", "Playlist does not belong to you.")
			res.redirect("/error");
		}
	} else { //if the video is not in the playlist, then render an error
		req.flash("message", `Video with ID: ${playlistvideo.video_id} not in playlist.`);
		res.redirect("/error");
	}
});

//this is a get request for creating a new playlist
app.get("/playlist/new", middleware.checkSignedIn, async (req, res) => {
	//get the view object
	var viewObj = await middleware.getViewObj(req);

	//insert the video id to insert into the playlist on creation
	if (typeof req.query.videoid != 'undefined') {
		viewObj.videoid = req.query.videoid;
	}

	//render the form for creating a new playlist
	res.render("createplaylist.ejs", viewObj);
});

//this is a get request for deleting a playlist
app.get("/playlist/delete/:playlistid", middleware.checkSignedIn, async (req, res) => {
	//get the user from the session store once again
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//check to see if the playlist belongs to the user
	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 AND user_id=$2`, [req.params.playlistid, userinfo.id]);
	playlist = playlist.rows[0];

	//check to see if the playlist exists in the first place
	if (typeof playlist != 'undefined' && playlist.candelete) { //if the playlist exists and is allowed to be deleted, then delete it
		//delete the playlist from the database
		await client.query(`DELETE FROM playlists WHERE id=$1`, [req.params.playlistid]);
		//delete any associated video ids from the playlistvideos table
		await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1`, [req.params.playlistid]);
		//redirect to the index along with a message that the playlist was deleted
		req.flash("message", "Playlist Deleted!");
		res.redirect("/");
	} else if (typeof playlist != 'undefined' && !playlist.candelete) {
		//reload the playlist and say that the playlist cannot be deleted
		req.flash("message", "Playlist cannot be deleted, it is a default.");
		res.redirect(`/p/${playlist.id}`);
	} else { //if the playlist does not exist or does not belong to the user, then render an error
		req.flash("message", `Playlist with ID: ${playlist.id} is nonexistent or does not belong to you.`);
		res.redirect("/error");
	}
});

/*
POST PATHS FOR PLAYLISTS
*/

//this is a post link to create a new playlist
app.post("/playlist/create", middleware.checkSignedIn, async (req, res) => {
	//get the user from redis
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//generate a new id for the playlist
	var newid = await middleware.generateAlphanumId();

	//get any playlists with matching properties to the one trying to be created
	var results = await client.query(`SELECT * FROM playlists WHERE user_id=$1 AND name=$2`, [userinfo.id, req.body.name]);

	//check to see if this playlist already exists
	if (results.rows.length > 0) { //if the playlist already exists
		//set a flash message to let the user know that the playlist already exists
		req.flash("message", "Playlist with the same name already exists.");
		//redirect the user to the playlist in question
		res.redirect(`/p/${results.rows[0].id}`);
	} else { //add the playlist into the db
		//add the details of the playlist into the database
		await client.query(`INSERT INTO playlists (id, name, user_id, candelete) VALUES ($1, $2, $3, $4)`, [newid, req.body.name, userinfo.id, true]);
		//check to see if there is a video that needs to be added to the new playlist
		if (typeof req.body.videoid != 'undefined') {
			//insert the video id and playlist id into the playlistvideos table
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [newid, req.body.videoid]);
			//update the amount of videos in the playlist (which is now 1)
			await client.query(`UPDATE playlists SET videocount=$1 WHERE id=$2`, [1, newid]);
		}
		//redirect to the playlist
		res.redirect(`/p/${newid}`);
	}
});

