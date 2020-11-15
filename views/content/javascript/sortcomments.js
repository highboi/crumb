function sortComments(commentSort) {
	//only sort the parent comments (comments that aren't replies)
	var parentComments = comments.filter((comm) => {
		return comm.parent_id == undefined;
	});

	//sort the comments based on the new value
	switch(commentSort.value) {
		//sort the comments in descending order by amount of likes
		case "top":
			parentComments.sort((a, b) => {
				return b.likes - a.likes;
			});
			console.log("top");
			break;
		//sort the comments in descending order by amount of dislikes
		case "bottom":
			parentComments.sort((a, b) => {
				return b.dislikes - a.dislikes;
			});
			console.log("bottom");
			break;
		//sort the comments in ascending order based on the post date timestamp
		case "newest":
			parentComments.sort((a, b) => {
				return b.posttime.replaceAll("-", "") - a.posttime.replaceAll("-", "");
			});
			console.log("NEWEST COMMENTS: ", parentComments);
			console.log("newest");
			break;
		//sort the comments in descending order based on the post date timestamp
		case "oldest":
			parentComments.sort((a, b) => {
				return a.posttime.replaceAll("-", "") - b.posttime.replaceAll("-", "");
			});
			console.log("oldest");
			break;
	}

	if (typeof parentComments != undefined) {
		var commentsSection = document.getElementById("theComments");

		console.log(parentComments);

		commentsSection.innerHTML = getCommentHtml(parentComments);
	}
}


function getCommentHtml(comms) {
	var newstring = "";
	comms.forEach((item, index) => {
		if (item.parent_id == null) {
			var commentlink = `/comment/${videovar.id}`;
			var replies = comments.filter((obj) => obj.parent_id == item.id);
			newstring += `<hr>
			<div id="${item.id}">
				<h3>&nbsp${item.username}</h3>
				<p>&nbsp;&nbsp${item.comment}</p>
				<div class="commentlikes" id="${item.id}">
					&nbsp
					<button id="commentLike" onclick="likeComment('${item.id}')"><img src="/content/icons/like.ico"></button>
					<p id="${item.id}likes">${item.likes}</p>
					<button id="commentDislike" onclick="dislikeComment('${item.id}')"><img src="/content/icons/dislike.ico"></button>
					<p id="${item.id}dislikes">${item.dislikes}</p>
					<button id="replybtn" onclick='showbox(&quot;${item.id}replybox&quot;)'>Reply</button>
					<button id="showreplies" onclick='showbox(&quot;${item.id}replies&quot;)'>Replies</button>
				</div>
				<div class="replybox" id="${item.id}replybox">`;
			var replylink = commentlink + `?parent_id=${item.id}`;
			newstring += `<form action="${replylink}" method="post">
					<textarea id="commenttext" name="commenttext" placeholder="Comment Something" maxlength="1000" rows="10" cols="50"></textarea><br>
					<button id="commentbtn" type="submit" value="Submit">Post Comment</button>
					<input type="button" onclick='showbox(&quot;${item.id}replybox&quot;)' value="Cancel">
				</form>
			</div>
			<div class="replies" id="replies">`;

			replies.forEach((item, index) => {
				newstring += `<h3>&nbsp;&nbsp${item.username}</h3>
				<p>&nbsp;&nbsp;&nbsp${item.comment}</p>
				<div class="commentlikes" id="${item.id}">
					&nbsp;&nbsp
					<button id="commentLike" onclick="likeComment('${item.id}')"><img src="/content/icons/like.ico"></button>
					<p id="${item.id}likes">${item.likes}</p>
					<button id="commentDislike" onclick="dislikeComment('${item.id}')"><img src="/content/icons/dislike.ico"></button>
					<p id="${item.id}dislikes">${item.dislikes}</p>
				</div>`;
			});
			newstring += `</div>
			</div>
			<hr>`;
		}
	});
	console.log("CHANGE");
	return newstring;
}

//check to see if the comments are sorted in the right way whenever the page reloads,
//basically, the comments are sent to the user in the "top" order, so if the "top" formation
//is not selected, then rearrange the comments in the other formation that is selected
var commentSortSelector = document.getElementById("commentSort");
if (commentSortSelector.value != "top") {
	sortComments(commentSortSelector);
}
