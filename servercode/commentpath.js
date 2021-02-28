const {app, client, middleware} = require("./configBasic");
const formidable = require("formidable");
const path = require("path");

/*
GET PATHS FOR COMMENTS
*/

//a get request for liking a comment on the site
app.get("/comment/like/:commentid", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleLikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the likes and dislikes of the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});

//a get request for disliking a comment on the site
app.get("/comment/dislike/:commentid", middleware.checkSignedIn, async (req, res) => {
	//get the user
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	//the comment to edit
	var comment = await client.query(`SELECT * FROM comments WHERE id=$1`, [req.params.commentid]);
	comment = comment.rows[0];

	//select the liked comment from the database
	var likedComment = await client.query(`SELECT * FROM likedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//select the disliked comment from the database
	var dislikedComment = await client.query(`SELECT * FROM dislikedComments WHERE user_id=$1 AND comment_id=$2`, [userinfo.id, req.params.commentid]);

	//get the new amount of likes and dislikes
	var data = await middleware.handleDislikes(req, comment, likedComment, dislikedComment, "likedComments", "dislikedComments");

	//update the amount of likes and dislikes on the comment
	await client.query(`UPDATE comments SET likes=$1, dislikes=$2 WHERE id=$3`, [data[0], data[1], req.params.commentid]);

	//send the updated values
	res.send(data);
});


/*
POST PATHS FOR COMMENTS
*/

//post request for commenting on videos
app.post("/comment/:videoid", middleware.checkSignedIn, async (req, res) => {
	//create a formidable form object
	var form = new formidable.IncomingForm();

	//parse the form and the submitted files
	form.parse(req, async(err, fields, files) => {
		//get the user session info
		var userinfo = await middleware.getUserSession(req.cookies.sessionid);

		//get a generated comment id
		var commentid = await middleware.generateAlphanumId();

		//create a values array for the comment db entry
		var valuesarr = [commentid, userinfo.username, userinfo.id, fields.commenttext, req.params.videoid, new Date().toISOString(), 0, 0];

		//check for a parent comment id for comment thread functionality
		if (typeof req.query.parent_id != 'undefined') {
			//push the parent comment id into the values array
			valuesarr.push(req.query.parent_id);

			//get the parent depth level for this comment
			var parent_depth = await client.query(`SELECT depth_level FROM comments WHERE id=$1`, [req.query.parent_id]);
			parent_depth = parent_depth.rows[0].depth_level; //get the raw depth value
			valuesarr.push(parseInt(parent_depth)+1); //insert the depth value +1 into the values array

			//push the base parent/comment id (the original comment with depth level 0)
			valuesarr.push(fields.base_parent_id);

			//insert the values into the database
			await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, parent_id, depth_level, base_parent_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, valuesarr);
		} else {
			//push a depth level of 0 into the values array
			valuesarr.push(0);

			//insert the comment into the database
			await client.query(`INSERT INTO comments (id, username, user_id, comment, video_id, posttime, likes, dislikes, depth_level) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, valuesarr);
		}


		//check to see if there is a reaction video/image and save the file (if the file size is 0 then there was no file submitted)
		if (files.reactionfile.size > 0) {
			//get the accepted file types
			var acceptedvideo = [".mp4", ".ogg", ".webm"];
			var acceptedimg = [".png", ".jpeg", ".jpg"];

			console.log("REACTION FILE:", files.reactionfile);

			//get the file extension
			var fileext = path.extname(files.reactionfile.name);

			//check for the validity of the file being submitted
			if (acceptedvideo.includes(fileext) || acceptedimg.includes(fileext)) {
				//save the file and get the location relative to the site root
				var filepath = await middleware.saveFile(files.reactionfile, "/storage/users/comments/");

				//save the file path into the database
				await client.query(`INSERT INTO videofiles (id, video, parentid) VALUES ($1, $2, $3)`, [commentid, filepath, req.params.videoid]);

				//get the filetype for the submitted file
				if (acceptedvideo.includes(fileext)) {
					var filetype = "video";
				} else if (acceptedimg.includes(fileext)) {
					var filetype = "img";
				}

				//save the file type into the database
				await client.query(`UPDATE comments SET reactionfile=$1, filetype=$2 WHERE id=$3`, [filepath, filetype, commentid]);
			} else { //tell the user that the file that they tried to submit is not supported
				req.flash("message", "Unsupported file type, please try again.");
				res.redirect(`/v/${req.params.videoid}`);
			}
		}


		//redirect to the same view url (the back end will show an updated list of comments)
		//pass a query parameter to let the middleware for this path to know to scroll down to the new comment
		res.redirect(`/v/${req.params.videoid}/?scrollToComment=true&commentid=${commentid}`);
	});
});
