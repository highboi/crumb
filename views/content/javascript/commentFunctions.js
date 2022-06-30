//a function to highlight a comment with a color
function highlightComment(commentid, color) {
	document.getElementById(commentid).style.backgroundColor = color;
}

//a function to scroll to a comment
function scrollToComment(commentid) {
	document.getElementById(commentid).scrollIntoView(true);
}

//add event listeners to all comment interlinks
Array.from(document.getElementsByClassName("commentinterlink")).forEach((item, index) => {
	item.addEventListener("mouseover", () => {
		highlightComment(item.getAttribute("parentid"), "#3f3f3f");
	});

	item.addEventListener("mouseout", () => {
		highlightComment(item.getAttribute("parentid"), "");
	});

	item.addEventListener("click", () => {
		scrollToComment(item.getAttribute("parentid"));
	});
});

