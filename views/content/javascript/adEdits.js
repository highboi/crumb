//a file for verifying/checking the form inputs on ad edits

//a function for getting the accepted dimensions for ads
async function getAdDimensions() {
	var adDimensions = await fetch("/addimensions");
	adDimensions = await adDimensions.json();

	return adDimensions.acceptedDimensions;
}

//a function for checking bad inputs on the form
async function verifyAdEditForm(formid) {
	if (!checkFormInputs(formid)) {
		return false;
	}

	var businessLink = document.querySelector(`#${formid} #businessLink`);

	var relativeURLRegex = new RegExp("^(\/)[^ :]*");

	if (!businessLink.value.match(relativeURLRegex)) {
		alert("Invalid URL for advertisement, use relative URLs such as /example or /index.html (/ for the landing page).");
		return false;
	}

	var adImage = document.querySelector(`#${formid} #adImage`);

	var acceptedDimensions = await getAdDimensions();

	if (adImage.files.length) {
		var imgResMatch = await checkImgResolution(document.querySelector(`#${formid} #adImage`).files[0], acceptedDimensions);
		if (!imgResMatch) {
			alert("Image is not one of the accepted dimensions.");
			return false;
		}
	}

	return true;
}

//the function triggered on submission of ad edits
async function advertEditSubmitted() {
	formLoadingState("adEditForm");

	//verify the validity of the inputs of the ad form (correct link formatting, etc.)
	var verifyResult = await verifyAdEditForm("adEditForm");

	if (!verifyResult) {
		formLoadingState("adEditForm", true);

		return false;
	}

	var editForm = new FormData();

	var advertInputs = Array.from(document.querySelectorAll("#adEditForm #adForm input"));

	for (var input of advertInputs) {
		if (input.type == 'file') {
			editForm.append(input.name, input.files[0]);
		} else {
			editForm.append(input.name, input.value);
		}
	}

	var response = await fetch("/adedit", {
		method: "POST",
		body: editForm
	});
	var jsonparsed = await response.json();

	alert("Changes applied!");

	window.location.href = "/adstats";

	return true;
}
