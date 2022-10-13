//file for handling the submission of videos using fetch and JS

//function to verify the fields of the video submission form
async function verifyVideoForm(formid) {
	//check for empty or invalid inputs
	if (!checkFormInputs(formid)) {
		return false;
	}

	//get the accepted mime types for the files
	var imgTypes = await getImgTypes();
	var vidTypes = await getVidTypes();

	//check for a valid thumbnail file
	var thumbnailfile = document.querySelector(`#${formid} #thumbnail`).files[0];
	if (typeof thumbnailfile != 'undefined' && !imgTypes.includes(thumbnailfile.type)) {
		alert(`Image file is not one of the accepted MIME types, please use one of these ${imgTypes}`);
		return false;
	}

	//check for a valid video file
	var videofile = document.querySelector(`#${formid} #video`).files[0];
	if (typeof videofile != 'undefined' && !vidTypes.includes(videofile.type)) {
		alert(`Video file is not one of the accepted MIME types, please use one of these ${vidTypes}`);
		return false;
	}

	//check for a valid subtitle file if there is one
	var subtitlefile = document.querySelector(`#${formid} #subtitles`).files[0];
	if (typeof subtitlefile != "undefined" && subtitlefile.type == "application/x-subrip") {
		alert("Invalid subtitle file, please use a file with a .srt extension (application/x-subrip).");
		return false;
	}

	//check for invalid file signatures on the form
	var fileVerify = await verifyFileSignatures(formid);
	if (!fileVerify) {
		return false;
	}

	//check the subtitle file signature
	var subFileVerify = await verifyFileSignature("subtitles", "310a3030");
	if (!subFileVerify) {
		return false;
	}

	//check the thumbnail file size
	var thumbSizeCheck = await checkFileSize("thumbnail", 4000000);
	if (!thumbSizeCheck) {
		return false;
	}

	//everything checks out
	return true;
}

//onclick function for video form submission
async function videoSubmitted() {
	if (confirm("Submit Edits?")) {
		//make the form go into a loading state
		formLoadingState("videoSubmissionForm");

		//verify the form inputs
		var verifyResult = await verifyVideoForm("videoSubmissionForm");
		if (!verifyResult) {
			formLoadingState("videoSubmissionForm", true);
			return false;
		}

		//enable the elements of the form
		for (var element of document.getElementById("videoSubmissionForm").elements) {
			element.disabled = false;
		}

		//send the information to the server
		var response = await makeRequest("POST", `/v/postedit/${videoid}`, new FormData(document.getElementById("videoSubmissionForm")), (event) => {
			var percentage = (event.loaded/event.total)*100;
			document.querySelector("#videoSubmissionForm .percentage").innerText = `${percentage}%`;
		});

		//check for a redirection
		if (response.url != window.location.href) {
			//replace the current entry in the session history with the redirect url
			history.replaceState(null, "", response.url);

			//get the response html
			var body = response.text;

			//load the response html in the body
			document.open();
			document.write(body);
			document.close();

			return true;
		} else {
			alert("There was an error with our server! Please try again.");
			return false;
		}
	}
}
