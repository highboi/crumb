/*
THIS IS A FILE FOR STORING PATHS THAT DO DATA FUSION OF DATABASES
*/

const {app, client, middleware} = require("./configBasic");

app.get("/fusor", middleware.checkSignedIn, async (req, res) => {
	var viewObj = await middleware.getViewObj(req, res);

	return res.render("fusor.ejs", viewObj)
});
