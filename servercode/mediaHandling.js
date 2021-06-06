//a JS file to store functions which manage files on the server

//import modules to handle files and media
const fs = require("fs");
const ffmpeg = require("ffmpeg");
const path = require("path");

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
	changeVideoResolution: async function (videopath, width, height) {
		//begin an ffmpeg process with the given video path
		var process = new ffmpeg(videopath);

		//callback functions for the ffmpeg process
		process.then((video) => {
			//get the full desired resolution as a string
			var resString = width.toString() + "x" + height.toString();

			//convert the video to a different resolution
			video.setVideoSize(resString, true, false);

			//create a new video file path to save the new resolution to
			var newPath = videopath.replace(".mp4", `(${resString}).mp4`);

			//add quotes to the string to accomodate the parenthesis
			newPath = "\'" + newPath + "\'";

			//save the video file
			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Resolution Video File:", file);
				}
			});
		}, (err) => { //catch any errors with the ffmpeg process
			console.log("Error changing video resolution:", err);
		});
	},

	//this is a function for changing the speed of a video file and saving a copy using ffmpeg
	changeVideoSpeed: async function (videopath, speed) {
		//begin an ffmpeg process for the given video path
		var process = new ffmpeg(videopath);

		//callback functions for the ffmpeg process
		process.then((video) => {
			/*
			get the calculation for the number to change the PTS (presentation timestamp) of each frame of video, this is
			calculated as a reciprocal as this is the number used to reduce the time between frames of video. If the desired
			speed is x2, then 1/2=0.5 and dividing the PTS of each frame of video in half speeds up the video by a factor of
			2, thus achieving the desired effect of changing the speed. In the same way, the reciprocal of 0.5 is 2 and thus
			the time between frames is doubled, thus making the video half as fast or two times as slow
			*/
			var newPTS = 1 / speed;

			//add a custom command to set the presentation timestamp of each frame of the video
			video.addCommand("-vf", `setpts=${newPTS}*PTS`);

			if (speed >= 0.5 && speed <= 2) {
				//add a custom command to set the audio tempo to a new speed
				video.addCommand("-af", `atempo=${speed}`);
			} else {
				/*
				get the factors or divisors of the speed depending on it being greater/equal to or less than 1.
				this is done because the "atempo" parameter cannot accept numbers less than 0.5 or more than 2,
				and thus this parameter must be repeated in order to properly change the speed to something lower
				than 0.5 or higher than 2
				*/
				var arr = mediaFunctions.getFactors(speed, 2, 0.5, 2);

				/*
				get the full "atempo" parameter string in order to properly change the audio speed with multiple
				"atempo" parameters to compensate for the original speed being too large or small
				*/
				var atempoString = `atempo=${arr[0]},`.repeat(arr.length);
				atempoString = atempoString.substring(0, atempoString.length-1);

				//add a custom command to set the audio tempo to a new speed
				video.addCommand("-af", atempoString);
			}

			//create a new video file path to save the video to
			var newPath = videopath.replace(/\..*/, `(x${speed})${path.extname(videopath)}`);

			//add quotes to the strong to accomodate the parenthesis
			newPath = "\'" + newPath + "\'";

			//save the video with the new speed
			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Speed Video File:", file);
				}
			});
		}, (err) => { //catch errors with the ffmpeg process
			console.log("Error changing video speed:", err);
		});
	},

	//this is a function for changing the format of a video file to save on the server using ffmpeg
	changeVideoFormat: async function (videopath, format) {
		//create a new ffmpeg process
		var process = new ffmpeg(videopath);

		//callback functions for handling the video
		process.then((video) => {
			//change the video format according to the parameter specified
			video.setVideoFormat(format);

			//create the new path to save the video file by replacing the extention with the new format
			var newPath = videopath.replace(/\..*/, `.${format}`);

			//save the video to the new video path
			video.save(newPath, (file, error) => {
				if (!error) {
					console.log("New Format Video File:", file);
				}
			});
		}, (err) => { //catch errors with the ffmpeg process
			console.log("Error changing video format:", err);
		});
	},

	//this is a function which gets the factors for a number that fall within a certain range. the function finds a factor that falls within a certain range and also
	//finds the factor that can be used to get the original number provided to the function
	getFactors: function(num, changenum, numfloor, numceil, prevchangenum=undefined, orignum=undefined) {
		//make sure the original number given to the function is defined
		if (typeof orignum == 'undefined') {
			orignum = num;
		}

		//change the factor to a new factor based on the original number being 1 >= or 1 <
		if (orignum >= 1) {
			var newnum = num / changenum;
		} else if (orignum < 1) {
			var newnum = num * changenum;
		}

		//if the number is within the range specified, return the final array of values
		if (newnum >= numfloor && newnum <= numceil) {
			//set the previous divisor value to the current one if it is undefined
			if (typeof prevchangenum == 'undefined') {
				prevchangenum = changenum;
			}

			//create an array with a length based on the previous divisor minus 1 and fill it with the new small number
			var factorArr = new Array(prevchangenum-1).fill(newnum);

			//return the final array
			return factorArr;
		} else { //if the new number does not fall within the range specified, go through another iteration
			return mediaFunctions.getFactors(newnum, changenum, numfloor, numceil, changenum**2, orignum);
		}
	},

	//this is a function to get the metadata for a video file using ffmpeg
	getVideoMetadata: async function (videopath) {
		//start a new ffmpeg process with this video
		var process = new ffmpeg(videopath);

		//get the video object after the process is done getting the video information
		var video = await process;

		//return the video metadata
		return video.metadata;
	},

	//this is a function to create default video resolutions and speeds for a video file we need
	getVideoPermutations: async function (videopath) {
		//create arrays for all of the default settings we want to make
		var defaultSpeeds = [0.25, 0.5, 0.75, 1.25, 1.5, 1.75, 2];
		var defaultWidths = [256, 426, 480, 640, 1280, 1920, 2560, 3840];
		var defaultHeights = [144, 240, 360, 480, 720, 1080, 1440, 2160];

		//get the metadata for the video
		var metadata = await mediaFunctions.getVideoMetadata(videopath);

		//get the current resolution
		var currentRes = metadata.video.resolution;

		//get the index of the pixel heights array which matches the current resolution
		var currentIndex = defaultHeights.indexOf(currentRes.h);

		//get the widths and heights to process by slicing the arrays for the pixel widths and heights
		var widths = defaultWidths.slice(0, currentIndex);
		var heights = defaultHeights.slice(0, currentIndex);

		//loop through the widths and heights in order to get all permutations of the video with different resolutions
		widths.forEach((width, index) => {
			//call the function to get the new permutation with the new resolution
			mediaFunctions.changeVideoResolution(videopath, width, heights[index]);
		});

		//loop through all of the default speeds to create permutations for the video at new speeds
		defaultSpeeds.forEach((speed, index) => {
			mediaFunctions.changeVideoSpeed(videopath, speed);
		});
	}
};

//this is the path to the test file to test these functions on
var testpath = global.appRoot + "/storage/test/nyan.mp4";

//export the object with the functions
module.exports = mediaFunctions;
