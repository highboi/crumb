//function for confirming a redirect before redirecting a user
function redirectConfirm(confirmPrompt, link) {
	if (confirm(confirmPrompt)) {
		window.location.href = link;
	}
}
