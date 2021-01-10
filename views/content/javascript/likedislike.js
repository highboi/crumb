//get the amount of likes and dislikes from the video
var likeCount = document.getElementById("likes");
var dislikeCount = document.getElementById("dislikes");

//variables to store the comment likes and dislikes for specific ids
var commentLikes;
var commentDislikes;

//change the element likes and dislikes on the html and in the server
function changeElementLikes(link, likeElement, dislikeElement) {
	getAjaxData(link, (response) => {
		likeElement.innerHTML = response[0];
		dislikeElement.innerHTML = response[1];
	});
}

//like a video
function likeVideo(videoid) {
	changeElementLikes(`/v/like/${videoid}`, likeCount, dislikeCount);
}

//dislike a video
function dislikeVideo(videoid) {
	changeElementLikes(`/v/dislike/${videoid}`, likeCount, dislikeCount);
}

//like a comment
function likeComment(commentid) {
	commentLikes = document.getElementById(commentid+"likes");
	commentDislikes = document.getElementById(commentid+"dislikes");

	changeElementLikes(`/comment/like/${commentid}`, commentLikes, commentDislikes);
}

//dislike a comment
function dislikeComment(commentid) {
	commentLikes = document.getElementById(commentid+"likes");
	commentDislikes = document.getElementById(commentid+"dislikes");

	changeElementLikes(`/comment/dislike/${commentid}`, commentLikes, commentDislikes);
}
