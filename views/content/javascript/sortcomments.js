function sortComments(commentSort) {
	var parentComments = document.querySelectorAll(".comment");
	parentComments = Array.from(parentComments);

	//sort the comments based on the new value
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
				return parseInt(b.getAttribute("posttime").replaceAll("-", ""), 10) - parseInt(a.getAttribute("posttime").replaceAll("-", ""), 10);
			});
			break;
		//sort the comments in descending order based on the post date timestamp
		case "oldest":
			parentComments.sort((a, b) => {
				return parseInt(a.getAttribute("posttime").replaceAll("-", ""), 10) - parseInt(b.getAttribute("posttime").replaceAll("-", ""), 10);
			});
			break;
	}

	if (typeof parentComments != undefined) {
		var commentsSection = document.getElementById("theComments");

		commentsSection.innerHTML = getCommentHtml(parentComments);
	}
}


function getCommentHtml(comms) {
	var newstring = "";
	//NOTE: use the .outerHTML attribute to get the entire html instead of the insides of the element
	comms.forEach((item, index) => {
		newstring += "<hr>" + item.outerHTML + "<hr>";
	});
	return newstring;
}

//check to see if the comments are sorted in the right way whenever the page reloads,
//basically, the comments are sent to the user in the "top" order, so if the "top" formation
//is not selected, then rearrange the comments in the other formation that is selected
var commentSortSelector = document.getElementById("commentSort");
if (commentSortSelector.value != "top") {
	sortComments(commentSortSelector);
}
