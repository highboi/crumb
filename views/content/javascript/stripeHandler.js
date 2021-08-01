//file for handling stripe payments on the site

//define a stripe handler
var stripeHandler = Stripe(stripePubKey);

//a function for getting the accepted dimensions for ads
async function getAdDimensions() {
	//get the url for the accepted dimensions
	var adDimensions = await fetch("/addimensions");

	//get the json from the response
	adDimensions = await adDimensions.json();

	//return the accepted dimensions
	return adDimensions.acceptedDimensions;
}

//a function to check for the resolution of an image in the form
async function checkImgResolution(img, resolutions) {
	return new Promise((resolve, reject) => {
		//make a test image element
		var testImg = document.createElement("img");

		//make a url out of the image data
		var imgURL = URL.createObjectURL(img);

		console.log(imgURL);

		//set the source of the image
		testImg.src = imgURL;

		//pass a function to handle the image once it is loaded to this element
		testImg.onload = () => {
			//loop through all of the resolutions to check for
			for (var res of resolutions) {
				//check for matching widths and heights
				if (res.width == testImg.naturalWidth && res.height == testImg.naturalHeight) {
					//resolve the promise with a boolean true for matching
					resolve(true);
				}
			}

			//resolve the promise with a false since the image did not pass the checks above
			resolve(false);
		}

		//pass the rejection function of the promise to the error handler of the image
		testImg.onerror = reject;
	});
}

//define a function which activates once the user clicks to submit the advertisement
async function advertSubmitted() {
	//get all of the form inputs
	var inputs = Array.from(document.querySelectorAll("#adSubmissionForm input"));

	//check for empty fields in the ad submission form
	for (var input of inputs) {
		//return on empty values
		if (!input.value) {
			alert(`Please fill in ${input.name}`);
			return;
		}

		//return on invalid inputs
		if (!input.checkValidity()) {
			alert(`Invalid input in ${input.name}`);
			return;
		}
	}

	//make sure the business link is a valid relative url instead of jibberish or a domain name
	var businessLink = document.querySelector("#businessLink");

	var relativeURLRegex = new RegExp("^(\/)[^ :]*");

	if (!businessLink.value.match(relativeURLRegex)) {
		alert("Invalid URL for advertisement, use relative URLs such as /example or /index.html (/ for the landing page).");
		return;
	}

	//get the start date value
	var startDate = document.querySelector("#adSubmissionForm #startDate").valueAsDate.getTime();

	//get the current date
	var currentDate = new Date(Date.now());

	//check for an invalid start date
	if (startDate < currentDate.getTime()) {
		console.log("START DATE:", startDate);
		console.log(currentDate.getTime());

		alert("Invalid start date");
		return;
	}

	//get the expiration month and year
	var expMonth = document.querySelector("#adSubmissionForm #expMonth");
	var expYear = document.querySelector("#adSubmissionForm #expYear");

	//make the expiration date out of the expiration month and year
	var expDate = new Date(expYear.value, expMonth.value-1, 1, 0, 0, 0, 0);

	//check for a valid expiration date
	if (expDate.getTime() < currentDate.getTime()) {
		alert("Invalid expiration date");
		return;
	}

	//make an array of the accepted image resolutions
	var acceptedDimensions = await getAdDimensions();

	//check for the right image resolution
	var imgResMatch = await checkImgResolution(document.querySelector("#adSubmissionForm #adImage").files[0], acceptedDimensions);

	//alert the user if this image is not an accepted resolution
	if (!imgResMatch) {
		alert("Image is not one of the accepted resolutions.");
		return;
	}

	//make a form data object in which to store all of the form data
	var cardForm = new FormData();

	//get the CVC number from the user
	var cvcNum = prompt("Enter CVC Number:");

	//add the cvc number to the form data
	cardForm.append("cvcnum", cvcNum);

	//get all of the card data
	var cardInputs = Array.from(document.querySelectorAll("#adSubmissionForm #cardForm input"));

	//loop through the card inputs to append to the form data
	for (var input of cardInputs) {
		//append this card data to the form data object
		cardForm.append(input.name, input.value);
	}

	//send a post request to the ad payment url
	var cardResponse = await fetch("/adpayment", {
		method: "POST",
		body: cardForm
	});

	//get the json response data
	var cardResponseData = await cardResponse.json();

	//confirm the payment using the payment intent id and the payment method
	var result = await stripeHandler.confirmCardPayment(cardResponseData.client_secret, {
		payment_method: cardResponseData.paymentMethod.id
	});

	//check for the status of the payment
	if (typeof result.paymentIntent != 'undefined') {
		alert("Payment Succeeded!");

		var advertForm = new FormData();

		var advertInputs = Array.from(document.querySelectorAll("#adSubmissionForm #adForm input"));

		for (var input of advertInputs) {
			//check for files which need a different way of getting the data
			if (input.type == "file") {
				advertForm.append(input.name, input.files[0]);
			} else {
				advertForm.append(input.name, input.value);
			}
		}

		var response = await fetch("/adsubmission", {
			method: "POST",
			body: advertForm
		});

		var jsonparsed = await response.json();

		window.location.href = "/adstats";

		return;
	} else {
		alert("Payment declined:\n\t" + result.error.code + " : " + result.error.message);

		return;
	}
}
