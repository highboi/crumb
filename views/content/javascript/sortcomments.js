//function to sort the comments section based on the type of sorting to do
function sortComments(commentSort) {
	//get all of the comment elements
	var parentComments = Array.from(document.querySelectorAll(".comment"));

	//sort the comments based on the new sorting value
	switch(commentSort.value) {
		//sort the comments in descending order by amount of likes
		case "top":
			parentComments.sort((a, b) => {
				return parseInt(b.getAttribute("likes"), 10) - parseInt(a.getAttribute("likes"), 10);
			});
			break;
		//sort the comments in descending order by amount of dislikes
		case "bottom":
			parentComments.sort((a, b) => {
				return parseInt(b.getAttribute("dislikes"), 10) - parseInt(a.getAttribute("dislikes"), 10);
			});
			break;
		//sort the comments in ascending order based on the post date timestamp
		case "newest":
			parentComments.sort((a, b) => {
				//replace non-numerical characters in each timestamp
				var timestamp_a = parseInt(a.getAttribute("posttime").replace(/\D/g, ""), 10);
				var timestamp_b = parseInt(b.getAttribute("posttime").replace(/\D/g, ""), 10);

				return timestamp_b - timestamp_a;
			});
			break;
		//sort the comments in descending order based on the post date timestamp
		case "oldest":
			parentComments.sort((a, b) => {
				var timestamp_a = parseInt(a.getAttribute("posttime").replace(/\D/g, ""), 10);
				var timestamp_b = parseInt(b.getAttribute("posttime").replace(/\D/g, ""), 10);

				return timestamp_a - timestamp_b;
			});
			break;
	}

	//render the new comment HTML to the comment section
	var commentsSection = document.getElementById("theComments");
	commentsSection.innerHTML = getCommentHtml(parentComments);
}

//a function to get new comment HTML based on an array of comment elements
function getCommentHtml(comms) {
	var newstring = "";

	//get the outer HTML of each comment element and add it to the string variable
	comms.forEach((item, index) => {
		newstring += "<hr>" + item.outerHTML + "<hr>";
	});

	return newstring;
}
