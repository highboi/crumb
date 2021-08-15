//file for handling stripe payments on the site

//define a stripe handler
var stripeHandler = Stripe(stripePubKey);

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

async function submitAdvertiser() {
	formLoadingState("adRegistration");

	if (!checkFormInputs("adRegistration")) {
		formLoadingState("adRegistration", true);
		return false;
	}

	var businessDomain = document.querySelector("#adRegistration #businessDomain").value;
	var businessEmail = document.querySelector("#adRegistration #businessEmail").value;

	var {setupIntent, error} = await stripeHandler.confirmCardSetup(
		client_secret,
		{
			payment_method: {
				card: cardElement
			}
		}
	);

	if (error) {
		alert(error.message);
		formLoadingState("adRegistration", true);
		return false;
	} else {
		var advertFormData = new FormData();

		advertFormData.append("businessDomain", businessDomain);
		advertFormData.append("businessEmail", businessEmail);
		advertFormData.append("customerid", customerid);

		var response = await fetch("/adRegistration", {
			method: "POST",
			body: advertFormData
		});

		alert("Setup Succeeded!");
		window.location.href = "/advertise";

		return true;
	}
}
