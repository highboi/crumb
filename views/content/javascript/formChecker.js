//a js file to contain functions which are used to verify forms

//a function for verifying the validity of a form's inputs
async function checkFormInputs(formid) {
	//get all of the required inputs from a form
	var inputs = Array.from(document.querySelectorAll(`#${formid} input:required`));

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

