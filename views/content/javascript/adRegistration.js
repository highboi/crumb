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


//a function to get the card data from the submission form
async function getCardData(formid) {
	//make a form data object in which to store all of the form data
	var cardForm = new FormData();

	var cardInputs = Array.from(document.querySelectorAll(`#${formid} #cardForm input`));

	for (var input of cardInputs) {
		cardForm.append(input.name, input.value);
	}

	return cardForm;

}

async function submitAdvertiser() {
	if (!checkFormInputs("adRegistration")) {
		return false;
	}

	var businessDomain = document.querySelector("#adRegistration #businessDomain").value;
	var businessEmail = document.querySelector("#adRegistration #businessEmail").value;

	var cardData = await getCardData("adRegistration");

	stripeHandler.confirmCardSetup(
		client_secret,
		{
			payment_method: {
				card: cardElement
			}
		}
	).then(async (result) => {
		if (result.error) {
			alert(result.error);
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
		}
	});
}

document.querySelector("#submitAdvertiser").addEventListener("click", submitAdvertiser);
