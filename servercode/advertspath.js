const {app, client, middleware} = require("./configBasic");
const fs = require("fs");
const stripe = require("stripe")(process.env.SECRET_STRIPE_KEY);

/*
GET PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//a get path for a user wanting to register to get paid
app.get("/getpaid", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var user = await client.query(`SELECT customerid, accountid FROM users WHERE id=$1`, [viewObj.user.id]);
	user = user.rows[0];

	if (user.customerid != null && user.accountid != null) {
		req.flash("message", "You have already registered a card for payments. To delete your current card, go to /deletecard. To change your card, delete your card and fill out your information for the new card on /getpaid.");
		return res.redirect("/error");
	}

	viewObj.stripePubKey = process.env.PUBLIC_STRIPE_KEY;

	var customer = await stripe.customers.create();

	var account = await stripe.accounts.create({
		type: "standard"
	});

	var accountlink = await stripe.accountLinks.create({
		account: account.id,
		refresh_url: "http://astro-tv.space/paidonboarding",
		return_url: "http://astro-tv.space/",
		type: "account_onboarding"
	});

	var intent = await stripe.setupIntents.create({
		customer: customer.id
	});

	viewObj.client_secret = intent.client_secret;
	viewObj.customerid = customer.id;
	viewObj.accountid = account.id;
	viewObj.onboarding_url = accountlink.url;

	return res.render("getPaid.ejs", viewObj);
});

//a get path for starting onboaring with a stripe account to accept payouts for ad revenue
app.get("/paidonboarding", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	var account = await client.query(`SELECT accountid FROM users WHERE id=$1`, [user.id]);
	account = account.rows[0];

	var accountlink = await stripe.accountLinks.create({
		account: account.accountid,
		refresh_url: "http://astro-tv.space/paidonboarding",
		return_url: "http://astro-tv.space/",
		type: "account_onboarding"
	});

	res.redirect(accountlink.url);
});

//a get path for deleting a customer and their stripe account
app.get("/deletecard", middleware.checkSignedIn, async (req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	var customer = await client.query(`SELECT customerid, accountid FROM users WHERE id=$1`, [user.id]);
	customer = customer.rows[0];

	if (customer.customerid != null && customer.accountid != null) {
		await stripe.customers.del(customer.customerid);
		await stripe.accounts.del(customer.accountid);

		await client.query(`UPDATE users SET customerid=NULL, accountid=NULL WHERE id=$1`, [user.id]);

		req.flash("message", "Successfully deleted your card.");
		return res.redirect("/");
	} else {
		req.flash("message", "You have not registered your card for payments.");
		return res.redirect("/getpaid");
	}
});

//a get path for submitting advertisements on the site
app.get("/advertise", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	var advertiser = await client.query(`SELECT businessdomain FROM advertisers WHERE id=$1 LIMIT 1`, [viewObj.user.id]);

	if (!advertiser.rows.length) {
		req.flash("message", "Register your account for advertising first.");
		return res.redirect("/registeradvertiser");
	}

	var adResolutions = await middleware.getAdResolutions();

	viewObj = Object.assign({}, viewObj, {adPrice: process.env.IMPRESSION_COST, adResolutions: adResolutions, adDomain: advertiser.rows[0].businessdomain});

	return res.render("adSubmission.ejs", viewObj);
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

	return res.render("adEditor.ejs", viewObj);
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

	return res.render("adRegistration.ejs", viewObj);
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

	return res.render("advertiserEditor.ejs", viewObj);
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

	return res.render("adInfo.ejs", viewObj);
});


//a get path for the accepted ad dimensions
app.get("/addimensions", async (req, res) => {
	var acceptedDimensions = await middleware.getAdResolutions();

	res.send({acceptedDimensions: acceptedDimensions});
});

//a get path for advertisements on the site
app.get("/adverts", async (req, res) => {
	if (typeof req.query.adLimit == "undefined") {
		var adLimit = 1;
	} else {
		var adLimit = req.query.adLimit;
	}

	if (typeof req.query.position == 'undefined') {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id ORDER BY random() LIMIT $1`, [adLimit]);
	} else {
		var adverts = await client.query(`SELECT adverts.*, advertisers.businessdomain FROM adverts INNER JOIN advertisers ON adverts.businessid = advertisers.id WHERE position=$1 ORDER BY random() LIMIT $2`, [req.query.position, adLimit]);
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

		if (req.query.videoid != 'null') {
			var customer = await client.query(`SELECT customerid, accountid FROM users WHERE id IN (SELECT user_id FROM videos WHERE id=$1)`, [req.query.videoid]);
			customer = customer.rows[0];

			if (customer.accountid != null) {
				var transfer = await stripe.transfers.create({
					amount: eval(process.env.IMPRESSION_COST)/2,
					currency: 'usd',
					destination: customer.accountid
				});

				console.log(transfer);
			}
		}
	}
});

//a get path for deleting an advertiser
app.get("/deleteadvertiser", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var adverts = await client.query(`SELECT * FROM adverts WHERE businessid=$1`, [userinfo.id]);
	adverts = adverts.rows[0];

	for (var advert in adverts) {
		await middleware.deleteAdvertDetails(userinfo.id, advert.id);
	}

	var advertiser = await client.query(`SELECT customerid FROM advertisers WHERE id=$1`, [userinfo.id]);
	advertiser = advertiser.rows[0];

	await stripe.customers.del(advertiser.customerid);

	await client.query(`DELETE FROM advertisers WHERE id=$1`, [userinfo.id]);

	req.flash("message", "Successfully deleted advertiser information.");

	return res.redirect("/");
});

//a get path for the cancellation of a subscription
app.get("/advertcancel/:advertid", middleware.checkSignedIn, async (req, res) => {
	var userinfo = await middleware.getUserSession(req.cookies.sessionid);

	var result = await middleware.deleteAdvertDetails(userinfo.id, req.params.advertid);

	if (result) {
		req.flash("message", "Advertisement campaign cancelled/deleted.");
		return res.redirect("/adstats");
	} else {
		req.flash("message", "This is not your advertisement.");
		return res.redirect("/");
	}
});

/*
POST PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//the post path for users registering for payments
app.post("/paymentregistration", middleware.checkSignedIn, async(req, res) => {
	var user = await middleware.getUserSession(req.cookies.sessionid);

	await client.query(`UPDATE users SET customerid=$1, accountid=$2 WHERE id=$3`, [req.body.customerid, req.body.accountid, user.id]);

	res.send({succeeded: true});
});

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

	var price = await stripe.prices.create({
		unit_amount_decimal: eval(process.env.IMPRESSION_COST),
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
		billing_cycle_anchor: (Date.parse(req.body.startDate) / 1000).toFixed(0)
	});

	var newAdId = await middleware.generateAdvertId();
	var adFilePath = await middleware.saveFile(req.files.adImage, "/storage/adverts/");

	var adRes = await middleware.getImgResolution(req.files.adImage);
	adRes = await middleware.getAdResolution(adRes);

	var advertValues = [newAdId, advertiser.id, req.body.businessLink, adFilePath, adRes.position, subscription.id];
	advertValues = advertValues.map((item) => {
		if (typeof item == "string") {
			return "\'" + item + "\'"
		} else {
			return item;
		}
	});

	var advert = await client.query(`INSERT INTO adverts (id, businessid, adlink, adfile, position, subscriptionid) VALUES (${advertValues}) RETURNING id`);

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

		await client.query(`UPDATE adverts SET adfile=$1, position=$2 WHERE id=$3`, [newFilePath, adRes.position, req.body.advertid]);

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
