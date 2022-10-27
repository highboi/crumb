const {app, server, client, middleware, chatWss, obsWss, liveWss, nms} = require("./configBasic");
const fs = require("fs");
const WebSocket = require("ws");
const url = require("url");
const cookie = require("cookie");

/*
WEBSOCKET SERVER HANDLING
*/

require("./livesockets");

/*
GET PATHS FOR LIVE MEDIA
*/

//get path for viewing a stream
app.get("/l/view/:streamid", async (req, res) => {
	var stream = global.webWssClients[req.params.streamid];

	var viewObj = await middleware.getViewObj(req, res);

	var video = await client.query(`SELECT * FROM videos WHERE id=$1 LIMIT 1`, [req.params.streamid]);
	video = video.rows[0];

	if (typeof viewObj.user != "undefined" && viewObj.user.id == video.user_id) {
		if (video.streaming) {
			return res.redirect(`/l/admin/${req.params.streamid}/?streamtype=${video.streamtype}`);
		}
	}

	if (typeof stream == 'undefined') {
		if (typeof video == 'undefined') {
			req.flash("message", `Stream with ID: '${req.params.streamid}' does not exist.`);
			return res.redirect("/error");
		} else if (!video.streaming) {
			return res.redirect(`/v/${req.params.streamid}`);
		} else {
			var videoinfo = await middleware.getVideoInfo(video);

			var streamkey = await client.query(`SELECT streamkey FROM users WHERE id=$1 LIMIT 1`, [video.user_id]);
			streamkey = streamkey.rows[0].streamkey;

			var reccomendations = await middleware.getReccomendations(req, video);

			viewObj = Object.assign({}, viewObj, {stream: video, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, reccomendations: reccomendations}, videoinfo);

			return res.render("viewStreamObs.ejs", viewObj);
		}
	} else {
		var videoinfo = await middleware.getVideoInfo(video);

		var reccomendations = await middleware.getReccomendations(req, video);

		viewObj = Object.assign({}, viewObj, {stream: video, reccomendations: reccomendations}, videoinfo);

		return res.render("viewStreamWeb.ejs", viewObj);
	}
});

//this is a get request to get basic info about a live stream
app.get("/l/start/:streamtype", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);
	viewObj.streamtype = req.params.streamtype;

	return res.render("startstream.ejs", viewObj);
});

//this is a get request for the admin panel of a live stream
app.get("/l/admin/:streamid", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var stream = await client.query(`SELECT * FROM videos WHERE id=$1 AND user_id=$2 LIMIT 1`, [req.params.streamid, viewObj.user.id]);
	stream = stream.rows[0];

	if (typeof stream != 'undefined') {
		viewObj = Object.assign({}, viewObj, {streamname: stream.title, enableChat: stream.enablechat, streamid: stream.id});

		if (req.query.streamtype == "obs") {
			var streamkey = viewObj.user.streamkey;

			viewObj = Object.assign({}, viewObj, {videocreator: viewObj.user, stream: stream, streamURL: `http://localhost:8000/live/${streamkey}/index.m3u8`, rtmpServer: "rtmp://localhost/live", streamKey: streamkey});

			return res.render("obsAdminPanel.ejs", viewObj);
		} else if (req.query.streamtype == "browser") {
			viewObj = Object.assign({}, viewObj, {stream: stream, videocreator: viewObj.user});

			return res.render("webAdminPanel.ejs", viewObj);
		}
	} else {
		req.flash("message", "There is no stream in your roster yet, please start one.");
		return res.redirect("/l/start");
	}
});

/*
POST PATHS FOR LIVE MEDIA
*/

