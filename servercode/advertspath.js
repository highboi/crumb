const {app, client, middleware, redisClient} = require("./configBasic");
const stripe = require("stripe")(process.env.SECRET_STRIPE_KEY);

/*
GET PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//a get path for submitting advertisements on the site
app.get("/advertise", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (!advertiser.rows.length) {
		req.flash("message", "Register your account for advertising first.");
		return res.redirect("/registeradvertiser");
	}

	var charge = await middleware.getAdPricing();

	var adResolutions = await middleware.getAdResolutions();

	viewObj = Object.assign({}, viewObj, {adPrice: charge, stripePubKey: process.env.PUBLIC_STRIPE_KEY, adResolutions: adResolutions, adDomain: advertiser.rows[0].businessdomain});

	res.render("adSubmission.ejs", viewObj);
});

//a get path for the advertiser registration on the site
app.get("/registeradvertiser", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await client.query(`SELECT id FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (advertiser.rows.length) {
		req.flash("message", "This account is already registered for advertising.");
		return res.redirect("/advertise");
	}

	//render the ad registration page
	res.render("adRegistration.ejs", viewObj);
});

//a get path for the stats page of an advert
app.get("/adstats", middleware.checkSignedIn, async (req, res) => {
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);

	var advertiserDomain = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [advertiser.id]);
	advertiserDomain = advertiserDomain.rows[0].businessdomain;

	if (typeof advertiserDomain == 'undefined') {
		req.flash("message", "You are not registered as an advertiser.");
		res.redirect("/");
	}

	var adverts = await client.query(`SELECT * FROM adverts WHERE businessid=$1`, [advertiser.id]);

	res.render("adInfo.ejs", {adverts: adverts.rows, adDomain: advertiserDomain});
});

//a get path for the accepted ad dimensions
app.get("/addimensions", async (req, res) => {
	var acceptedDimensions = await middleware.getAdResolutions();

	res.send({acceptedDimensions: acceptedDimensions});
});

//a get path for advertisements on the site
app.get("/adverts/:platform", async (req, res) => {
	var adPlatform = req.params.platform;

	var adLimit = req.query.adLimit;

	//use an inner join of the "adverts" and "advertisers" tables to add the business domain to the returned data
	if (typeof req.query.position == 'undefined') {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id WHERE type=$1 ORDER BY random() LIMIT $2`, [adPlatform, adLimit]);
	} else {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id WHERE type=$1 AND position=$2 ORDER BY random() LIMIT $3`, [adPlatform, req.query.position, adLimit]);
	}

	res.send(adverts.rows);
});

/*
POST PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//the post path for advertiser registration
app.post("/adregistration", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	await client.query(`INSERT INTO advertisers(id, businessdomain, businessemail) VALUES ($1, $2, $3)`, [user.id, req.body.businessDomain, req.body.businessEmail]);

	res.redirect("/advertise");
});

//post path for getting payment data
app.post("/adpayment", async (req, res) => {
	//get the total pricing in pennies
	var adPricing = await middleware.getAdPricing();
	adPricing = (adPricing * 100) * req.body.months;

	//make a payment intent
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

	res.send({client_secret: paymentIntent.client_secret, paymentMethod: paymentMethod});
});

//post path for payments on the site
app.post("/adsubmission", middleware.checkSignedIn, async (req, res) => {
	var newAdId = await middleware.generateAdvertId();
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);
	var adFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");


	var adStartDate = req.body.startDate.split("-");
	adStartDate = new Date(adStartDate[0], adStartDate[1], adStartDate[2]);
	adStartDate = adStartDate.toISOString();

	//get the resolution of this advertisement along with it's platform and positioning
	var adRes = await middleware.getImgResolution(req.files.adImage);
	adRes = await middleware.getAdResolution(adRes);


	var advertValues = [newAdId, advertiser.id, req.body.businessLink, adFilePath, req.body.months, adStartDate, adRes.type, adRes.position];
	var advert = await client.query(`INSERT INTO adverts (id, businessid, adlink, adfile, months, startdate, type, position) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`, advertValues);

	//schedule the advertisement to expire after the amount of months specified
	adTimestamp.setMonth(adTimestamp.getMonth()+parseInt(req.body.months));
	await middleware.scheduleAdExpiry(adTimestamp, newAdId);


	res.send({advertId: advert.rows[0].id});
});
