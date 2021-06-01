//this is a file to handle scrolling to a new comment the user has made

//check for the existence of a comment to scroll to
if (typeof scrollCommentId != 'undefined') {
	//try to get the comment reply element
	var commentElement = document.getElementById(scrollCommentId);

	//if the comment element is not defined in the document body, then request comments for the base parent until it shows up
	if (commentElement == null) {
		//get the replies for this comment
		getRecursiveReplies(scrollCommentBaseId, scrollCommentId);
	} else {
		//scroll to the comment element
		scrollToComment(scrollCommentId);
	}
}

//a function to recursively get the replies of a comment until we can scroll to a reply
function getRecursiveReplies(basecommentid, targetcommentid) {
	//get the comment replies using AJAX and handle the replies returned in the callback function
	getReplies(basecommentid, false, (replies) => {
		//filter the replies for the target comment reply
		var filteredreplies = replies.filter((item, index) => {
			return item.id == targetcommentid;
		});

		//if the filtered replies array has a reply with the target id
		if (filteredreplies.length > 0) {
			console.log("comment reply found, scrolling to the reply");
			scrollToComment(targetcommentid);
		} else { //if the target comment id was not found
			console.log("reply not found, calling function recursively");
			getRecursiveReplies(basecommentid, targetcommentid);
		}
	});
}

//a function for scrolling to a comment element with a certain comment id
function scrollToComment(commentid) {
	//get the comment element from the document body
	var commentElement = document.getElementById(commentid);

	//check for the existence of this comment element in order to return a status on the scrolling to this comment element
	if (commentElement == null) {
		console.log("THE COMMENT DOES NOT YET EXIST IN THE DOCUMENT");

		//return false, the element has not been shown to the user
		return false;
	} else {
		//scroll the comment into the view of the user
		commentElement.scrollIntoView(false);

		//change some CSS attributes about the comment to help it stand out to the user
		commentElement.style.backgroundColor = "#1a1a1a";
		commentElement.style.borderStyle = "solid";
		commentElement.style.borderWidth = "5px";
		commentElement.style.borderColor = "#adff12";

		console.log("THE COMMENT HAS BEEN SCROLLED TO");

		//return true, the comment element has been shown to the user
		return true;
	}
}
