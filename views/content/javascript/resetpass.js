//file for storing functions related to the submission of a new password form

//onclick function for the submission of a new password
async function resetpassSubmitted() {
	//begin the loading animation for the form
	formLoadingState("resetpassform");

	//check the validity of form inputs
	if (!checkFormInputs("resetpassform")) {
		formLoadingState("resetpassform", true);
		return false;
	}

	//check for a password confirmation match
	if (!confirmPassword("passwordconf")) {
		alert("Passwords do not match.");
		return false;
	}

	//re-enable the form elements while keeping them invisible for proper submission
	for (var element of document.getElementById("resetpassform").elements) {
		element.disabled = false;
	}

	//use fetch to submit the new password form and follow redirects
	var response = await fetch("/resetpass", {
		method: "POST",
		redirect: "follow",
		body: new FormData(document.getElementById("resetpassform")),
		credentials: "include"
	});

	//redirect the user
	if (response.redirected) {
		//replace the current entry in the session history with the redirect url
		history.replaceState(null, "", response.url);

		//get the html of the redirect response
		var body = await response.text();

		//write the html contents to the document
		document.open();
		document.write(body);
		document.close();
	}

	return true;
}
