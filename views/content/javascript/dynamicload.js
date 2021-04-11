//this is a script which handles dynamic loading for comments and other large data sets
//that cannot be loaded into EJS without lots of time (reduces loading time while increasing
//the efficiency, nothing is loaded that is not seen/needed by the user)

//this is an array of the comment ids that have replies that have already been shown
var replycommentids = {};

//a function to get the FIRST replies for a certain comment, also works to toggle the display value of the replies div
function getFirstReplies(commentid) {
	//only get the first replies if the comment replies button have not been clicked yet
	if (!Object.keys(replycommentids).includes(commentid)) {
		//get the AJAX data from the comment replies url
		getAjaxData(`/comment/replies/${commentid}`, (replies) => {
			var repliesdiv = document.getElementById(`${commentid}repliesdiv`);

			//make sure the replies exist before doing anything
			if (typeof replies == 'undefined' || replies.length == 0) {
				repliesdiv.style.display = 'none';

				//insert an entry with the number 0 to easily identify comments with 0 replies
				replycommentids[commentid] = 0;
			} else {
				//show the replies div element
				showelement(`${commentid}repliesdiv`);

				//handle the replies in another function
				handleReplies(replies);

				//add this comment id to the array and insert a number representative of the amount of AJAX requests previously made
				replycommentids[commentid] = 1;
			}
		});
	} else if (replycommentids[commentid] != 0) { //if this is a comment with existing replies
		//toggle the display
		showelement(`${commentid}repliesdiv`);
	}
}

//a function to make an ajax request for the replies of a certain comment
function getMoreReplies(commentid) {
	//check that the comment id exists in the array
	if (Object.keys(replycommentids).includes(commentid)) {
		//get the limit number to only get a portion of replies
		var limitnum = replycommentids[commentid];

		//get the AJAX data from the comment replies url with a specified limit (i.e 50 would mean getting comments 51-60 instead of getting the same comments)
		getAjaxData(`/comment/replies/${commentid}/?limit=${limitnum*50}`, (replies) => {
			//get the status of the handling of the replies
			var result = handleReplies(replies);

			//if there were no replies given by the ajax, then set the "more replies" button to be invisible
			if (!result) {
				document.getElementById(`${commentid}morerepliesbtn`).style.display = 'none';
			}
		});

		//add 1 to the limit number to access more comments after this group
		replycommentids[commentid] += 1;
	}
}

//the callback function for handling the reply data from ajax
function handleReplies(replies) {
	//if the replies do not exists or there are no replies at all, return and stop the function
	if (typeof replies == 'undefined' || replies.length == 0) {
		return false;
	}

	//get the comment replies div
	var commentreplies = document.getElementById(`${replies[0].base_parent_id}replies`);

	//if the comment replies are not null, then do shit
	if (commentreplies != null) {
		//construct the html for each reply sequentially
		replies.forEach((item, index) => {
			commentreplies.appendChild(getReplySegment(item));
		});

		//stop the loading animation for the comments
		document.getElementById(`${replies[0].base_parent_id}loading`).style.display = 'none';

		//return a success
		return true;
	}
}

