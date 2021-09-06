const {app, client, middleware} = require("./configBasic");
const path = require("path");

/*
GET PATHS FOR COMMENTS
*/

//a get path for getting the replies for a comment with AJAX
app.get("/comment/replies/:commentid", async (req, res) => {
	if (typeof req.query.limit == 'undefined') {
		var replies = await client.query(`SELECT * FROM comments WHERE base_parent_id=$1 ORDER BY posttime LIMIT 50`, [req.params.commentid]);
	} else {
		var replies = await client.query(`SELECT * FROM (SELECT ROW_NUMBER() OVER (ORDER BY (SELECT '1')) AS rownum, * FROM comments WHERE base_parent_id=$1) AS comments WHERE rownum>$2 ORDER BY posttime LIMIT 50`, [req.params.commentid, req.query.limit]);
	}

	return res.send({replies: replies.rows});
});

//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var data = await middleware.likeComment(userinfo.id, req.params.commentid);

	return res.send(data);
});

//a get request for disliking a comment on the site
app.get("/comment/dislike/:commentid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var data = await middleware.dislikeComment(userinfo.id, req.params.commentid);

	return res.send(data);
});


/*
POST PATHS FOR COMMENTS
*/

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var commentid = await middleware.generateAlphanumId();

	var valuesarr = [commentid, userinfo.username, userinfo.id, req.body.commenttext, req.params.videoid, new Date().toISOString(), 0, 0];

	if (typeof req.query.parent_id != 'undefined') {
		valuesarr.push(req.query.parent_id);

		var depth_level = await client.query(`SELECT depth_level FROM comments WHERE id=$1 LIMIT 1`, [req.query.parent_id]);
		depth_level = parseInt(depth_level.rows[0].depth_level, 10)+1;
		valuesarr.push(depth_level);

		valuesarr.push(req.body.base_parent_id);

		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, parent_id, depth_level, base_parent_id) VALUES (${valuesarr})`);
	} else {
		valuesarr.push(0);

		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, depth_level) VALUES (${valuesarr})`);
	}

	if (typeof req.files.reactionfile != "undefined") {
		var acceptedvideo = ["video/mp4", "video/ogg", "video/webm"];
		var acceptedimg = ["image/png", "image/jpeg", "image/jpg"];

		var mimetype = req.files.reactionfile.mimetype;

		if (acceptedvideo.includes(mimetype) || acceptedimg.includes(mimetype)) {
			var filepath = await middleware.saveFile(req.files.reactionfile, "/storage/users/comments/");

			await client.query(`INSERT INTO videofiles (id, video, parentid) VALUES ($1, $2, $3)`, [commentid, filepath, req.params.videoid]);

			if (acceptedvideo.includes(mimetype)) {
				var filetype = "video";
			} else if (acceptedimg.includes(mimetype)) {
				var filetype = "img";
			}

			await client.query(`UPDATE comments SET reactionfile=$1, filetype=$2 WHERE id=$3`, [filepath, filetype, commentid]);
		} else {
			req.flash("message", "Unsupported file type, please use mp4, ogg, webm, png, jpeg, or jpg files.");
			req.flash("redirecturl", `/v/${req.params.videoid}`);
			return res.redirect("/error");
		}
	}

	return res.redirect(`/v/${req.params.videoid}/?scrollcommentid=${commentid}`);
});
