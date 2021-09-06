//function for setting a cookie
function setCookie(name, value) {
	//insert this key-value pair into the document.cookie object
	document.cookie = name + "=" + value + ";path=/";
}

//function for getting the value of a cookie
function getCookie(name) {
	/*
	we are searching for the cookie name, meaning we need to clarify
	the = at the end of the name
	*/
	var name = name + "=";

	//decode any URI encoded characters in the list of cookies
	var decodedCookie = decodeURIComponent(document.cookie);

	//make an array of cookie key-pair units
	var cookies = decodedCookie.split(";");

	//search the cookies for a matching name
	for (var cookie of cookies) {
		//trim whitespace in the cookie
		cookie = cookie.trim();

		//if the name of the cookie is at the beginning of this cookie string
		if (cookie.indexOf(name) == 0) {
			/*
			return the cookie value by taking the substring of this cookie
			beginning at the end of the cookie name and ending at the end of the cookie
			*/
			return cookie.substring(name.length, cookie.length);
		}
	}

	//if there is no cookie, return undefined
	return undefined;
}
