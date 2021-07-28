const {app, client, middleware, redisClient} = require("./configBasic");
const stripe = require("stripe")(process.env.SECRET_STRIPE_KEY);

/*
GET PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//a get path for submitting advertisements on the site
app.get("/advertise", async (req, res) => {
	//get the ad pricing
	var charge = await middleware.getAdPricing();

	//get the accepted ad resolutions
	var adResolutions = await middleware.getAdResolutions();

	//render the ad submission page
	res.render("adSubmission.ejs", {adPrice: charge, message: req.flash("message"), stripePubKey: process.env.PUBLIC_STRIPE_KEY, adResolutions: adResolutions});
});

//a get path for the stats page of an advert
app.get("/adstats/:advertid", async (req, res) => {
	//get the advertisement from the database
	var advert = await client.query(`SELECT * FROM adverts WHERE id=$1`, [req.params.advertid]);

	//render the stats page for this advertisement
	res.render("adInfo.ejs", {advert: advert.rows[0]});
});

//a get path for the accepted ad dimensions
app.get("/addimensions", async (req, res) => {
	//get all of the accepted ad dimensions
	var acceptedDimensions = await middleware.getAdResolutions();

	//send the complete list of ad dimensions
	res.send({acceptedDimensions: acceptedDimensions});
});

//a get path for advertisements on the site
app.get("/adverts/:type", async (req, res) => {
	//get the type of ad to collect
	var adType = req.params.type;

	//get the limit on the amount of ads to request
	var adLimit = req.query.adLimit;

	//check for the advertisement position specification
	if (typeof req.query.position == 'undefined') {
		//get adverts from the db based on this ad type
		var adverts = await client.query(`SELECT * FROM adverts WHERE type=$1 ORDER BY random() LIMIT $2`, [adType, adLimit]);
	} else {
		//get adverts from the db based on this ad type
		var adverts = await client.query(`SELECT * FROM adverts WHERE type=$1 AND position=$2 ORDER BY random() LIMIT $3`, [adType, req.query.position, adLimit]);
	}

	//send the advertisements back to the front end
	res.send(adverts.rows);
});

/*
POST PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//post path for getting payment data
app.post("/adpayment", async (req, res) => {
	//get the total pricing for this advertisement in pennies
	var adPricing = await middleware.getAdPricing();
	adPricing = (adPricing * 100) * req.body.months;

	//create a payment intent with stripe
	var paymentIntent = await stripe.paymentIntents.create({
		amount: 500,
		currency: 'usd',
		payment_method_types: ['card']
	});

	//create a payment method
	var paymentMethod = await stripe.paymentMethods.create({
		type: 'card',
		card: {
			number: req.body.cardNumber,
			exp_month: req.body.expMonth,
			exp_year: req.body.expYear,
			cvc: req.body.cvcnum
		}
	});

	//send the payment intent id and the payment method to the front-end
	res.send({client_secret: paymentIntent.client_secret, paymentMethod: paymentMethod});
});

//post path for payments on the site
app.post("/adsubmission", async (req, res) => {
	//generate a unique id for this advertisement
	var newAdId = await middleware.generateAdvertId();

	//save the advertisement file to the server and get the path to this file
	var adFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

	//get the date information for the start date of the ad campaign
	var adStartDate = req.body.startDate.split("-");

	//get the start date for this ad campaign
	var adTimestamp = new Date(adStartDate[0], adStartDate[1], adStartDate[2]);

	//get the start date in an ISO timestamp format
	adStartDate = adTimestamp.toISOString();

	//add the amount of months to campaign to the ad timestamp
	adTimestamp.setMonth(adTimestamp.getMonth()+parseInt(req.body.months));

	//get the ending date as an iso string
	var adEndingDate = adTimestamp.toISOString();

	//get the resolution of the advertisement image
	var adRes = await middleware.getImgResolution(req.files.adImage);

	//get the ad resolution with the type of advertisement the image corresponds to
	adRes = await middleware.getAdResolution(adRes);

	//store all of the advertisement values in an array
	var advertValues = [newAdId, req.body.businessLink, adFilePath, req.body.months, adStartDate, adEndingDate, adRes.type, adRes.position];

	//store this advert in the db
	var advert = await client.query(`INSERT INTO adverts (id, adlink, adfile, months, startdate, enddate, type, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, advertValues);

	//return the advertisement to the front end
	res.send({advertId: advert.rows[0].id});
});
