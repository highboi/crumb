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
	} else { //if the passwords have the same value, then let the user know everything is good
		alertTag.innerHTML = "Passwords Match!";
		alertTag.style.color = "#adff12";
	}
}
