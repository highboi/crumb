const {app, client, middleware} = require("./configBasic");

app.get("/example", async (req, res) => {
	res.render("example.ejs");
});

app.post("/example", (req, res) => {
	console.log(req.files);

	res.redirect("/example");
});
