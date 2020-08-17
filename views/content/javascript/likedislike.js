//get a new xmlhttp request object
var xhttp = new XMLHttpRequest();

//get the amount of likes and dislikes from the video
var likeCount = document.getElementById("likes");
var dislikeCount = document.getElementById("dislikes");

//variables to store the comment likes and dislikes for specific ids
var commentLikes;
var commentDislikes;

//this is a function that makes a get request to the server so that the server can increase the amount of likes on the video in the database
//this function also changes the inner html of the element containing the number of likes and dislikes on the video
function getPath(path, likeElement, dislikeElement) {
	xhttp.onreadystatechange = function() {
		if (this.readyState == 4 && this.status == 200) { //if the response is an updated amount of likes
			//get the data from the response
			try {
				var data = JSON.parse(this.responseText);
			} catch(e) {
				console.log("Error JSON parse function.");
			}

			console.log(this.responseText);

			//check for what to do with the data
			if (Array.isArray(data) && data.length == 2) { //if the response is an array, then the amount of likes will be updated
				likeElement.innerHTML = data[0];
				dislikeElement.innerHTML = data[1];
			} else { // if the data is not an array, then it is the ejs file trying to render, so redirect to the login page
				window.location.href = "http://localhost/login";
			}
		}
	};
	xhttp.open("GET", path, true);
	xhttp.send();
}

//functions to like and dislike the video

function likeVideo() {
	//get the like url
	doLike(true, false, videovar.id);
}

function dislikeVideo() {
	//get the dislike url
	doDislike(true, false, videovar.id);
}

//functions for liking and disliking comments
function likeComment(commentid) {
	commentLikes = document.getElementById(commentid+"likes");
	commentDislikes = document.getElementById(commentid+"dislikes");
	doLike(false, true, commentid);
}

function dislikeComment(commentid) {
	commentLikes = document.getElementById(commentid+"likes");
	commentDislikes = document.getElementById(commentid+"dislikes");
	doDislike(false, true, commentid);
}

//functions to handle likes/dislikes on videos
function doLike(video, comment, id) {
	if (video) {
		var likepath = `/v/like/${id}`;
		getPath(likepath, likeCount, dislikeCount);
	} else if (comment) {
		var likepath = `/comment/like/${id}`;
		getPath(likepath, commentLikes, commentDislikes);
	}
}

function doDislike(video, comment, id) {
	if (video) {
		var dislikepath = `/v/dislike/${id}`;
		getPath(dislikepath, likeCount, dislikeCount);
	} else if (comment) {
		var dislikepath = `/comment/dislike/${id}`;
		getPath(dislikepath, commentLikes, commentDislikes);
	}
}
