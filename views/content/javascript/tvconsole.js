//onclick function for a custom tv remote channel/button
async function tvCustom() {
	//get the custom value the user wants to search and remove special characters
	var custom_button = document.getElementById("remote").value;
	custom_button = custom_button.replace(/[^a-zA-Z 1234567890]/g, "");

	//redirect the user to a random video based on their custom search
	window.location.href = `/tv/?type=${custom_button}`;
}
