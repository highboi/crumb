//get the search bar element
var searchqueryinput = document.getElementById("searchquery");

//clear the search query value in order to prevent confusion.
//(if the user reloads the page with a query already typed in, then
//the webpage will not have any reccomendations to show to the user)
searchqueryinput.value = "";

//get the search reccomendation dropdown div
var searchDropdown = document.getElementById("searchrecs");

//create a timer variable for delaying the retrieval of search reccomendations
//until the user stops typing for a certain amount of time
var timer = 0;

//variables to check if the mouse is over the search reccomendations or over the search input
var mouseoverrecs = false;
var mouseoverquery = false;

//create a new xhttp object to make ajax requests
var xhttpSearch = new XMLHttpRequest();

//recieve a response from the server
xhttpSearch.onreadystatechange = function () {
	if (this.readyState == 4 && this.status == 200) {
		//get the reccomendation arrays and delete duplicates with a set
		recsArr = JSON.parse(this.responseText);
		recsArr = [...new Set(recsArr)];

		console.log("RECCOMENDATIONS:", recsArr);

		//clear out the reccomendations html and add the p tags that contain reccomendations
		searchDropdown.innerHTML = "";
		recsArr.forEach((item, index) => {
			if (item.includes(searchqueryinput.value)) {
				var components = item.split(searchqueryinput.value);
				var rectext = components[0] + searchqueryinput.value + components[1];
				var hreflink = `/search/?searchquery=${rectext.split(" ").join("+")}`;
				searchDropdown.innerHTML = searchDropdown.innerHTML + `<p><a href=\'${hreflink}\'>` + components[0] + "<strong>" + searchqueryinput.value + "</strong>" + components[1] + "</a></p>";
			} else {
				var rectext = searchqueryinput.value + " " + item;
				var hreflink = `/search/?searchquery=${rectext.split(" ").join("+")}`;
				searchDropdown.innerHTML = searchDropdown.innerHTML + `<p><a href=\'${hreflink}\'><strong>` + searchqueryinput.value + " </strong>" + item + "</a></p>";
			}
		});
	}
};

//a function to respond to the "keyup" event on the search bar
function keyupSearch() {
	//clear the previous timeout if it has not executed the get request
	clearTimeout(timer);

	//set the timer to have a new timeout function for getting the search reccomendations
	timer = setTimeout(getSearchRec, 500);
}

//function to make a get request for search reccomendations
function getSearchRec() {
	//check to see if the searchbar value is nothing
	if (searchqueryinput.value != "") {
		console.log("CHANGE IN SEARCH BAR.");

		var searchquery = searchqueryinput.value.split(" ").join("+");

		xhttpSearch.open("GET", `/getsearchrecs/?searchquery=${searchquery}`, true);
		xhttpSearch.send();

		searchDropdown.style.display = "block";
	} else {
		console.log("Search bar is empty.");
		searchDropdown.style.display = "none";
	}
}

//set an event so that if the user clicks/hovers over the dropdown, then reccomendations will not
//disappear. NOTE: use the "onmouseenter", which fires only once when entering the element, instead
//of the "onmouseover", which fires repeatedly as the user moves the mouse inside the element.
searchDropdown.onmouseenter = () => {
	mouseoverrecs = true;
};

//set an event that sets the "mouseoverrecs" value to false if the mouse leaves the search reccomendations
//NOTE: the "onmouseout" event checks an element's children, which is bad in this case, use "onmouseleave",
//which only checks if the mouse has left the parent element
searchDropdown.onmouseleave = () => {
	mouseoverrecs = false;
	if (!mouseoverquery) {
		searchDropdown.style.display = "none";
	}
}

//whenever the user clicks off of the search query input (aka they "blur" focus of the input),
//set the reccomendations to display nothing
searchqueryinput.onblur = () => {
	mouseoverquery = false;
	//make the reccomendations disappear only if the mouse is not clicking on/hovering over the
	//reccomendations to pick from
	if (!mouseoverrecs) {
		searchDropdown.style.display = "none";
	}
};

//whenever the user clicks ("focuses") on the search query input again (to change the search query),
//set the reccomendations to display themselves
searchqueryinput.onfocus = () => {
	mouseoverquery = true;
	searchDropdown.style.display = "block";
};
