//file for handling the verification for the form inputs for ad submissions

//a function for verifying the ad submission for for bad inputs
async function verifyAdSubmissionForm(formid) {
	//check for empty required fields
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

	//get the ad image file
	var imgFile = document.querySelector(`#${formid} #adImage`).files[0];


	//check to see that the image has accepted dimensions
	var acceptedDimensions = await getAdDimensions();
	var imgResMatch = await checkImgResolution(imgFile, acceptedDimensions);
	if (!imgResMatch) {
		alert("Image is not one of the accepted resolutions.");
		return false;
	}

	//check to see that the image has an accepted mime type
	var imgTypes = await getImgTypes();
	if (!imgTypes.includes(imgFile.type)) {
		alert(`Image is not one of the accepted MIME types, please use one of these: ${imgTypes}`);
		return false;
	}

	//check file signatures
	var fileVerify = await verifyFileSignatures(formid);
	if (!fileVerify) {
		return false;
	}

	//check file sizes
	var fileSizeCheck = await checkFileSizes(formid, 4000000);
	if (!fileSizeCheck) {
		return false;
	}

	//verify the validity of starting dates for advertisement campaigns
	var startDate = new Date(document.querySelector(`#${formid} #startDate`).value.split("-"));
	startDate = startDate.getTime();
	var currentDate = Date.now();
	if (currentDate > startDate) {
		alert(`Invalid starting date. Current: ${currentDate} Starting: ${startDate}`);
		return false;
	}

	return true;

}

//define a function which is triggered once the user clicks the button for submitting a subscription for ads
async function advertSubscriptionSubmitted() {
	//disable the form and activate a loading animation
	formLoadingState("adSubmissionForm");

	//verify the validity of the form and it's inputs
	var verifyResult = await verifyAdSubmissionForm("adSubmissionForm");
	if (!verifyResult) {
		formLoadingState("adSubmissionForm", true);
		return false;
	}

	//re-enable form elements for submission
	for (var element of document.getElementById("adSubmissionForm").elements) {
		element.disabled = false;
	}

	//send the data to be stored and handle the upload progress
	var response = await makeRequest("POST", "/adsubmission", new FormData(document.getElementById("adSubmissionForm")), (event) => {
		//calculate the percentage of the upload completed and display it
		var percentage = (event.loaded / event.completed) * 100;
		document.querySelector("#adSubmissionForm .percentage").innerText = `${percentage}%`;
	});


	//check the response status
	if (response.status >= 200 && response.status < 300) {
		alert("Subscription succeeded!");
		window.location.href = "/adstats";
		return true;
	} else {
		alert("There was an error with our server! Please try again.");
		return false;
	}
}