//a function for creating the "reply" html segment based off of the data in the reply object
function getReplySegment(reply) {
	//create the svg element that indicates the depth level of replies
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttributeNS(null, "width", "500");
	svg.setAttributeNS(null, "height", "20");

	//loop through the depth level in the reply and add the necessary svg circles
	for (var i=1; i < parseInt(reply.depth_level) + 1; i++) {
		//create the element using the svg namespace so that the code knows that this is an svg element
		var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		//set the basic attributes about the circle
		circle.setAttributeNS(null, "cx", (i*20).toString());
		circle.setAttributeNS(null, "cy", "10");
		circle.setAttributeNS(null, "r", "5");
		circle.setAttributeNS(null, "fill", "#adff12");
		//add this to the svg inner html
		svg.appendChild(circle);
	}

	//add the username
	var username = document.createElement("h3");
	username.innerHTML = reply.username;

	//add the comment content
	var comment = document.createElement("p");
	comment.innerHTML = reply.comment;

	//create the container for all of the like/dislike functionality
	var commentlikesdiv = document.createElement("div");
	commentlikesdiv.setAttribute("class", "commentlikes");
	commentlikesdiv.setAttribute("id", reply.id);

	//create the like button
	var likebtn = document.createElement("button");
	likebtn.setAttribute("id", "commentLike");
	likebtn.setAttribute("onclick", `likeComment(\'${reply.id}\')`);

	//create the like image inside the button element
	var likeimg = document.createElement("img");
	likeimg.setAttribute("src", "/content/icons/like.ico");
	likebtn.appendChild(likeimg);

	//create the p tag containing the number of likes
	var likes = document.createElement("p");
	likes.setAttribute("id", `${reply.id}likes`);
	likes.innerHTML = reply.likes.toString();

	//create the dislike button
	var dislikebtn = document.createElement("button");
	dislikebtn.setAttribute("id", "commentDislike");
	dislikebtn.setAttribute("onclick", `dislikeComment(\'${reply.id}\')`);

	//create the dislike image inside the button element
	var dislikeimg = document.createElement("img");
	dislikeimg.setAttribute("src", "/content/icons/dislike.ico");
	dislikebtn.appendChild(dislikeimg);

	//create the p tag containing the number of likes
	var dislikes = document.createElement("p");
	dislikes.setAttribute("id", `${reply.id}likes`);
	dislikes.innerHTML = reply.dislikes.toString();

	//make a reply button to reply to this comment
	var replybtn = document.createElement("button");
	replybtn.setAttribute("id", "replybtn");
	replybtn.setAttribute("onclick", `showelement('${reply.id}replybox');`);
	replybtn.innerHTML = "Reply";

	//add the button elements to the div
	commentlikesdiv.appendChild(likebtn);
	commentlikesdiv.appendChild(likes);
	commentlikesdiv.appendChild(dislikebtn);
	commentlikesdiv.appendChild(dislikes);
	commentlikesdiv.appendChild(replybtn);

	//make the div container for the reply form
	var replyformdiv = document.createElement("div");
	replyformdiv.setAttribute("class", "replybox");
	replyformdiv.setAttribute("id", reply.id+"replybox");

	//make the form tag
	var replyformtag = document.createElement("form");
	replyformtag.setAttribute("action", `/comment/${reply.video_id}?parent_id=${reply.id}`);
	replyformtag.setAttribute("method", "post");
	replyformtag.setAttribute("enctype", "multipart/form-data");

	//add the textarea element
	var replytext = document.createElement("textarea");
	replytext.setAttribute("id", "commenttext");
	replytext.setAttribute("name", "commenttext");
	replytext.setAttribute("placeholder", "Say Something!");
	replytext.setAttribute("maxlength", "1000");
	replytext.setAttribute("rows", "10");
	replytext.setAttribute("cols", "50");
	replyformtag.appendChild(replytext);
	replytext.insertAdjacentHTML("afterend", "<br>");

	//add the reaction file label
	var filelabel = document.createElement("label");
	filelabel.setAttribute("for", "reactionfile");
	filelabel.innerHTML = "Reaction Image/Video:";
	replyformtag.appendChild(filelabel);
	filelabel.insertAdjacentHTML("afterend", "<br>");

	//add the reaction file input
	var fileinput = document.createElement("input");
	fileinput.setAttribute("type", "file");
	fileinput.setAttribute("id", "reactionfile");
	fileinput.setAttribute("name", "reactionfile");
	fileinput.setAttribute("accept", "image/*,video/*");
	replyformtag.appendChild(fileinput);
	fileinput.insertAdjacentHTML("afterend", "<br><br>");

	//add the hidden base parent id input
	var hiddeninput = document.createElement("input");
	hiddeninput.setAttribute("type", "hidden");
	hiddeninput.setAttribute("id", "base_parent_id");
	hiddeninput.setAttribute("name", "base_parent_id");
	hiddeninput.setAttribute("value", `${reply.base_parent_id}`);
	replyformtag.appendChild(hiddeninput);

	//make the submit button
	var submitbtn = document.createElement("button");
	submitbtn.setAttribute("id", "commentbtn");
	submitbtn.setAttribute("type", "submit");
	submitbtn.setAttribute("value", "Submit");
	submitbtn.innerHTML = "Post Comment";
	replyformtag.appendChild(submitbtn);

	//make a cancel button for the reply form
	var cancelbtn = document.createElement("input");
	cancelbtn.setAttribute("type", "button");
	cancelbtn.setAttribute("onclick", `showelement('${reply.id}replybox');`);
	cancelbtn.setAttribute("value", "Cancel");
	replyformtag.appendChild(cancelbtn);

	//add the reply form tag to the inside of the reply form div
	replyformdiv.appendChild(replyformtag);

	//add all of the elements into an array
	var elements = [svg, username, comment, commentlikesdiv, replyformdiv];

	//the final container for all of this
	var container = document.createElement("div");
	elements.forEach((item, index) => {
		container.appendChild(item);
	});
	container.style.marginLeft = `${reply.depth_level*30}px`;

	return container;
}
