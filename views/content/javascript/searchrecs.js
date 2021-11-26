/*
BASIC VARIABLES
*/

//get the search bar element
var searchqueryinput = document.getElementById("searchquery");

//clear the search query value
searchqueryinput.value = "";

//get the search reccomendation dropdown div
var searchDropdown = document.getElementById("searchrecs");

/*
create a timer variable for delaying the retrieval of search reccomendations
until the user stops typing for a certain amount of time
*/
var timer = 0;

//variables to check if the mouse is over the search reccomendations or over the search input
var mouseoverrecs = false;
var mouseoverquery = false;

//a variable to store the current reccomendation that the user is highlighting with their arrows
var highlightedrec;

/*
BASIC FUNCTIONS FOR GETTING THE SEARCH RECCOMENDATIONS FROM THE SERVER
*/

//a function to respond to the "keyup" event on the search bar
function keyupSearch() {
	//clear the previous timeout if it has not executed the get request
	clearTimeout(timer);

	//set the timer to have a new timeout function for getting the search reccomendations
	timer = setTimeout(getSearchRec, 500);
}

//get the actual data for the search reccomendations
async function getSearchRec() {
	//check to see if the searchbar value is nothing
	if (searchqueryinput.value) {
		var searchquery = searchqueryinput.value.trim().split(" ").join("+");

		var response = await fetch(`/getsearchrecs/?searchquery=${searchquery}`);
		var recs = await response.json();

		showReccomendations(recs);

		searchDropdown.style.display = "block";
	} else {
		searchDropdown.innerHTML = "";
		searchDropdown.style.display = "none";
	}
}

//a function to display the reccomendations in the search div
function showReccomendations(recs) {
	//get the reccomendation arrays and delete duplicates with a set
	recsArr = [...new Set(recs)];

	//clear out the reccomendations html and add the p tags that contain reccomendations
	searchDropdown.innerHTML = "";

	//loop through the search reccomendation values
	recsArr.forEach((item, index) => {
		//get the search query input value
		var query = searchqueryinput.value.toLowerCase().trim();

		//only show a reccomendation if it includes the search query as a part of it
		if (item.includes(query)) {
			//get the components of the search reccomendation
			var components = item.toLowerCase();

			//form the highlighted part of the search reccomendation
			var highlighted = document.createElement("strong");
			highlighted.innerHTML = searchqueryinput.value;

			//create the anchor tag which will house all of the text
			var anchor = document.createElement("a");

			//make a valid link to a search and set this as the "href" value for the anchor
			var hreflink = `/search/?searchquery=${item.split(" ").join("+")}`;
			anchor.setAttribute("href", hreflink);

			//form the inner text of the anchor tag with both components and the highlighted element
			anchor.innerHTML = components.replace(searchqueryinput.value, highlighted.outerHTML);

			//create the final "p" tag element that will house the anchor tag
			var finalelement = document.createElement("p");

			//add the anchor html into the p tag inner html
			finalelement.innerHTML = anchor.outerHTML;

			//add this element to the child nodes of the search dropdown selection
			searchDropdown.appendChild(finalelement);
		}
	});
}


/*
PROGRAM EVENTS TO RESPOND TO KEYS AND MOUSE FOR STYLING
*/

//if the users mouse moves over the search reccomendation dropdown
searchDropdown.onmouseenter = () => {
	mouseoverrecs = true;
};

//if the users mouse moves away from the search dropdown
searchDropdown.onmouseleave = () => {
	mouseoverrecs = false;
	if (!mouseoverquery) {
		searchDropdown.style.display = "none";
	}
};

//if the focus of the user is moved away from the search query input
searchqueryinput.onblur = () => {
	mouseoverquery = false;
	if (!mouseoverrecs) {
		searchDropdown.style.display = "none";
	}
};

//if the user focuses on the search query input
searchqueryinput.onfocus = () => {
	mouseoverquery = true;
	searchDropdown.style.display = "block";
};

/*
PROGRAM FUNCTIONALITY FOR ARROW KEYS IN SELECTING RECCOMENDATIONS
*/

//monitor for arrow keys in order to highlight search reccomendations
searchqueryinput.onkeydown = (event) => {
	switch (event.key) {
		case "ArrowUp":
			//get all of the individual reccomendation elements
			var children = searchDropdown.childNodes;

			//check for the existence of a highlighted reccomendation element
			if (typeof highlightedrec == 'undefined') {
				//make the highlighted element contain the index and text of the last reccomendation
				highlightedrec = {index: children.length-1, text: children[children.length-1].innerText }
			} else {
				if (highlightedrec.index-1 < 0) {
					var nextindex = children.length-1;
				} else {
					var nextindex = highlightedrec.index-1;
				}

				//redefine the new highlighted reccomendation based on the next index
				highlightedrec = {index: nextindex, text: children[nextindex].innerText}
			}

			//change the background color of this element to a slightly darker color
			children[highlightedrec.index].style.backgroundColor = "#adde12";

			//change the background color of the other reccomendations to their original color
			for (var child of children) {
				if (child.innerText != highlightedrec.text) {
					child.style.backgroundColor = "";
				}
			}

			//change the search query input
			searchqueryinput.value = highlightedrec.text;

			break;
		case "ArrowDown":
			//get the children of the search dropdown
			var children = searchDropdown.childNodes;

			//check for the existence of a highlighted reccomendation element
			if (typeof highlightedrec == 'undefined') {
				//make the highlighted element contain the index and text of the first reccomendation
				highlightedrec = {index: 0, text: children[0].innerText};
			} else {
				/*
				get the index of the next reccomendation and mod it with
				the search reccomendations array length (this creates a
				looping effect)
				*/
				var nextindex = (highlightedrec.index+1)%children.length;

				//redefine the highlighted element reccomendation
				highlightedrec = {index: nextindex, text: children[nextindex].innerText};
			}

			//change the background color of this element to a slightly darker color
			children[highlightedrec.index].style.backgroundColor = "#adde12";

			//change the background color of the other reccomendations to their original color
			for (var child of children) {
				if (child.innerText != highlightedrec.text) {
					child.style.backgroundColor = "";
				}
			}

			//change the search query input
			searchqueryinput.value = highlightedrec.text;

			break;
	}
};
