const {app, client, middleware} = require("./configBasic");
const fs = require("fs");
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

	var adResolutions = await middleware.getAdResolutions();

	viewObj = Object.assign({}, viewObj, {adPrice: 0.5, adResolutions: adResolutions, adDomain: advertiser.rows[0].businessdomain});

	res.render("adSubmission.ejs", viewObj);
});

//a get path for editing an advertisement
app.get("/adEditor/:advertid", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (!advertiser.rows.length) {
		req.flash("message", "Register your account for advertising first.");
		return res.redirect("/registeradvertiser");
	}

	var adData = await client.query(`SELECT * FROM adverts WHERE id=$1 AND businessid=$2 LIMIT 1`, [req.params.advertid, viewObj.user.id]);

	if (!adData.rows.length) {
		req.flash("message", "Not your advertisement to edit.");
		return res.redirect("/");
	}

	var adResolutions = await middleware.getAdResolutions();

	viewObj = Object.assign({}, viewObj, {advert: adData.rows[0], adDomain: advertiser.rows[0].businessdomain, adResolutions: adResolutions});

	res.render("adEditor.ejs", viewObj);
});

//a get path for the advertiser registration on the site
app.get("/registeradvertiser", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await client.query(`SELECT id FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (advertiser.rows.length) {
		req.flash("message", "This account is already registered for advertising.");
		return res.redirect("/advertise");
	}

	viewObj.stripePubKey = process.env.PUBLIC_STRIPE_KEY;

	//make a stripe customer
	var customer = await stripe.customers.create();

	//create a setup intent which sets the customer up for an attached card for charging
	var intent = await stripe.setupIntents.create({
		customer: customer.id
	});

	//attach these to send back to the server once the POST request is sent so we have a customer that can be charged
	viewObj.client_secret = intent.client_secret;
	viewObj.customerid = customer.id;

	res.render("adRegistration.ejs", viewObj);
});

//a get path for the stats page of an advert
app.get("/adstats", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await middleware.getUserSession(req.cookies.sessionid);

	var advertiserDomain = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [advertiser.id]);
	advertiserDomain = advertiserDomain.rows[0].businessdomain;

	if (typeof advertiserDomain == 'undefined') {
		req.flash("message", "You are not registered as an advertiser.");
		res.redirect("/");
	}

	var adverts = await client.query(`SELECT * FROM adverts WHERE businessid=$1`, [advertiser.id]);

	viewObj = Object.assign({}, viewObj, {adverts: adverts.rows, adDomain: advertiserDomain});

	res.render("adInfo.ejs", viewObj);
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

	//send the advertisements before doing anything else
	res.send({adverts: adverts.rows});

	/*
	THE BELOW CODE WILL INCREASE THE UNIT AMOUNT FOR EACH AD IN THE BACKGROUND WITHOUT HAVING A SLOW URL
	*/

	//increase the impression count on each advertisement
	for (var ad of adverts.rows) {
		var data = await client.query(`UPDATE adverts SET impressions=impressions+1 WHERE id=$1 RETURNING impressions, subscriptionid`, [ad.id]);
		data = data.rows[0];

		//get the subscription for this ad
		var subscription = await stripe.subscriptions.retrieve(data.subscriptionid);

		//get the subscription item id of this subscription
		var subscriptionItemId = subscription.items.data[0].id

		/*
		set the usage record at the start time of this current subscription period
		to be set according to the amount of impressions calculated. we set the
		usage record instead of creating a new one as to not create thousands
		of unnecessary usage records
		*/
		var usageRecord = await stripe.subscriptionItems.createUsageRecord(
			subscriptionItemId,
			{
				quantity: data.impressions,
				timestamp: subscription.current_period_start,
				action: "set"
			}
		);
	}
});

//get path for a one-time payment
app.get("/adpayment", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	var customerid = await client.query(`SELECT customerid FROM advertisers WHERE id=$1 LIMIT 1`, [user.id]);
	customerid = customerid.rows[0].customerid;

	//get the payment methods of this customer
	var paymentMethods = await stripe.paymentMethods.list({
		customer: customerid,
		type: "card"
	});

	//get the payment method id
	var paymentMethod = paymentMethods.data[0];

	//create a payment intent
	var paymentIntent = await stripe.paymentIntents.create({
		amount: 500,
		currency: 'usd',
		payment_method_types: ["card"],
		customer: customerid
	});

	//send the intent client secret and the payment method of the customer
	res.send({client_secret: paymentIntent.client_secret, paymentMethod: paymentMethod});
});

//a get path for the cancellation of a subscription
app.get("/advertcancel/:advertid", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	//delete the advertisement details and get the result/status of the deletion
	var result = await middleware.deleteAdvertDetails(user, req.params.advertid);

	//check to see if the advertisement deletion was valid
	if (result) {
		req.flash("message", "Advertisement campaign cancelled/deleted.");
		res.redirect("/adstats");
	} else {
		req.flash("message", "This is not your advertisement.");
		res.redirect("/");
	}
});

/*
POST PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//the post path for advertiser registration
app.post("/adregistration", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	await client.query(`INSERT INTO advertisers(id, customerid, businessdomain, businessemail) VALUES ($1, $2, $3, $4)`, [user.id, req.body.customerid, req.body.businessDomain, req.body.businessEmail]);

	res.send({succeeded: true});
});

//post path for payments on the site
app.post("/adsubmission", middleware.checkSignedIn, async (req, res) => {
	//get the stripe customer id
	var user = await middleware.getUserSession(req.cookies.sessionid);
	var customerid = await client.query(`SELECT customerid FROM advertisers WHERE id=$1 LIMIT 1`, [user.id]);
	customerid = customerid.rows[0].customerid

	//get the payment method associated with the customer
	var paymentMethod = await stripe.paymentMethods.list({
		customer: customerid,
		type: "card"
	});
	paymentMethod = paymentMethod.data[0];

	//make a variable to calculate the total cost of one ad impression in pennies (50 pennies per 1000 impressions)
	var impression_cost = 50/1000;

	//create a price object to charge the user
	var price = await stripe.prices.create({
		unit_amount_decimal: impression_cost,
		currency: "usd",
		recurring: {
			interval: "month",
			usage_type: "metered" //this makes the price metered based on reported usage
		},
		product_data: {
			name: "Ad subscription"
		}
	});

	//make the subscription for this advertisement
	var subscription = await stripe.subscriptions.create({
		customer: customerid,
		items: [
			{price: price.id}
		],
		default_payment_method: paymentMethod.id,
		billing_cycle_anchor: req.body.startDate
	});

	var newAdId = await middleware.generateAdvertId();
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);
	var adFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

	//get the resolution of this advertisement along with it's platform and positioning
	var adRes = await middleware.getImgResolution(req.files.adImage);
	adRes = await middleware.getAdResolution(adRes);

	var advertValues = [newAdId, advertiser.id, req.body.businessLink, adFilePath, adRes.type, adRes.position, subscription.id];
	var advert = await client.query(`INSERT INTO adverts (id, businessid, adlink, adfile, type, position, subscriptionid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`, advertValues);

	res.send({advertId: advert.rows[0].id});
});


//a post url for edits to advertisements
app.post("/adedit", middleware.checkSignedIn, async (req, res) => {
	var oldAdvert = await client.query(`SELECT adlink, adfile FROM adverts WHERE id=$1 LIMIT 1`, [req.body.advertid]);
	oldAdvert = oldAdvert.rows[0];

	//update the ad link if necessary
	if (oldAdvert.adlink != req.body.businessLink) {
		await client.query(`UPDATE adverts SET adlink=$1 WHERE id=$2`, [req.body.businessLink, req.body.advertid]);
	}

	//handle a new image if necessary
	if (typeof req.files.adImage != 'undefined') {
		//save the new image
		var newFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

		//get the position and type of this advertisement
		var adRes = await middleware.getImgResolution(req.files.adImage);
		adRes = await middleware.getAdResolution(adRes);

		//update the image link for this ad
		await client.query(`UPDATE adverts SET adfile=$1, type=$2, position=$3 WHERE id=$4`, [newFilePath, adRes.type, adRes.position, req.body.advertid]);

		//delete the old image
		var oldPath = global.appRoot + "/storage" + oldAdvert.adfile;
		fs.unlink(oldPath, (err) => {
			if (err) throw err;
		});
	}

	res.send({recieved: true});
});

