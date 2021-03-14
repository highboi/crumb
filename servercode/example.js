const {app, client} = require("./configBasic");

app.get("/example", async (req, res) => {
	var result = await client.query("SELECT EXISTS(SELECT * FROM users)");

	res.render("example.ejs", {result: result.rows});
});