//this is the post link for starting a new stream on the site
app.post("/l/stream/:type", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var streamid = await middleware.generateAlphanumId();
	var streamtype = req.params.type;

	if (streamtype == "browser") {
		var thumbnailpath = await middleware.saveFile(req.files.liveThumbnail, "/storage/videos/thumbnails/");

		var valuesarr = [streamid, req.body.name, req.body.description, thumbnailpath, userinfo.id, 0, new Date().toISOString(), req.body.topics, userinfo.username, userinfo.channelicon, true, req.params.type, req.body.enableChat];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		console.log(`${valuesarr}`);

		await client.query(`INSERT INTO videos (id, title, description, thumbnail, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES (${valuesarr})`);
		await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
	} else if (streamtype == "obs") {
		var thumbnailpath = await middleware.saveFile(req.files.liveThumbnail, "/storage/videos/thumbnails/");

		var valuesarr = [streamid, req.body.name, req.body.description, thumbnailpath, userinfo.id, 0, new Date().toISOString(), req.body.topics, userinfo.username, userinfo.channelicon, 'true', req.params.type, req.body.enableChat.toString()];
		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO videos (id, title, description, thumbnail, user_id, views, posttime, topics, username, channelicon, streaming, streamtype, enablechat) VALUES (${valuesarr})`);
		await client.query(`INSERT INTO videofiles (id, thumbnail) VALUES ($1, $2)`, [streamid, thumbnailpath]);
	}

	return res.redirect(`/l/admin/${streamid}?streamtype=${streamtype}`);
});

/*
NODE-MEDIA-SERVER RTMP OBS STREAM HANDLING
*/

//check for invalid stream keys and store details of live streams if keys are valid
nms.on("postPublish", async (id, streamPath, args) => {
	var session = nms.getSession(id);

	var givenKey = streamPath.replace("/live/", "");

	var res = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [givenKey]);
	res = res.rows;

	if (!res.length) {
		session.reject();
	} else {
		var user = res[0];

		var streamid = await client.query(`SELECT id FROM videos WHERE user_id=$1 AND streamtype=$2 AND video IS NULL LIMIT 1`, [user.id, "obs"]);

		if (streamid.rows.length) {
			streamid = streamid.rows[0].id;
			session.wasPublished = true;

			session.streamid = streamid;

			if (typeof global.obsWssClients[streamid] != 'undefined') {
				var viewers = global.obsWssClients[streamid].filter((socket) => {
					return socket.readyState == WebSocket.OPEN;
				});
			}

			viewers.forEach((item, index) => {
				item.send("started");
			});
		} else {
			session.wasPublished = false;
		}
	}
});

//rename/move the recorded streams elsewhere for convenience and save the path to the DB
nms.on("donePublish", async (id, streamPath, args) => {
	var session = nms.getSession(id);

	console.log(session);

	var filename = middleware.getObsName(session.startTimestamp);

	var streamkey = streamPath.replace("/live/", "");

	if (session.wasPublished) {
		var user = await client.query(`SELECT id FROM users WHERE streamkey=$1 LIMIT 1`, [streamkey]);
		userid = user.rows[0].id;

		var path = `/videos/nmsMedia/live/${streamkey}/${filename}.mp4`;

		await client.query(`UPDATE videos SET video=$1 WHERE id=$2 AND user_id=$3`, [path, session.streamid, userid]);
		await client.query(`UPDATE videofiles SET video=$1 WHERE id=$2`, [path, session.streamid]);
		await client.query(`UPDATE videos SET streaming=$1 WHERE id=$2`, [false, session.streamid]);
		await client.query(`UPDATE users SET videocount=videocount+1 WHERE id=$1`, [userid]);

		var viewers = global.obsWssClients[session.streamid].filter((socket) => {
			return socket.readyState == WebSocket.OPEN;
		});

		viewers.forEach((item, index) => {
			item.send("ended");
		});
	} else {
		fs.unlink(`${global.appRoot}/storage/videos/nmsMedia/live/${streamkey}/${filename}.mp4`, (err) => {
			if (err) throw err;
		});

		var videoid = await client.query(`SELECT id FROM videos WHERE user_id IN (SELECT id FROM users WHERE streamkey=$1) AND streamtype=$2 AND video IS NULL LIMIT 1`, [streamkey, "obs"]);
		videoid = videoid.rows[0].id;

		var thumbnail = await client.query(`SELECT thumbnail FROM videos WHERE id=$1 LIMIT 1`, [videoid]);
		thumbnail = thumbnail.rows[0].thumbnail;

		fs.unlink(`${global.appRoot}/storage${thumbnail}`, (err) => {
			if (err) throw err;
		});

		await client.query(`DELETE FROM videos WHERE id=$1`, [videoid]);
		await client.query(`DELETE FROM videofiles WHERE id=$1`, [videoid]);

		session.reject();
	}
});
