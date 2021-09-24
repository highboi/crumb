//file for handling the submission of comments using fetch

//verify the comment form and its inputs
async function verifyCommentForm(formid) {
	//check required inputs for validity
	if (!checkFormInputs(formid)) {
		return false;
	}

	//check the file signatures on the form
	var fileVerify = await verifyFileSignatures(formid);
	if (!fileVerify) {
		return false;
	}

	return true;
}

//onclick function for comment submission
async function commentSubmitted(formid) {
	//make the form go into a loading state
	formLoadingState(formid);

	//verify the state of the form
	var verifyResult = await verifyCommentForm(formid);
	if (!verifyResult) {
		formLoadingState(formid, true);
		return false;
	}

	//re-enable form elements
	for (var element of document.getElementById(formid).elements) {
		element.disabled = false;
	}

	//get the post url from the form element itself
	var posturl = document.getElementById(formid).action;

	//post the comment
	var response = await fetch(posturl, {
		method: "POST",
		body: new FormData(document.getElementById(formid))
	});

	//check for proper redirection
	if (response.redirected) {
		//replace the previous entry in browser session with redirect url
		history.replaceState(null, "", response.url);

		//get the response html
		var body = await response.text();

		//write the html to the document
		document.open();
		document.write(body);
		document.close();

		return true;
	} else {
		alert("There was an error with our server! Please try again");
		return false;
	}
}
