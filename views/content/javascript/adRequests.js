//this is a file for handling request for advertisements on the site

//a function for making a request to the server for ads
async function getAds(amount, position=undefined) {
	//set the fetch url based on if the position needs to be specified
	if (typeof position == 'undefined') {
		var fetchurl = `/adverts/?adLimit=${amount}`;
	} else {
		var fetchurl = `/adverts/?adLimit=${amount}&position=${position}`;
	}

	//get the advertisements from the fetch url
	var advertsResponse = await fetch(fetchurl);

	var adverts = await advertsResponse.json();

	return adverts.adverts;
}

//a function for making an ad element and adding the source link to it
function createAdElement(link, imgSrc) {
	//make an image element
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

	//make a close button for the ad
	var closeBtn = document.createElement("span");
	closeBtn.setAttribute("class", "closeBtnAds");
	closeBtn.innerHTML = "x";

	//set the onclick function to make the parent node invisible (close the ad)
	closeBtn.addEventListener("click", (event) => {
		console.log(event.target.parentNode.style);
		event.target.parentNode.style.display = "none";
	});

	//wrap the ad in a container div
	var containerDiv = document.createElement("div");
	containerDiv.appendChild(adImg);
	containerDiv.appendChild(closeBtn);

	return containerDiv;
}

//the main function for handling the display of ads
async function mainAdFunction() {
	//get all advertisement containers on the site
	var adContainers = Array.from(document.querySelectorAll(".adverts"));

	//a variable to store all of the advertisement positions and the amount of elements correspond to these
	var adPositions = {};

	//store the key-value pairs of the position and amount of ads required for this position
	for (var container of adContainers) {
		var adPosition = container.dataset.position;

		if (typeof adPositions[adPosition] == 'undefined') {
			adPositions[adPosition] = 1;
		} else {
			adPositions[adPosition] += 1;
		}
	}

	//make an object to contain all of the different ad positions and their corresponding advertisements
	var adverts = {};

	//store the key-value pairs of ad positions and the ads associated with these positionings
	for (var position of Object.keys(adPositions)) {
		var ads = await getAds(adPositions[position], position);

		adverts[position] = ads;
	}

	//insert elements containing the advertisement data into the ad containers
	for (var container of adContainers) {
		var adPosition = container.dataset.position;
		var targetAd = adverts[adPosition][0];

		if (typeof targetAd != 'undefined') {
			//get the ad element, insert it into it's container, and remove it from the advertisement object
			var adElement = await createAdElement(targetAd.businessdomain+targetAd.adlink, targetAd.adfile);
			container.append(adElement);
			adverts[adPosition].shift()
		}
	}
}


//execute the main ad function
mainAdFunction();
