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

	var customer = await stripe.customers.create();

	var intent = await stripe.setupIntents.create({
		customer: customer.id
	});

	viewObj.client_secret = intent.client_secret;
	viewObj.customerid = customer.id;

	res.render("adRegistration.ejs", viewObj);
});

//a get path for the editing of advertiser information
app.get("/advertiserEditor/:businessid", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	if (viewObj.user.id != req.params.businessid) {
		req.flash("You cannot edit other advertiser's information.");
		return res.redirect("/");
	}

	var advertiser = await client.query(`SELECT customerid, businessdomain, businessemail FROM advertisers WHERE id=$1 LIMIT 1`, [req.params.businessid]);

	if (!advertiser.rows.length) {
		req.flash("message", "This advertiser does not exist.");
		return res.redirect("/");
	}

	advertiser = advertiser.rows[0];

	var paymentMethod = await stripe.paymentMethods.list({
		customer: advertiser.customerid,
		type: "card"
	});
	paymentMethod = paymentMethod.data[0];

	viewObj = Object.assign({}, viewObj, {customerid: advertiser.customerid, stripePubKey: process.env.PUBLIC_STRIPE_KEY, paymentMethod: paymentMethod, businessEmail: advertiser.businessemail, businessDomain: advertiser.businessdomain});

	res.render("advertiserEditor.ejs", viewObj);
});

//a get path for the stats page of an advert
app.get("/adstats", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiserDomain = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (!advertiserDomain.rows.length) {
		req.flash("message", "You are not registered as an advertiser.");
		return res.redirect("/registeradvertiser");
	}

	advertiserDomain = advertiserDomain.rows[0].businessdomain;

	var adverts = await client.query(`SELECT * FROM adverts WHERE businessid=$1`, [viewObj.user.id]);

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

	if (typeof req.query.position == 'undefined') {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id WHERE type=$1 ORDER BY random() LIMIT $2`, [adPlatform, adLimit]);
	} else {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id WHERE type=$1 AND position=$2 ORDER BY random() LIMIT $3`, [adPlatform, req.query.position, adLimit]);
	}

	res.send({adverts: adverts.rows});

	for (var ad of adverts.rows) {
		var data = await client.query(`UPDATE adverts SET impressions=impressions+1 WHERE id=$1 RETURNING impressions, subscriptionid`, [ad.id]);
		data = data.rows[0];

		var subscription = await stripe.subscriptions.retrieve(data.subscriptionid);

		var subscriptionItemId = subscription.items.data[0].id

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

//a get path for the cancellation of a subscription
app.get("/advertcancel/:advertid", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	var result = await middleware.deleteAdvertDetails(user, req.params.advertid);

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

	var valuesarr = [user.id, req.body.customerid, req.body.businessDomain, req.body.businessEmail];
	valuesarr = valuesarr.map((item) => {
		if (typeof item == "string") {
			return "\'" + item + "\'"
		} else {
			return item;
		}
	});

	await client.query(`INSERT INTO advertisers(id, customerid, businessdomain, businessemail) VALUES (${valuesarr})`);

	res.send({succeeded: true});
});

