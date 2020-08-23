//this is a javascript file to manage the extra links (i.e. add to playlist) on each video

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
