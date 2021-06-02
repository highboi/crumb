//a JS file to store functions which manage files on the server

//import modules to handle files and media
const fs = require("fs");
const ffmpeg = require("ffmpeg");

//object to store the media handling functions
var mediaFunctions = {
	//this is a function for saving a file onto the server based on a file object
	saveFile: function (file, path) {
		//get the complete filepath according to the root of the filesystem
		var completepath = global.appRoot + path + Date.now() + "-" + file.name;

		//write the file and save it to the path on the server
		fs.writeFile(completepath, file.data, (err) => {
		        if (err) throw err;
		});

		//return the path with the global root removed from it along with "/storage" for it to be accessible from the front-end
		return completepath.replace(global.appRoot, "").replace("/storage", "");
	},

	//this is a function for saving/copying videos to different resolutions using ffmpeg
	changeResolution: async function (videopath, width, height) {
		//begin an ffmpeg process with the given video path
		var process = new ffmpeg(videopath);

		//callback functions for the ffmpeg process
		process.then((video) => {
			//get the full desired resolution as a string
			var resString = width.toString() + "x" + height.toString();

			//convert the video to a different resolution
			video.setVideoSize(resString, true, false);

			//create a new video file path to save the new resolution to
			var newPath = videopath.replace(".mp4", `${resString}.mp4`);

			//save the video file
			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Video File:", file);
				}
			});
		}, (err) => { //catch any errors with the ffmpeg process
			console.log("Error:", err);
		});
	}
};

//export the object with the functions
module.exports = mediaFunctions;
