//get data from a specified url
function getAjaxData(url, callback) {
	//check to see if there is a callback function to call
	if (typeof callback == 'undefined') {
		return;
	}

	//create an xhttp object
	var xhttpTemp = new XMLHttpRequest();

	//set the ready state change function
	xhttpTemp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			try { //try to parse the data as javascript
				//parse the data as javascript
				var data = JSON.parse(this.responseText);
				//send the response text to the callback
				callback(data);
			} catch(e) { //if the data is not JSON parsable, send the raw text to the callback
				//print the error to the console
				console.error(e);
				//send the raw response text to the callback
				callback(this.responseText);
			}
		}
	}

	//open the get request to the server
	xhttpTemp.open("GET", url, true);

	//send the get request to the server
	xhttpTemp.send();
}

//post data to a specific url
function postAjaxData(url, postdata, callback) {
	//check to see if there is a callback function
	if (typeof callback == 'undefined' || typeof postdata == 'undefined') {
		return;
	}

	//create an xhttp object
	var xhttpTemp = new XMLHttpRequest();

	//set the ready state change function
	xhttpTemp.onreadystatechange = function () {
		if (this.readyState == 4 && this.status == 200) {
			try {
				//parse the data as javascript
				var data = JSON.parse(this.responseText);
				//send the response text to the callback
				callback(data);
			} catch(e) {
				//print the error to the console
				console.error(e);
			}
		}
	}

	//fabricate the post request
	xhttpTemp.open("POST", url, true);

	//set a post header for sending data
	xhttpTemp.setRequestHeader("Content-type", "application/x-www-form-urlencoded");

	//create the string to contain the post data
	var poststring = []; //an array
	Object.entries(postdata).forEach((entry) => { //loop through the object entries
		var [key, value] = entry; //get the key-value pair from the entry
		poststring.push(`${key}=${value}`); //push key-value pairs in http format
	});
	poststring = poststring.join("&"); //join string with ampersand

	//send the post data with the request
	xhttpTemp.send(poststring);
}
