//a js file to contain functions which are used to verify forms

//a function for verifying the validity of a form's inputs
async function checkFormInputs(formid) {
	//get all of the required inputs from a form
	var inputs = Array.from(document.forms[formid].elements);

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

//a function to check for the resolution of an image in the form
async function checkImgResolution(img, resolutions) {
	return new Promise((resolve, reject) => {
		var testImg = document.createElement("img");

		var imgURL = URL.createObjectURL(img);

		testImg.src = imgURL;

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
	//disable all of the form elements inside the ad submission form
	var formElements = document.querySelector(`#${formid}`).elements;

	//check to see if we want to turn the loading state for this form off
	if (off) {
		for (var element of formElements) {
			element.disabled = false;
		}

		//make the submit button invisible and reveal the loading animation
		document.querySelector(`#${formid} .submitbtn`).style.display = "inline-block";
		document.querySelector(`#${formid} .lds-hourglass`).style.display = "none";
	} else {
		for (var element of formElements) {
			element.disabled = true;
		}

		//make the submit button invisible and reveal the loading animation
		document.querySelector(`#${formid} .submitbtn`).style.display = "none";
		document.querySelector(`#${formid} .lds-hourglass`).style.display = "inline-block";
	}
}
