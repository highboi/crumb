const {app, client, middleware, redisClient} = require("./configBasic");
const stripe = require("stripe")(process.env.SECRET_STRIPE_KEY);

/*
GET PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

//a get path for submitting advertisements on the site
app.get("/advertise", async (req, res) => {
	//get the ad pricing
	var charge = await middleware.getAdPricing();

	//render the ad submission page
	res.render("adSubmission.ejs", {adPrice: charge});
});

/*
POST PATHS FOR PAYMENTS ON THE SITE WITH STRIPE
*/

/*
//post path for payments on the site
app.post("/adpayment", async (req, res) => {

});
*/
