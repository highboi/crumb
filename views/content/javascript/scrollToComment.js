//this is a file to handle scrolling to a new comment the user has made

//check for the existence of a comment to scroll to
if (typeof scrollCommentId != 'undefined') {
	//try to get the comment reply element
	var commentElement = document.getElementById(scrollCommentId);

	//scroll to the comment element directly
	scrollToComment(scrollCommentId);
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
		commentElement.scrollIntoView();

		console.log("THE COMMENT HAS BEEN SCROLLED TO");

		//return true, the comment element has been shown to the user
		return true;
	}
}
