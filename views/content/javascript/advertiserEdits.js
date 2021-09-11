//file for handling stripe payments on the site

//define a stripe handler
var stripeHandler = Stripe(stripePubKey);

//make the card element to gather card information
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

//make sure the card check element is not checked (by default, the card information stays the same)
document.getElementById("cardcheck").checked = false;

//mount and dismount the card element based on whether or not the user wants to change the card info
document.getElementById("cardcheck").addEventListener("change", (event) => {
	if (event.target.checked) {
		cardElement.mount("#cardForm");
	} else {
		cardElement.unmount();
	}
});

//function triggered when the user submits the form
async function advertiserEditSubmitted() {
	//disable the form and show a loading animation
	formLoadingState("advertiserEditForm");

	//check the validity of form inputs
	if (!checkFormInputs("advertiserEditForm")) {
		formLoadingState("advertiserEditForm", true);
		return false;
	}

	//re-enable form elements for submission
	for (var element of document.getElementById("advertiserEditForm").elements) {
		element.disabled = false;
	}

	//make a FormData object which stores the data in the advertiser edit form
	var advertFormData = new FormData(document.getElementById("advertiserEditForm"));

	//if the card data is entered, then make a new payment method out of the card information
	if (document.getElementById("cardcheck").checked) {
		//create a payment method out of the entered card data
		var {paymentMethod, error} = await stripeHandler.createPaymentMethod({
			type: "card",
			card: cardElement
		});

		//alert the user of errors with making the payment method if there are any
		if (error) {
			alert(error.message);
			formLoadingState("advertiserEditForm", true);
			return false;
		} else {
			//append the new payment method to the form data
			advertFormData.append("paymentMethod", paymentMethod.id);
		}
	}

	//send the data to the server for changes
	var response = await fetch("/advertiseredit", {
		method: "POST",
		body: advertFormData
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