//post path for payments on the site
app.post("/adsubmission", middleware.checkSignedIn, async (req, res) => {
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);
	var customerid = await client.query(`SELECT customerid FROM advertisers WHERE id=$1 LIMIT 1`, [advertiser.id]);

	if (!customerid.rows.length) {
		req.flash("message", "You are not registered for advertising, please register.");
		return res.redirect("/registeradvertiser");
	}

	customerid = customerid.rows[0].customerid;

	var paymentMethod = await stripe.paymentMethods.list({
		customer: customerid,
		type: "card"
	});
	paymentMethod = paymentMethod.data[0];

	//cost of one ad impression in pennies
	var impression_cost = 50/1000;

	var price = await stripe.prices.create({
		unit_amount_decimal: impression_cost,
		currency: "usd",
		recurring: {
			interval: "month",
			usage_type: "metered"
		},
		product_data: {
			name: "Ad subscription"
		}
	});

	var subscription = await stripe.subscriptions.create({
		customer: customerid,
		items: [
			{price: price.id}
		],
		default_payment_method: paymentMethod.id,
		billing_cycle_anchor: req.body.startDate
	});

	var newAdId = await middleware.generateAdvertId();
	var adFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

	var adRes = await middleware.getImgResolution(req.files.adImage);
	adRes = await middleware.getAdResolution(adRes);

	var advertValues = [newAdId, advertiser.id, req.body.businessLink, adFilePath, adRes.type, adRes.position, subscription.id];
	advertValues = advertValues.map((item) => {
		if (typeof item == "string") {
			return "\'" + item + "\'"
		} else {
			return item;
		}
	});

	var advert = await client.query(`INSERT INTO adverts (id, businessid, adlink, adfile, type, position, subscriptionid) VALUES (${advertValues}) RETURNING id`);

	res.send({advertId: advert.rows[0].id});
});


//a post url for edits to advertisements
app.post("/adedit", middleware.checkSignedIn, async (req, res) => {
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);

	var oldAdvert = await client.query(`SELECT adlink, adfile FROM adverts WHERE id=$1 AND businessid=$2 LIMIT 1`, [req.body.advertid, advertiser.id]);

	if (!oldAdvert.rows.length) {
		req.flash("message", "This is not your advertisement to edit.");
		return res.redirect("/");
	}

	oldAdvert = oldAdvert.rows[0];

	if (oldAdvert.adlink != req.body.businessLink) {
		await client.query(`UPDATE adverts SET adlink=$1 WHERE id=$2`, [req.body.businessLink, req.body.advertid]);
	}

	if (typeof req.files.adImage != 'undefined') {
		var newFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

		var adRes = await middleware.getImgResolution(req.files.adImage);
		adRes = await middleware.getAdResolution(adRes);

		await client.query(`UPDATE adverts SET adfile=$1, type=$2, position=$3 WHERE id=$4`, [newFilePath, adRes.type, adRes.position, req.body.advertid]);

		var oldPath = global.appRoot + "/storage" + oldAdvert.adfile;
		fs.unlink(oldPath, (err) => {
			if (err) throw err;
		});
	}

	res.send({recieved: true});
});

//a post url for edits to advertisers
app.post("/advertiseredit", middleware.checkSignedIn, async (req, res) => {
	var advertiser = await middleware.getUserSession(req.cookies.sessionid);

	var oldBusiness = await client.query(`SELECT customerid, businessdomain, businessemail FROM advertisers WHERE id=$1 LIMIT 1`, [advertiser.id]);

	if (!oldBusiness.rows.length) {
		req.flash("message", "You are not registered for advertising, please register first.");
		return res.redirect("/registeradvertiser");
	}

	oldBusiness = oldBusiness.rows[0];

	if (oldBusiness.businessemail != req.body.businessEmail) {
		await client.query(`UPDATE advertisers SET businessemail=$1 WHERE id=$2`, [req.body.businessEmail, advertiser.id]);
	}

	if (oldBusiness.businessdomain != req.body.businessDomain) {
		await client.query(`UPDATE advertisers SET businessdomain=$1 WHERE id=$2`, [req.body.businessDomain, advertiser.id]);
	}

	if (typeof req.body.paymentMethod != 'undefined') {
		await stripe.paymentMethods.attach(
			req.body.paymentMethod,
			{customer: oldBusiness.customerid}
		);

		var oldPaymentMethod = await stripe.paymentMethods.list({
			customer: oldBusiness.customerid,
			type: "card"
		});
		oldPaymentMethod = oldPaymentMethod.data[0];

		await stripe.paymentMethods.detach(oldPaymentMethod.id);
	}

	res.send({recieved: true});
});
