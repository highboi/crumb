//file for handling the verification for the form inputs for ad submissions

//a function for getting the accepted dimensions for ads
async function getAdDimensions() {
	var adDimensions = await fetch("/addimensions");
	adDimensions = await adDimensions.json();

	return adDimensions.acceptedDimensions;
}

//a function for verifying the ad submission for for bad inputs
async function verifyAdForm(formid) {
	if (!checkFormInputs(formid)) {
		return false;
	}

	var businessLink = document.querySelector(`#${formid} #businessLink`);

	var relativeURLRegex = new RegExp("^(\/)[^ :]*");

	if (!businessLink.value.match(relativeURLRegex)) {
		alert("Invalid URL for advertisement, use relative URLs such as /example or /index.html (/ for the landing page).");
		return false;
	}

	var acceptedDimensions = await getAdDimensions();

	var imgResMatch = await checkImgResolution(document.querySelector(`#${formid} #adImage`).files[0], acceptedDimensions);

	if (!imgResMatch) {
		alert("Image is not one of the accepted resolutions.");
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
	//disable all of the form elements inside the ad submission form
	var formElements = document.querySelector("#adSubmissionForm").elements;

	for (var element of formElements) {
		element.disabled = true;
	}

	//make the submit button invisible and reveal the loading animation
	document.querySelector("#submitAdvertSubscription").style.display = "none";
	document.querySelector(".lds-hourglass#submitAdvertSubscriptionLoading").style.display = "inline-block";

	//verify the validity of the inputs of the ad form (correct link formatting, etc.)
	var verifyResult = await verifyAdForm("adSubmissionForm");

	if (!verifyResult) {
		//re-enable the form for corrections to it
		for (var element of formElements) {
			element.disabled = false;
		}

		//make the submit button visible again and hide the loading animation from view
		document.querySelector("#submitAdvertSubscription").style.display = "initial";
		document.querySelector(".lds-hourglass#submitAdvertSubscriptionLoading").style.display = "none";

		return false;
	}

	//make the form data for the advertisement itself
	var advertForm = new FormData();

	//get the start date as a unix timestamp
	var startDate = new Date(document.querySelector("#adSubmissionForm #startDate").value.split("-"));
	startDate = (startDate.getTime() / 1000).toFixed(0);

	advertForm.append("startDate", startDate);

	var advertInputs = Array.from(document.querySelectorAll("#adSubmissionForm #adForm input"));

	for (var input of advertInputs) {
		if (input.type == "file") {
			advertForm.append(input.name, input.files[0]);
		} else {
			advertForm.append(input.name, input.value);
		}
	}

	//send the data to be stored
	var response = await fetch("/adsubmission", {
		method: "POST",
		body: advertForm
	});
	var jsonparsed = await response.json();

	alert("Subscription succeeded!");

	//redirect to the ad statistics page
	window.location.href = "/adstats";

	return true;
}
