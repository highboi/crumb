//store functions for handling the form submission of registration forms

//verify fields in the registration form
async function verifyRegistration(formid) {
	//check the validity of form inputs
	if (!checkFormInputs(formid)) {
		return false;
	}

	//check the password value for the right length
	if (document.querySelector(`#${formid} #password`).value.length < 6) {
		alert("Password needs to be 6 or more characters long");
		return false;
	}

	//check for a password confirmation match
	if (!confirmPassword("passwordconf")) {
		alert("Passwords do not match.");
		return false;
	}

	//check the files for the channel banner and icon
	var channelfiles = [document.querySelector("#registerform #channelicon"), document.querySelector("#registerform #channelbanner")];
	for (var filefield of channelfiles) {
		if (filefield.files.length) {
			var iconfile = filefield.files[0];

			var imgTypes = await getImgTypes();
			if (!imgTypes.includes(iconfile.type)) {
				alert(`Image for ${filefield.id} is not one of the accepted MIME types, please use one of these: ${imgTypes}`);
				return false;
			}
		}
	}

	return true;
}

//onclick function for registration submission
async function registrationSubmitted() {
	formLoadingState("registerform");

	//check for invalid inputs
	var verifyresult = await verifyRegistration("registerform");
	if (!verifyresult) {
		formLoadingState("registerform", true);
		return false;
	}

	//re-enable form elements for submission
	for (var element of document.getElementById("registerform").elements) {
		element.disabled = false;
	}

	//post the registration form using fetch and redirect
	var response = await fetch("/register", {
		method: "POST",
		redirect: "follow",
		body: new FormData(document.getElementById("registerform")),
		credentials: "include"
	});

	//redirect the user
	if (response.redirected) {
		//replace the current entry in the session history with the redirect url
		history.replaceState(null, "", response.url);

		//get the redirect response html
		var body = await response.text();

		//render the response html to the document
		document.open();
		document.write(body);
		document.close();
	}

	return true;
}
