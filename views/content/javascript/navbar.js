//get the container of the navbar, the navbar toggle button,
//the navbar content, and the main content to offset
var navbarcontainer = document.querySelector(".navbar");
var navbarbtn = document.querySelector(".navbar #navbar-icon");
var navbarcontent = document.querySelector(".navbar #navbar-content");
var maincontent = document.querySelector("main");

//hide the navbar if the user set it to be hidden
if (getCookie("navbarOn") == "false") {
	hideNavbar();
}

//function for showing the navbar with usual styling
function showNavbar() {
	navbarcontent.style.display = "flex";
	navbarcontainer.style.height = "100vh";
	maincontent.style.marginLeft = "120px";
}

//hide the navbar from the view of the user
function hideNavbar() {
	navbarcontent.style.display = "none";
	navbarcontainer.style.height = "0px";
	maincontent.style.marginLeft = "0px";
}

//toggle the navbar between its hidden and normal state (as well as changing the cookie value)
function toggleNavbar(disappear) {
	if (disappear) {
		hideNavbar();
		setCookie("navbarOn", "false");
	} else {
		showNavbar();
		setCookie("navbarOn", "true");
	}
}

//toggle the navbar based on the user's clicking of the navbar icon
navbarbtn.onclick = () => {
	var isHidden = (!(getCookie("navbarOn") == "false"));
	toggleNavbar(isHidden);
};
