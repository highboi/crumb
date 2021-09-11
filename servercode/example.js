const {app, client, middleware} = require("./configBasic");

app.get("/example", async (req, res) => {
	res.render("example.ejs");
});

app.post("/example", async (req, res) => {
	console.log(req.body);

	res.redirect("/example");
});
