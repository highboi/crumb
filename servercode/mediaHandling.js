//a JS file to store functions which manage files on the server

const fs = require("fs");
const ffmpeg = require("ffmpeg");
const path = require("path");
const client = require("./dbConfig");
const {default: srtParser2} = require("srt-parser-2");
const sizeOfImage = require("image-size");

var mediaFunctions = {
	//this is a function for saving a file onto the server based on a file object
	saveFile: function (file, path) {
		var completepath = global.appRoot + path + Date.now() + "-" + file.name;

		fs.writeFile(completepath, file.data, (err) => {
		        if (err) throw err;
		});

		return completepath.replace(global.appRoot, "").replace("/storage", "");
	},

	//this is a function for deleting a file from the server
	deleteFile: function (filepath) {
		var completepath = global.appRoot + filepath;

		fs.unlink(completepath, (err) => {
			if (err) throw err;
		});

		return true;
	},

	//this is a function for saving/copying videos to different resolutions using ffmpeg
	changeVideoResolution: async function (videopath, width, height) {
		var process = new ffmpeg(videopath);

		process.then((video) => {
			var resString = Math.floor(width).toString() + "x" + height.toString();

			video.setVideoSize(resString, true, false);

			//replace the extension with a resolution string and the extension once again: (WIDTHxHEIGHT).mp4
			var newPath = videopath.replace(/\..*/, `(${height.toString() + "p"})${path.extname(videopath)}`);

			//surround with quotes to avoid problems with parenthesis
			newPath = "\'" + newPath + "\'";

			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Resolution Video File:", file);
				}
			});
		}, (err) => {
			console.log("Error changing video resolution:", err);
		});
	},

	//this is a function for changing the format of a video file to save on the server using ffmpeg
	changeVideoFormat: async function (videopath, format) {
		var process = new ffmpeg(videopath);

		process.then((video) => {
			video.setVideoFormat(format);

			var newPath = videopath.replace(/\..*/, `.${format}`);

			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Format Video File:", file);
				}
			});
		}, (err) => {
			console.log("Error changing video format:", err);
		});
	},

	//this is a function to get the metadata for a video file using ffmpeg
	getVideoMetadata: async function (videopath) {
		var process = new ffmpeg(videopath);

		var video = await process;

		return video.metadata;
	},

	//this is a function to create default video resolutions for a video file we need
	getVideoPermutations: async function (videopath) {
		var defaultHeights = [144, 240, 360, 480, 720, 1080, 1440, 2160];

		var metadata = await mediaFunctions.getVideoMetadata(videopath);

		var currentRes = metadata.video.resolution;

		//get all of the heights below the original height (ie 480p and under)
		var currentIndex = defaultHeights.indexOf(currentRes.h);
		var heights = defaultHeights.slice(0, currentIndex+1);

		heights.forEach((height, index) => {
			var calculatedwidth = height * (16/9);

			mediaFunctions.changeVideoResolution(videopath, calculatedwidth, height);
		});

		var relativepath = videopath.split("/storage")[1];
		await client.query(`UPDATE videofiles SET resolution=$1 WHERE video=$2`, [JSON.stringify(heights), relativepath]);
	},

	//this is a function which reads the subtitles from an SRT file and returns an array
	getSubtitles: function (filepath) {
		var fileContents = fs.readFileSync(filepath).toString();

		var parser = new srtParser2();

		var result = parser.fromSrt(fileContents);

		return result;
	},

	//a function for getting the resolution of an image based on the image data
	getImgResolution: async function(img) {
		var imgDimensions = sizeOfImage(img.data);

		return imgDimensions;
	}
};

module.exports = mediaFunctions;
