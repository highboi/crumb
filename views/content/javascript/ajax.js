//get data from a specified url
function getAjaxData(url, callback) {
	//check to see if there is a callback function to call
	if (typeof callback == undefined) {
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

	//open the get request to the server
	xhttpTemp.open("GET", url, true);

	//send the get request to the server
	xhttpTemp.send();
}
