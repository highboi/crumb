//This is a javascript file which pertains to adding functionality to the "videotext" EJS partial

/*
this is a function to implement the "read more" functionality on
lengthy video descriptions
*/
function readMore() {
	//get the dots which indicate a lengthy description
	var dots = document.querySelector(".description #dots");

	//get the other part of the lengthy description
	var moreText = document.querySelector(".description #more");

	//get the button which expands/shrinks the video description
	var btnText = document.querySelector(".description #readMoreBtn");

	/*
	change the display value of the dots, extra description text,
	and the "Read More" button label based on the display value
	of the extra description text
	*/
	if (moreText.style.display === "none") {
		dots.style.display = "none";
		btnText.innerHTML = "Read Less";
		moreText.style.display = "inline";
	} else {
		dots.style.display = "inline";
		btnText.innerHTML = "Read More";
		moreText.style.display = "none";
	}
}

