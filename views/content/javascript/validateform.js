//this is a javascript file to help with the confirmation of passwords

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

function validateForm(passconfclass=undefined) {
	//get the form object
	var form = document.getElementsByClassName("authform")[0];

	//loop through the form children and push all input tag values into an array
	var inputValues = [];
	Array.from(form.children).forEach((item, index) => {
		var inputfield = item.getElementsByTagName("input")[0];
		//if there is no input field or if the field is not a file type, then enter the value into
		//the array (files are optional and default server files can be used)
		if (typeof inputfield != 'undefined' && inputfield.type != "file") {
			inputValues.push(inputfield.value);
		}
	});

	//if there are any empty values in the form then return false
	if (inputValues.includes("") || inputValues.includes(undefined)) {
		alert("Fill in all fields please.");
		return false;
	}

	//check for a minimum length for a password
	if (document.getElementById("password").value.length < 6) {
		alert("Password need to be 6 or more characters long.");
		return false;
	}

	//check for matching passwords
	if (typeof passconfclass != 'undefined' && !confirmPassword(passconfclass)) {
		alert("Passwords do not match.")
		return false;
	}

	return true;
}

