//file for storing functions related to the submission of a login form

//onclick function for the submission of a login
async function loginSubmitted() {
	//begin the loading animation for the form
	formLoadingState("loginform");

	//check the validity of form inputs
	if (!checkFormInputs("loginform")) {
		formLoadingState("loginform", true);
		return false;
	}

	//check the password value for the right length
	if (document.querySelector("#loginform #password").value.length < 6) {
		alert("Password needs to be 6 or more characters long");
		formLoadingState("loginform", true);
		return false;
	}

	//re-enable the form elements while keeping them invisible for proper submission
	for (var element of document.getElementById("loginform").elements) {
		element.disabled = false;
	}

	//use fetch to submit the login form and follow redirects
	var response = await fetch("/login", {
		method: "POST",
		redirect: "follow",
		body: new FormData(document.getElementById("loginform")),
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
