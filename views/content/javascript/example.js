document.forms[0].onsubmit = async function(e) {
	e.preventDefault();

	var file = document.getElementById("file").files[0];

	var header = await getFileSignature(file);

	alert(`FILE HEADER: ${header}`);
}
