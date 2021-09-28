//file to verify the contents of a stream being submitted and submitting it with fetch

//function to verify the fields of the live stream form
async function verifyStreamForm(formid) {
	//check required form input validity
	if (!checkFormInputs(formid)) {
		return false;
	}

	//check thumbnail file validity
	var thumbnail = document.querySelector(`#${formid} #liveThumbnail`);
	if (thumbnail.files.length) {
		var thumbfile = thumbnail.files[0];

		var imgTypes = await getImgTypes();
		if (!imgTypes.includes(thumbfile.type)) {
			alert(`Image is not one of the accepted MIME types, please use one of these: ${imgTypes}`);
			return false;
		}
	}

	//check file signatures
	var fileVerify = await verifyFileSignatures(formid);
	if (!fileVerify) {
		return false;
	}

	//check file sizes
	var fileSizeCheck = await checkFileSizes(formid, 4000000);
	if (!fileSizeCheck) {
		return false;
	}

	return true;
}

//onclick function for stream submission
async function submitStreamForm() {
	//disable form and activate loading animation
	formLoadingState("streamSubmitForm");

	//verify form inputs
	var verifyResult = await verifyStreamForm("streamSubmitForm");
	if (!verifyResult) {
		formLoadingState("streamSubmitForm", true);
		return false;
	}

	//re-enable form elements
	for (var element of document.getElementById("streamSubmitForm").elements) {
		element.disabled = false;
	}

	//get the post url from the form
	var posturl = document.getElementById("streamSubmitForm").action;

	var response = await makeRequest("POST", posturl, new FormData(document.getElementById("streamSubmitForm")), (event) => {
		var percentage = (event.loaded / event.total)*100;
		document.querySelector("#streamSubmitForm .percentage").innerText = `${percentage}%`;
	});

	//check for proper redirection
	if (response.url != window.location.href) {
		//replace the previous entry in session history with the new url
		history.replaceState(null, "", response.url);

		//get the html from the response
		var body = response.text;

		//write the new html to the document
		document.open();
		document.write(body);
		document.close();
	} else {
		//alert the user of the error with the server
		alert("There was an error with our server! Please try again.");
		return false;
	}

	/*
	//submit the form to the fetch url
	var response = await fetch(posturl, {
		method: "POST",
		body: new FormData(document.getElementById("streamSubmitForm"))
	});

	//check for proper redirection
	if (response.redirected) {
		//replace the previous entry in session history with the new url
		history.replaceState(null, "", response.url);

		//get the html from the response
		var body = await response.text();

		//write the new html to the document
		document.open();
		document.write(body);
		document.close();
	} else {
		//alert the user of the error with the server
		alert("There was an error with our server! Please try again.");
		return false;
	}
	*/
}
