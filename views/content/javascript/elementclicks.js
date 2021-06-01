//this is a javascript file that helps with the management of clicking on site elements

//this is a function to toggle the display value of an element
function showelement(elementid) {
	//get the element to toggle
	var element = document.getElementById(elementid);

	//get the computed display property
	var display = window.getComputedStyle(element, null).getPropertyValue("display");

	//if the display value is "none"
	if (display == "none") {
		//set the element display back to the initial default value
		element.style.display = "block";
	} else { //if the display value is anything else
		//set the element's display value to "none"
		element.style.display = "none";
	}
}

//define a global object to store mouse coordinates for the movement of the draggable element
var dragCoords = {xDiff: 0, yDiff: 0, oldX: 0, oldY: 0};

//this is a function to toggle the display of an element to make it a draggable window object
function showElementDraggable(elementid) {
	//get the element to make draggable
	var element = document.getElementById(elementid);

	//get the display property
	var display = window.getComputedStyle(element, null).getPropertyValue("display");

	//if the display value is "none"
	if (display == "none") {
		//set the display value to be absolute as we want this to be free from the document flow
		element.style.display = "block";
		element.style.position = "absolute";

		//set the dragging behavior for the draggable header element
		document.getElementById(elementid+"dragheader").onmousedown = dragMouseDown;
	} else { //if the display value is anything else
		//set the element's display value to "none"
		element.style.display = "none";
	}

	//the callback function for when a mouse button is pushed "down"
	function dragMouseDown(event) {
		//make sure we have the event with the right info
		event = event || window.event;

		//prevent the default behavior
		event.preventDefault();

		//set the mouse cursor position according to the current position
		dragCoords.oldX = event.clientX;
		dragCoords.oldY = event.clientY;

		//make sure to remove any dragging behavior once the mouse is released
		document.onmouseup = closeDragElement;

		//make sure to move the element if the mouse is dragging
		document.onmousemove = elementDrag;
	}

	//the function to drag the element by changing the offset values in the style attribute
	function elementDrag(event) {
		//make sure we have the event with the right info
		event = event || window.event;

		//prevent the default behavior
		event.preventDefault();

		//calculate the new cursor position
		dragCoords.diffX = dragCoords.oldX - event.clientX;
		dragCoords.diffY = dragCoords.oldY - event.clientY;
		dragCoords.oldX = event.clientX;
		dragCoords.oldY = event.clientY;

		//check to see that the window does not go beyond the bounds of the window
		if ( !(event.clientX < 0 || event.clientX > window.innerWidth) ) {
			//move the element on the x axis based on the calculations above
			element.style.left = (element.offsetLeft - dragCoords.diffX) + "px";
		}

		if ( !(event.clientY < 0 || event.clientY > window.innerHeight) ) {
			//move the element on the y axis based on the calculations above
			element.style.top = (element.offsetTop - dragCoords.diffY) + "px";
		}
	}

	//a function to reset the event call functions to stop mouse movement
	function closeDragElement() {
		//set the mouse event functions to "null" to prevent dragging behavior
		document.onmouseup = null;
		document.onmousemove = null;
	}
}
