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
	formLoadingState("advertiserEditForm");

	if (!checkFormInputs("advertiserEditForm")) {
		formLoadingState("advertiserEditForm", true);
		return false;
	}

	var businessDomain = document.querySelector("#advertiserEditForm #businessDomain").value;
	var businessEmail = document.querySelector("#advertiserEditForm #businessEmail").value;

	var advertFormData = new FormData();

	//if the card data is entered, then make a new payment method out of the card information
	if (document.getElementById("cardcheck").checked) {
		//create a payment method out of the entered card data
		var {paymentMethod, error} = await stripeHandler.createPaymentMethod({
			type: "card",
			card: cardElement
		});

		if (error) {
			alert(error.message);
			formLoadingState("advertiserEditForm", true);
			return false;
		}

		advertFormData.append("paymentMethod", paymentMethod.id);
	}

	advertFormData.append("businessDomain", businessDomain);
	advertFormData.append("businessEmail", businessEmail);

	var response = await fetch("/advertiseredit", {
		method: "POST",
		body: advertFormData
	});
	var jsonparsed = await response.json();

	alert("Changes applied!");
	window.location.href = "/adstats";
}
