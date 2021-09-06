//change the element likes and dislikes on the html and in the server
async function changeElementLikes(link, likeElement, dislikeElement) {
	var response = await fetch(link);
	var data = await response.json();

	likeElement.innerHTML = data[0];
	dislikeElement.innerHTML = data[1];

	return data;
}

//like a video
async function likeVideo(videoid) {
	var videoLikes = document.getElementById(`${videoid}likes`);
	var videoDislikes = document.getElementById(`${videoid}dislikes`);

	changeElementLikes(`/v/like/${videoid}`, videoLikes, videoDislikes);
}

//dislike a video
async function dislikeVideo(videoid) {
	var videoLikes = document.getElementById(`${videoid}likes`);
	var videoDislikes = document.getElementById(`${videoid}dislikes`);

	changeElementLikes(`/v/dislike/${videoid}`, videoLikes, videoDislikes);
}

//like a comment
async function likeComment(commentid) {
	var commentLikes = document.getElementById(`${commentid}likes`);
	var commentDislikes = document.getElementById(`${commentid}dislikes`);

	var data = await changeElementLikes(`/comment/like/${commentid}`, commentLikes, commentDislikes);

	document.getElementById(commentid).setAttribute("likes", data[0]);
	document.getElementById(commentid).setAttribute("dislikes", data[1]);
}

//dislike a comment
async function dislikeComment(commentid) {
	var commentLikes = document.getElementById(`${commentid}likes`);
	var commentDislikes = document.getElementById(`${commentid}dislikes`);

	var data = await changeElementLikes(`/comment/dislike/${commentid}`, commentLikes, commentDislikes);

	document.getElementById(commentid).setAttribute("likes", data[0]);
	document.getElementById(commentid).setAttribute("dislikes", data[1]);
}
