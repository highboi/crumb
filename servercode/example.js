const {app} = require("./configBasic");

app.get("/example", (req, res) => {
	res.render("example.ejs");
});
