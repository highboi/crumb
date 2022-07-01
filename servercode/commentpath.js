const {app, client, middleware} = require("./configBasic");
const path = require("path");

/*
GET PATHS FOR COMMENTS
*/

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

//a get request for deleting a comment on the site
app.get("/comment/delete/:commentid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var comment = await client.query(`SELECT depth_level, user_id, video_id FROM comments WHERE id=$1 LIMIT 1`, [req.params.commentid]);
	comment = comment.rows[0];

	if (comment.user_id == userinfo.id) {
		await client.query("DELETE FROM comments WHERE id=$1", [req.params.commentid]);

		req.flash("message", "Comment deleted successfully.");
		return res.redirect(`/v/${comment.video_id}`);
	} else {
		req.flash("message", "This is not your comment to delete.");
		req.flash("redirecturl", "/");
		return res.redirect("/error");
	}
});


/*
POST PATHS FOR COMMENTS
*/

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var commentid = await middleware.generateAlphanumId();

	var valuesarr = [commentid, userinfo.username, userinfo.id, req.body.commenttext, req.params.videoid, new Date().toISOString(), 0, 0];

	//check to see if this is a reply to another comment
	if (typeof req.query.parent_id != 'undefined') {
		valuesarr.push(req.query.parent_id);

		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, parent_id) VALUES (${valuesarr})`);

		//add this reply id to the parent comment of this reply
		await client.query(`UPDATE comments SET replies=concat(replies, $1::text) WHERE id=$2`, [commentid+",", req.query.parent_id]);
	} else {
		valuesarr = valuesarr.map((item) => {
			if (typeof item == "string") {
				return "\'" + item + "\'";
			} else {
				return item;
			}
		});

		await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes) VALUES (${valuesarr})`);
	}

	//check for and handle files attached to the comment
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
