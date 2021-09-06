const {app, client, middleware} = require("./configBasic");

/*
GET PATHS FOR PLAYLISTS
*/

//this is a get request for the playlists on the site
app.get("/p/:playlistid", async(req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var viewObj = await middleware.getViewObj(req, res);

	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 LIMIT 1`, [req.params.playlistid]);
	playlist = playlist.rows[0];

	if (!(playlist.private && (typeof userinfo == 'undefined' || userinfo.id != playlist.user_id))) {
		var videos = await client.query(`SELECT videos.*, playlistvideos.videoorder FROM videos INNER JOIN playlistvideos ON videos.id=playlistvideos.video_id AND playlistvideos.playlist_id=$1`, [req.params.playlistid]);
		videos = videos.rows;
		videos = videos.sort((a, b) => {return a.videoorder-b.videoorder});

		var creator = await client.query(`SELECT * FROM users WHERE id=$1 LIMIT 1`, [playlist.user_id]);
		creator = creator.rows[0];

		viewObj = Object.assign({}, viewObj, {creator: creator, videos: videos, playlist: playlist});
	} else {
		viewObj = Object.assign({}, viewObj, {playlist: playlist});
	}

	return res.render("viewplaylist.ejs", viewObj);
});

//this is a get request to display videos as a part of a playlist instead of standalone content
app.get("/playlistvideo/view/:playlistid/:videoid", async (req, res) => {
	var video = await client.query(`SELECT * FROM videos WHERE id IN (SELECT video_id FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2 LIMIT 1) LIMIT 1`, [req.params.playlistid, req.params.videoid]);
	video = video.rows[0];

	if (typeof video == 'undefined') {
		req.flash("message", "Video does not exist in playlist.");
		return res.redirect("/error");
	}

	var viewObj = await middleware.getViewObj(req, res);

	var playlist = await client.query(`SELECT * FROM playlists WHERE id=$1 LIMIT 1`, [req.params.playlistid]);
	playlist = playlist.rows[0];

	var playlistvideos = await client.query(`SELECT videos.*, playlistvideos.videoorder FROM videos INNER JOIN playlistvideos ON videos.id=playlistvideos.video_id AND playlistvideos.playlist_id=$1`, [req.params.playlistid]);
	playlistvideos = playlistvideos.rows;
	playlistvideos = playlistvideos.sort((a, b) => {return a.videoorder-b.videoorder});

	var reccomendations = await middleware.getReccomendations(req, video);

	var videoInfo = await middleware.getVideoInfo(video);

	viewObj = Object.assign({}, viewObj, {playlist: playlist, video: video, playlistvideos: playlistvideos, reccomendations: reccomendations}, videoInfo);

	return res.render("viewvideo.ejs", viewObj);
});

//this is a get path for adding videos to playlists on the site
app.get("/playlistvideo/add/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var playlistexists = await client.query(`SELECT EXISTS(SELECT id FROM playlists WHERE id=$1 AND user_id=$2 LIMIT 1)`, [req.params.playlistid, userinfo.id]);
	playlistexists = playlistexists.rows[0].exists;

	var playlistvideoexists = await client.query(`SELECT EXISTS(SELECT videoorder FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2 LIMIT 1)`, [req.params.playlistid, req.params.videoid]);
	playlistvideoexists = playlistvideoexists.rows[0].exists;

	var videoexists = await client.query(`SELECT EXISTS(SELECT id FROM videos WHERE id=$1 LIMIT 1)`, [req.params.videoid]);
	videoexists = videoexists.rows[0].exists;

	if (!playlistvideoexists && videoexists && playlistexists) { //if the playlist and video exists, and the video has not been added
		await client.query(`INSERT INTO playlistvideos (playlist_id, video_id) VALUES ($1, $2)`, [req.params.playlistid, req.params.videoid]);

		await client.query(`UPDATE playlists SET videocount=videocount+1 WHERE id=$1`, [req.params.playlistid]);

		var videoorder = await client.query(`SELECT videocount FROM playlists WHERE id=$1 LIMIT 1`, [req.params.playlistid]);
		videoorder = videoorder.rows[0].videocount;
		await client.query(`UPDATE playlistvideos SET videoorder=$1 WHERE video_id=$2 AND playlist_id=$3`, [videoorder, req.params.videoid, req.params.playlistid]);

		return res.redirect(`/p/${req.params.playlistid}`);
	} else if (!videoexists) { //if the video in question does not exist
		req.flash("message", "Video does not exist.");
		return res.redirect("/error");
	} else if (playlistvideoexists) { //if the video is already in the playlist
		req.flash("message", "Video has already been added to the playlist.");
		return res.redirect(`/playlistvideo/view/${req.params.playlistid}/${req.params.videoid}`);
	} else if (!playlistexists) { //if the playlist in question does not exist
		req.flash("message", "This playlist does not exist or does not belong to you.");
		return res.redirect("/error");
	}
});

//this is a get path for deleting videos from playlists on the site
app.get("/playlistvideo/delete/:playlistid/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var playlistexists = await client.query(`SELECT EXISTS(SELECT id FROM playlists WHERE id=$1 AND user_id=$2 LIMIT 1)`, [req.params.playlistid, userinfo.id]);
	playlistexists = playlistexists.rows[0].exists;

	var playlistvideoexists = await client.query(`SELECT EXISTS(SELECT videoorder FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2 LIMIT 1)`, [req.params.playlistid, req.params.videoid]);
	playlistvideoexists = playlistvideoexists.rows[0].exists;

	if (playlistvideoexists && playlistexists) {
		await client.query(`DELETE FROM playlistvideos WHERE playlist_id=$1 AND video_id=$2`, [req.params.playlistid, req.params.videoid]);
		await client.query(`UPDATE playlists SET videocount=videocount-1 WHERE id=$1`, [req.params.playlistid]);
		req.flash("message", "Video Deleted from Playlist!");
		return res.redirect(`/p/${req.params.playlistid}`);
	} else {
		req.flash("message", "Playlist does not exist, does not belong to you, or the video is not in the playlist");
		return res.redirect("/error");
	}
});

//this is a get request for creating a new playlist
app.get("/playlist/new", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	if (typeof req.query.videoid != 'undefined') {
		viewObj.videoid = req.query.videoid;
	}

	return res.render("createplaylist.ejs", viewObj);
});

//this is a get request for deleting a playlist
app.get("/playlist/delete/:playlistid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var result = await middleware.deletePlaylistDetails(userinfo.id, req.params.playlistid);

	if (result) {
		req.flash("message", "Playlist Deleted!");
		return res.redirect("/");
	} else {
		req.flash("message", `Playlist with ID: ${req.params.playlistid} cannot be deleted, is nonexistent, or does not belong to you.`);
		return res.redirect("/error");
	}
});

/*
POST PATHS FOR PLAYLISTS
*/

//this is a post link to create a new playlist
app.post("/playlist/create", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var newid = await middleware.generateAlphanumId();

	var exists = await client.query(`SELECT id FROM playlists WHERE user_id=$1 AND name=$2 LIMIT 1`, [userinfo.id, req.body.name]);

	if (exists.rows.length) {
		req.flash("message", "Playlist with the same name already exists.");
		return res.redirect(`/p/${exists.rows[0].id}`);
	} else {
		var valuesarr = [newid, req.body.name, userinfo.id, req.body.private];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		console.log(`${valuesarr}`);

		await client.query(`INSERT INTO playlists (id, name, user_id, private) VALUES (${valuesarr})`);

		if (typeof req.body.videoid != 'undefined') {
			await client.query(`INSERT INTO playlistvideos (playlist_id, video_id, videoorder) VALUES ($1, $2, $3)`, [newid, req.body.videoid, 1]);

			await client.query(`UPDATE playlists SET videocount=videocount+1 WHERE id=$1`, [newid]);
		}

		return res.redirect(`/p/${newid}`);
	}
});

