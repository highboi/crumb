//This is a javascript file which pertains to adding functionality to the "videotext" EJS partial

//this is a function which allows dynamic functionality for the description of the video being watched
function readMore() {
	var dots = document.getElementById("dots");
	var moreText = document.getElementById("more");
	var btnText = document.getElementById("readMoreBtn");

	if (dots.style.display === "none") {
		dots.style.display = "inline";
		btnText.innerHTML = "Read More";
		moreText.style.display = "none";
	} else {
		dots.style.display = "none";
		btnText.innerHTML = "Read Less";
		moreText.style.display = "inline";
	}
}

