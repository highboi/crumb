//this is a javascript file that helps with the replys to comments

var xhttp = new XMLHttpRequest();

function showbox(elementid) {
	var element = document.getElementById(elementid);

	console.log(elementid);

	var display = window.getComputedStyle(element, null).getPropertyValue("display");

	if (display == "none") {
		element.style.display = "block";
	} else {
		element.style.display = "none";
	}
}
