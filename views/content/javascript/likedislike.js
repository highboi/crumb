//get a new xmlhttp request object
var xhttp = new XMLHttpRequest();

//get the amount of likes and dislikes from the video
var likeCount = document.getElementById("likes");
var dislikeCount = document.getElementById("dislikes");

//this is a function that makes a get request to the server so that the server can increase the amount of likes on the video in the database
//this function also changes the inner html of the element containing the number of likes and dislikes on the video
function getPath(path) {
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
				likeCount.innerHTML = data[0];
				dislikeCount.innerHTML = data[1];
			} else { // if the data is not an array, then it is the ejs file trying to render, so redirect to the login page
				window.location.href = "http://localhost/login";
				console.log(this.responseText);
			}
		}
	};
	xhttp.open("GET", path, true);
	xhttp.send();
}

/*
functions to like and dislike the video
*/

function likeVideo() {
	//get the like url
	doLike();
}

function dislikeVideo() {
	//get the dislike url
	doDislike();
}

//functions to handle likes/dislikes on videos
function doLike() {
	var likepath = `/like/${videovar.id}`;
	getPath(likepath);
}

function doDislike() {
	var dislikepath = `/dislike/${videovar.id}`;
	getPath(dislikepath);
}
