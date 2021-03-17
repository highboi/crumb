//this is a javascript file that helps with the management of clicking on site elements

//this does the same as the above function but uses a flex display and a flex-direction of "column" so that the elements
//show vertically stacked, and this function pertains to the extra links on each video specifically
function showelement(elementid) {
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
	}
}
