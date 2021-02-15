//this is a file to handle errors such as 404 and 500 errors

const { app, client, redisClient, middleware } = require("./configBasic");

app.use((err, req, res, next) => {
	res.status(err.status || 500);
	if (err.status == 404) {
		res.render("404.ejs");
	}
});
