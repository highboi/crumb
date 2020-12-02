//get the search bar element
var searchbar = document.getElementById("searchquery");

function getSearchReccomendations() {
	var xhttp = new XMLHttpRequest();

	xhttp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			console.log(this.responseText);
		}
	};

	var searchquery = searchbar.value.split(" ").join("+");

	xhttp.open("GET", `/getsearch/?searchquery=${searchquery}`, true);
	xhttp.send();
}
