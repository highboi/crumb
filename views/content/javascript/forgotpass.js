//file for storing functions related to the submission of a login form

//onclick function for the submission of a login
async function forgotpassSubmitted() {
	//begin the loading animation for the form
	formLoadingState("forgotpassform");

	//check the validity of form inputs
	if (!checkFormInputs("forgotpassform")) {
		formLoadingState("forgotpassform", true);
		return false;
	}

	//re-enable the form elements while keeping them invisible for proper submission
	for (var element of document.getElementById("forgotpassform").elements) {
		element.disabled = false;
	}

	//use fetch to submit the login form and follow redirects
	var response = await fetch("/forgotpass", {
		method: "POST",
		redirect: "follow",
		body: new FormData(document.getElementById("forgotpassform")),
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
