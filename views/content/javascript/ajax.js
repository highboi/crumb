//file for storing ajax-related functions

async function makeRequest(method, url, data=undefined, progressCallback=undefined) {
	//return a promise for this ajax request
	return new Promise(function (resolve, reject) {
		//make a new xhr object with the specified method and url
		let xhr = new XMLHttpRequest();
		xhr.open(method, url);

		//specify a function to handle the loading of data from the response
		xhr.onload = function () {
			if (this.status >= 200 && this.status < 300) {
				resolve({url: xhr.responseURL, text: xhr.responseText, status: xhr.status});
			} else {
				reject({
					status: this.status,
					statusText: xhr.statusText
				});
			}
		};

		//handle errors
		xhr.onerror = function () {
			reject({
				status: this.status,
				statusText: xhr.statusText
			});
		};

		//set the upload progress callback if defined
		if (typeof progressCallback != 'undefined') {
			xhr.onprogress = progressCallback;
		}

		//handle the sending of data with the request
		if (typeof data != 'undefined') {
			xhr.send(data);
		} else {
			xhr.send();
		}
	});
}
