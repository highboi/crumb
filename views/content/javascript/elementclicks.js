//this is a javascript file that helps with the management of clicking on site elements

//this is a javascript function to toggle the showing and disappearing of an element on the site
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

//this does the same as the above function but uses a flex display and a flex-direction of "column" so that the elements
//show vertically stacked, and this function pertains to the extra links on each video specifically
function showlinks(elementid, itemid=undefined) {
	//get the element to toggle
	var element = document.getElementById(elementid);

	//get the computed display property
	var display = window.getComputedStyle(element, null).getPropertyValue("display");

	//toggle the display of the element with the elementid
	if (display == "none") {
		//set the element's display values to be a vertically stacked box
		element.style.display = "flex";
		element.style.flexDirection = "column";
	} else {
		//set the element's display value to "none"
		element.style.display = "none";
		//if the "itemid" parameter is not undefined, then toggle the display value of the extra link forms
		if (typeof itemid != 'undefined') {
			//get all of the forms inside the extra link forms div
			var extralinkchildren = document.getElementById(itemid + "extralinkforms").childNodes;
			//loop through the children of the div
			extralinkchildren.forEach((item, index) => {
				if (typeof item.style != 'undefined') {
					//if the display of the extra links is being switched back to none, set this child
					item.style.display = "none";
				}
			});
		}
	}
}

//this is a javascript function to manage the extra links (i.e. add to playlist) on each video
//the item id is the id of the video/thumbnail containing the form and the form id is the name of the form to show
function showform(itemid, formid) {
	//get the container for all the extra link forms
	var container = document.getElementById(itemid + "extralinkforms");
	//get all of the children of the container
	var children = container.childNodes;
	//get the element to display
	var element = document.getElementById(itemid + formid);

	//get the display property of the form to manipulate
	var formdisplay = window.getComputedStyle(element, null).getPropertyValue("display");

	//set all of the other children's display value (except for the one being toggled) to "none"
	children.forEach((item, index) => {
		if (item.id != element.id && typeof item.id != 'undefined') {
			item.style.display = "none";
		}
	});

	//toggle the display value
	if (formdisplay == "none") {
		element.style.display = "block";
	} else {
		element.style.display = "none";
	}
}
