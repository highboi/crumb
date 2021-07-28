//this is a file for handling request for advertisements on the site

//a function for making a request to the server for ads
async function getAds(amount, platform, position=undefined) {
	//set the fetch url based on if the position needs to be specified
	if (typeof position == 'undefined') {
		var fetchurl = `/adverts/${platform}/?adLimit=${amount}`;
	} else {
		var fetchurl = `/adverts/${platform}/?adLimit=${amount}&position=${position}`;
	}

	//make a fetch request for the adverts
	var advertsResponse = await fetch(fetchurl);

	//get the advertisements in json
	var adverts = await advertsResponse.json();

	//return the advertisements
	return adverts;
}

//a function for making an ad element and adding the source link to it
function createAdElement(link, imgSrc) {
	//create an image element
	var adImg = document.createElement("img");

	//set the image source to the advertisement file
	adImg.src = imgSrc;

	//set the onclick function of the image to redirect to the advertisement url
	adImg.onclick = () => {
		/*
		create an anchor tag and assign the target and href attributes to it
		using Object.assign() and click on the element to redirect the user
		to the advertiser on a new tab
		*/
		Object.assign(document.createElement('a'), {
			target: '_blank',
			href: link
		}).click();
	};

	//return the ad element
	return adImg;
}

//the main function for handling the display of ads
async function mainAdFunction() {
	//check for mobile browsers
	if (navigator.userAgent.toLowerCase().includes("mobile")) {
		var platform = "mobile";
	} else {
		var platform = "desktop";
	}

	//get all of the container divs on the page for adverts
	var adContainers = Array.from(document.querySelectorAll(".adverts"));

	//a variable to store all of the advertisement positions and the amount of elements correspond to these
	var adPositions = {};

	//loop through the ad containers
	for (var container of adContainers) {
		//get the position of this container
		var adPosition = container.dataset.position;

		//increase or set the number of element corresponding with this type of ad
		if (typeof adPositions[adPosition] == 'undefined') {
			adPositions[adPosition] = 1;
		} else {
			adPositions[adPosition] += 1;
		}
	}

	//make an object to contain all of the different ad positions and their corresponding advertisements
	var adverts = {};

	//loop through the positions in the adPositions array
	for (var type of Object.keys(adPositions)) {
		//get ads based on the amount of ads needed for this particular position
		var ads = await getAds(adPositions[type], platform, type);

		//store the advertisements with the position as the key in the adverts object
		adverts[type] = ads;
	}

	//loop through all of the advertisement containers
	for (var container of adContainers) {
		//get the positioning of the advertisement
		var adPosition = container.dataset.position;

		//get the first advertisement object in the array corresponding to the above position
		var targetAd = adverts[adPosition][0];

		//if this advertisement is not undefined
		if (typeof targetAd != 'undefined') {
			//create an ad element with the image and link in the advertisement object
			var adElement = await createAdElement(targetAd.adlink, targetAd.adfile);

			//append this advertisement element to it's container
			container.append(adElement);

			/*
			remove this ad from the front of the array to access the
			next ad in the next iteration of this loop
			*/
			adverts[adPosition].shift()
		}
	}
}


//execute the main ad function
mainAdFunction();
