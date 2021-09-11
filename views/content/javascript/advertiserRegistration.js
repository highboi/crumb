//file for handling stripe payments on the site

//define a stripe handler
var stripeHandler = Stripe(stripePubKey);

//define and mount a card element to gather card information
var elements = stripeHandler.elements()
var cardElement = elements.create("card", {
	style: {
		base: {
			iconColor: "#adff12",
			color: "#adff12",
			backgroundColor: "#1f1f1f",
			fontSize: "40px",
			"::placeholder": {
				color: "#adff12"
			}
		}
	}
});
cardElement.mount("#cardForm");

//a function that submits an advertisers information
async function submitAdvertiser() {
	//disable the form and activate a loading animation
	formLoadingState("adRegistration");

	//check the validity of the form inputs
	if (!checkFormInputs("adRegistration")) {
		formLoadingState("adRegistration", true);
		return false;
	}

	//confirm the setup of the card submitted by the user
	var {setupIntent, error} = await stripeHandler.confirmCardSetup(
		client_secret,
		{
			payment_method: {
				card: cardElement
			}
		}
	);

	//check for errors with the setup of the card
	if (error) {
		alert(error.message);
		formLoadingState("adRegistration", true);
		return false;
	} else {
		//re-enable form elements for submission
		for (var element of document.getElementById("adRegistrationForm")) {
			element.disabled = false;
		}

		/*
		Add necessary data to the FormData object
		*/
		var advertFormData = new FormData(document.getElementById("adRegistrationForm"));
		advertFormData.append("customerid", customerid);

		//send the data to register this advertiser
		var response = await fetch("/adRegistration", {
			method: "POST",
			body: advertFormData
		});

		//check the response status
		if (response.ok) {
			alert("Setup Succeeded!");
			window.location.href = "/advertise";
			return true;
		} else {
			alert("There was an error with our server! Please try again.");
			return false;
		}
	}
}
