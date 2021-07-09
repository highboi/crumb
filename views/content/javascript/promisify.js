// this is a script for storing functions that help with making things work with async/await stuff

//a function for promisifying a function (returns a promise)
function promisify(callbackFunction) {
	//return a wrapper function. the ...args is simply a placeholder for whatever parameters are given to it
	return function (...args) {
		//return a promise
		return new Promise((resolve, reject) => {
			//create a function which resolves the promise in the form of a callback
			function callback(err, result) {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			}

			//push the callback function to the arguments of this wrapper function
			args.push(callback);

			//call the original function with .call() in order to have the wrapper function use the original function as it's own method
			//and then pass the arguments given as well
			callbackFunction.call(this, ...args);
		});
	}
}
