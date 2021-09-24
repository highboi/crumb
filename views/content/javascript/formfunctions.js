//a js file to contain functions which are used to verify forms

//a function for getting the accepted MIME types for image files
async function getImgTypes() {
	var imgTypes = await fetch("/imgtypes");
	imgTypes = await imgTypes.json();

	return imgTypes.acceptedTypes;
}

//a function for getting the accepted image file signatures
async function getImgHeaders() {
	var imgHeaders = await fetch("/imgheaders");
	imgHeaders = await imgHeaders.json();

	return imgHeaders.acceptedHeaders;
}

//a function for getting the accepted MIME types for video files
async function getVidTypes() {
	var vidTypes = await fetch("/vidtypes");
	vidTypes = await vidTypes.json();

	return vidTypes.acceptedTypes;
}

//a function for getting the accepted video file signatures
async function getVidHeaders() {
	var vidHeaders = await fetch("/vidheaders");
	vidHeaders = await vidHeaders.json();

	return vidHeaders.acceptedHeaders;
}

//a function for getting the accepted dimensions for ads
async function getAdDimensions() {
	var adDimensions = await fetch("/addimensions");
	adDimensions = await adDimensions.json();

	return adDimensions.acceptedDimensions;
}

//a function for checking for empty or invalid inputs in a form (required inputs are checked only)
async function checkFormInputs(formid) {
	//get all of the required inputs from a form
	var inputs = Array.from(document.forms[formid].elements).filter((item) => {
		return item.required;
	});

	//check for emptiness or invalid input values
	for (var input of inputs) {
		if (!input.value) {
			alert(`Please fill in ${input.name}`);
			return false;
		}

		if (!input.checkValidity()) {
			alert(`Invalid input for ${input.name} of type ${input.type}`);
			return false;
		}
	}

	return true;
}

//a function for checking an image resolution agains an array of accepted resolutions for validity
async function checkImgResolution(img, resolutions) {
	return new Promise((resolve, reject) => {
		//make an image element
		var testImg = document.createElement("img");
		var imgURL = URL.createObjectURL(img);
		testImg.src = imgURL;

		//check the width and height of the image when it loads into the element
		testImg.onload = () => {
			for (var res of resolutions) {
				if (res.width == testImg.naturalWidth && res.height == testImg.naturalHeight) {
					resolve(true);
				}
			}

			resolve(false);
		}

		testImg.onerror = reject;
	});
}

//a function to disable a form and begin the loading animation on the form
function formLoadingState(formid, off=false) {
	//get all of the form elements
	var formElements = document.querySelector(`#${formid}`).elements;

	//check to see if we want to turn the loading state for this form off or on
	if (off) {
		//make the form visible again
		document.getElementById(formid).style.display = "";

		//re-enable all form elements
		for (var element of formElements) {
			element.disabled = false;
		}

		//make the submit button invisible and reveal the loading animation
		document.querySelector(`#${formid} .submitbtn`).style.display = "inline-block";
		document.querySelector(`#${formid} .lds-hourglass`).style.display = "none";
	} else {
		//make the form disappear
		document.getElementById(formid).style.display = "none";

		//disable all form elements
		for (var element of formElements) {
			element.disabled = true;
		}

		//make the submit button invisible and reveal the loading animation
		document.querySelector(`#${formid} .submitbtn`).style.display = "none";
		document.querySelector(`#${formid} .lds-hourglass`).style.display = "inline-block";
	}
}

//this is a function to help confirm passwords in 2 fields on a form
function confirmPassword(classname) {
	//get all of the password fields by the class name passed to this function
	var fields = document.querySelectorAll(`.${classname}`);

	//get the password confirmation alert tag
	var alertTag = document.querySelector(`#passwordconfalert.${classname}`);

	//if the first two fields do not have the same value, then alert the user
	if (fields[0].value != fields[1].value) {
		alertTag.innerHTML = "Passwords do not Match!"
		alertTag.style.color = "red";
		return false;
	} else { //if the passwords have the same value, then let the user know everything is good
		alertTag.innerHTML = "Passwords Match!";
		alertTag.style.color = "#adff12";
		return true;
	}
}

//this is a function to get the file signature information about a file
async function getFileSignature(file) {
	//get the file as an array buffer
	var arrayBufferFile = await file.arrayBuffer();

	//get the first four bytes as the header of the file
	var headerArr = (new Uint8Array(arrayBufferFile)).subarray(0, 4);

	//an empty string to store the file header
	var header = "";

	//construct the file header from the bytes in the header array
	for (var byte of headerArr) {
		header += byte.toString(16);
	}

	//return the file header as a string
	return header;
}

//a function for verifying the file signatures of file inputs in a form
async function verifyFileSignatures(formid) {
	//get all file input elements from this form
	var fileInputs = Array.from(document.getElementById(formid).querySelectorAll("input[type='file']"));

	//get the accepted file signatures outside of the for loop for efficiency
	var imgHeaders = await getImgHeaders();
	var vidHeaders = await getVidHeaders();

	//check all file inputs
	for (var input of fileInputs) {
		//check that the input has files in the first place
		if (input.files.length) {
			//check for what the file input should accept
			switch (input.accept.replaceAll(" ", "")) {
				case "video/*":
					//get the current file signature of this input element
					var fileSignature = await getFileSignature(input.files[0]);

					//if the file signature is not a valid one, alert the user and return false
					if (!vidHeaders.includes(fileSignature)) {
						alert(`File input "${input.id}" has a faulty file signature, use a valid file.`);
						return false;
					}

					break;
				case "image/*":
					//get the current file signature of this input element
					var fileSignature = await getFileSignature(input.files[0]);

					//if the file signature is not a valid one, alert the user and return false
					if (!imgHeaders.includes(fileSignature)) {
						alert(`File input "${input.id}" has a faulty file signature, use a valid file.`);
						return false;
					}

					break;
				case "image/*,video/*":
				case "video/*,image/*":
					//get both the image and video signatures that are accepted
					var acceptedSignatures = imgHeaders.concat(vidHeaders);

					//get the file signature of this file input
					var fileSignature = await getFileSignature(input.files[0]);

					//alert the user of an invalid file signature
					if (!acceptedSignatures.includes(fileSignature)) {
						alert(`File input "${input.id}" has a faulty file signature, use a valid file.`);
						return false;
					}

					break;
			}
		}
	}

	return true;
}
