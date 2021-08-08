//this is a file for handling request for advertisements on the site

//a function for making a request to the server for ads
async function getAds(amount, platform, position=undefined) {
	//set the fetch url based on if the position needs to be specified
	if (typeof position == 'undefined') {
		var fetchurl = `/adverts/${platform}/?adLimit=${amount}`;
	} else {
		var fetchurl = `/adverts/${platform}/?adLimit=${amount}&position=${position}`;
	}

	//get the advertisements from the fetch url
	var advertsResponse = await fetch(fetchurl);
	var adverts = await advertsResponse.json();

	return adverts.adverts;
}

//a function for making an ad element and adding the source link to it
function createAdElement(link, imgSrc) {
	var adImg = document.createElement("img");

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

	var closeBtn = document.createElement("span");

	closeBtn.setAttribute("class", "closeBtnAds");

	closeBtn.innerHTML = "x";

	//set the onclick function to make the parent node invisible (close the ad)
	closeBtn.addEventListener("click", (event) => {
		console.log(event.target.parentNode.style);
		event.target.parentNode.style.display = "none";
	});

	//make the final ad element
	var containerDiv = document.createElement("div");
	containerDiv.appendChild(adImg);
	containerDiv.appendChild(closeBtn);

	return containerDiv;
}

//the main function for handling the display of ads
async function mainAdFunction() {
	if (navigator.userAgent.toLowerCase().includes("mobile")) {
		var platform = "mobile";
	} else {
		var platform = "desktop";
	}

	var adContainers = Array.from(document.querySelectorAll(".adverts"));

	//a variable to store all of the advertisement positions and the amount of elements correspond to these
	var adPositions = {};

	for (var container of adContainers) {
		var adPosition = container.dataset.position;

		//increase or set the number of elements corresponding with this type of positioning
		if (typeof adPositions[adPosition] == 'undefined') {
			adPositions[adPosition] = 1;
		} else {
			adPositions[adPosition] += 1;
		}
	}

	//make an object to contain all of the different ad positions and their corresponding advertisements
	var adverts = {};

	for (var type of Object.keys(adPositions)) {
		//get ads based on the amount of ads needed for this particular position
		var ads = await getAds(adPositions[type], platform, type);

		//store the advertisements with the position as the key in the adverts object
		adverts[type] = ads;
	}

	for (var container of adContainers) {
		var adPosition = container.dataset.position;

		var targetAd = adverts[adPosition][0];

		if (typeof targetAd != 'undefined') {
			var adElement = await createAdElement(targetAd.businessdomain+targetAd.adlink, targetAd.adfile);

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
