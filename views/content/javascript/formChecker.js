//a js file to contain functions which are used to verify forms

//a function for verifying the validity of a form's inputs
async function checkFormInputs(formid) {
	var inputs = Array.from(document.querySelectorAll(`#${formid} input`));

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
