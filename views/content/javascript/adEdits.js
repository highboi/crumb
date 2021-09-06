//a file for verifying/checking the form inputs on ad edits

//a function for checking bad inputs on the form
async function verifyAdEditForm(formid) {
	//check for empty required inputs
	if (!checkFormInputs(formid)) {
		return false;
	}

	//check for a valid relative url
	var businessLink = document.querySelector(`#${formid} #businessLink`);
	var relativeURLRegex = new RegExp("^(\/)[^ :]*");
	if (!businessLink.value.match(relativeURLRegex)) {
		alert("Invalid URL for advertisement, use relative URLs such as /example or /index.html (/ for the landing page).");
		return false;
	}

	//check for a valid image with accepted dimensions
	var adImage = document.querySelector(`#${formid} #adImage`);
	if (adImage.files.length) {
		//get the image file to check
		var imgFile = document.querySelector(`#${formid} #adImage`).files[0];

		//check for accepted dimensions
		var acceptedDimensions = await getAdDimensions();
		var imgResMatch = await checkImgResolution(imgFile, acceptedDimensions);
		if (!imgResMatch) {
			alert("Image is not one of the accepted dimensions.");
			return false;
		}

		//check for accepted mime types
		var imgTypes = await getImgTypes();
		if (!imgTypes.includes(imgFile.type)) {
			alert(`Image is not one of the accepted MIME types, please use one of these: ${imgTypes}`);
			return false;
		}
	}

	return true;
}

//the function triggered on submission of ad edits
async function advertEditSubmitted() {
	//disable the form and activate a loading animation
	formLoadingState("adEditForm");

	//verify the validity of the form and it's inputs
	var verifyResult = await verifyAdEditForm("adEditForm");
	if (!verifyResult) {
		formLoadingState("adEditForm", true);
		return false;
	}

	//add all form data to a FormData object
	var editForm = new FormData();
	var advertInputs = Array.from(document.querySelectorAll("#adEditForm #adForm input"));
	for (var input of advertInputs) {
		if (input.type == 'file') {
			editForm.append(input.name, input.files[0]);
		} else {
			editForm.append(input.name, input.value);
		}
	}

	//send the data from the form to the server
	var response = await fetch("/adedit", {
		method: "POST",
		body: editForm
	});

	//check the response status
	if (response.ok) {
		alert("Changes applied!");
		window.location.href = "/adstats";
		return true;
	} else {
		alert("There was an error with our server! Please try again.");
		return false;
	}
}
