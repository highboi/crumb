//script which handles the dynamic loading of large pieces of data

/*
an object containing key-value pairs of comment ids and the amount of
times replies have been added/requested
*/
var replycommentids = {};

//get the replies of a comment
async function getReplies(commentid, toggle=true) {
	//check to see if only toggling is needed
	if (toggle) {
		showelement(`${commentid}repliesdiv`);
	} else {
		if (!Object.keys(replycommentids).includes(commentid)) {
			//get replies html from the server
			var response = await fetch(`/comment/replies/${commentid}`);
			var data = await response.text();

			//parse the response data as html text
			var parser = new DOMParser();
			var replies = parser.parseFromString(data, "text/html");
			replies = replies.body.getElementsByTagName("div")[0].innerHTML;

			//add the replies html to the replies div
			document.getElementById(`${commentid}replies`).innerHTML += replies;

			//show the replies html
			showelement(`${commentid}repliesdiv`);

			/*
			make a key-value pair in the replycommentids object which
			shows that the replies have been requested once
			*/
			replycommentids[commentid] = 1;

			//set the onclick function for the "replies" button to toggle only
			var showrepliesbtn = document.getElementById(commentid).querySelector("#showreplies");
			showrepliesbtn.setAttribute("onclick", `getReplies('${commentid}', true);`);
		} else if (replycommentids[commentid]) {
			//get the amount of times replies have been requested for this comment
			var limitnum = replycommentids[commentid];

			//get the next set of replies html
			var response = await fetch(`/comment/replies/${commentid}?limit=${limitnum*50}`);
			var data = await response.text();

			//parse the response data as html text
			var parser = new DOMParser();
			var replies = parser.parseFromString(data, "text/html");
			replies = replies.body.getElementsByTagName("div")[0].innerHTML;

			//add the replies html to the replies div
			document.getElementById(`${commentid}replies`).innerHTML += replies;

			//if there are no more replies, set the "more replies" button to be invisible
			if (replies === "") {
				document.getElementById(`${commentid}morerepliesbtn`).style.display = 'none';
			}

			//increase the recorded amount of times replies have been requested from the server
			replycommentids[commentid] += 1;
		}
	}

	/*
	//check to see if we need to toggle the replies or request more replies
	if (toggle) {
		showelement(`${commentid}repliesdiv`);
	} else {
		//check to see if a comment has been processed for replies or not
		if (!Object.keys(replycommentids).includes(commentid)) {
			//get the replies data from the server
			var response = await fetch(`/comment/replies/${commentid}`);
			var data = await response.json();
			var replies = data.replies;

			//get the status of showing the replies to the user
			var result = handleReplies(replies);

			//check to see if the replies were successfully shown
			if (result) {
				//show the replies html
				showelement(`${commentid}repliesdiv`);

				/*
				make a key-value pair in the replycommentids object which
				shows that the replies have been requested once
				/
				replycommentids[commentid] = 1;

				//set the onclick function for the "replies" button to toggle only
				var showrepliesbtn = document.getElementById(commentid).querySelector("#showreplies");
				showrepliesbtn.setAttribute("onclick", `getReplies('${commentid}', true);`);
			} else {
				/*
				make a key-value pair in the replycommentids object which
				shows no replies belong to this comment with a 0
				/
				replycommentids[commentid] = 0;
			}
		} else if (replycommentids[commentid]) {
			//get the amount of times replies have been requested for this comment
			var limitnum = replycommentids[commentid];

			/*
			get the replies data from the server according to a number which
			only requests replies that are past the Xth reply (request comments
			in increments of 50 in this example, get replies past the 50th, 100th,
			150th comment and so on)
			/
			var response = await fetch(`/comment/replies/${commentid}/?limit=${limitnum*50}`);
			var data = await response.json();
			var replies = data.replies;

			//get the status of showing the replies to the user
			var result = handleReplies(replies);

			//if there are no more replies, set the "more replies" button to be invisible
			if (!result) {
				document.getElementById(`${commentid}morerepliesbtn`).style.display = 'none';
			}

			//increase the recorded amount of times replies have been requested from the server
			replycommentids[commentid] += 1;
		}
	}
	*/
}


//the callback function for handling the reply data from ajax
function handleReplies(replies) {
	//if the replies do not exists or there are no replies at all, return and stop the function
	if (typeof replies == 'undefined' || replies.length == 0) {
		return false;
	}

	//get the comment replies div
	var commentreplies = document.getElementById(`${replies[0].base_parent_id}replies`);

	//add replies to the comment replies div
	if (commentreplies != null) {
		for (var reply of replies) {
			commentreplies.appendChild(getReplySegment(reply));
		}

		document.getElementById(`${replies[0].base_parent_id}loading`).style.display = 'none';

		return true;
	} else {
		return false;
	}
}

//a function for creating the "reply" html segment based off of the data in the reply object
function getReplySegment(reply) {
	//create the svg element that indicates the depth level of replies
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttributeNS(null, "width", `${reply.depth_level*30}`);
	svg.setAttributeNS(null, "height", "20");
	svg.style.marginRight = "20px";

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

	/*
	CREATE THE COMMENT LIKES DIV
	*/

	//create the container for all of the like/dislike functionality
	var commentlikesdiv = document.createElement("div");
	commentlikesdiv.setAttribute("class", "commentlikes");
	commentlikesdiv.setAttribute("id", `${reply.id}likesection`);

	//create the like button image
	var likebtn = document.createElement("img");
	likebtn.setAttribute("id", "commentLike");
	likebtn.setAttribute("class", "commentlikebuttons");
	likebtn.setAttribute("src", "/content/icons/rocket_up.png");
	likebtn.setAttribute("onclick", `likeComment(\'${reply.id}\')`);

	//create the p tag containing the number of likes
	var likes = document.createElement("p");
	likes.setAttribute("id", `${reply.id}likes`);
	likes.innerHTML = reply.likes.toString();

	//create the dislike button image
	var dislikebtn = document.createElement("img");
	dislikebtn.setAttribute("id", "commentDislike");
	dislikebtn.setAttribute("class", "commentlikebuttons");
	dislikebtn.setAttribute("src", "/content/icons/rocket_down.png");
	dislikebtn.setAttribute("onclick", `dislikeComment(\'${reply.id}\')`);

	//create the p tag containing the number of likes
	var dislikes = document.createElement("p");
	dislikes.setAttribute("id", `${reply.id}dislikes`);
	dislikes.innerHTML = reply.dislikes.toString();

	//make a reply button to reply to this comment
	var replybtn = document.createElement("button");
	replybtn.setAttribute("id", "replybtn");
	replybtn.setAttribute("onclick", `showElementDraggable('${reply.id}replybox');`);
	replybtn.innerHTML = "Reply";

	//add the button elements to the div
	commentlikesdiv.appendChild(likebtn);
	commentlikesdiv.appendChild(likes);
	commentlikesdiv.appendChild(dislikebtn);
	commentlikesdiv.appendChild(dislikes);
	commentlikesdiv.appendChild(replybtn);

	/*
	MAKE THE COMMENT REPLY FORM
	*/

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
	submitbtn.innerHTML = "Reply";
	replyformtag.appendChild(submitbtn);

	//make a cancel button for the reply form
	var cancelbtn = document.createElement("button");
	cancelbtn.setAttribute("type", "button");
	cancelbtn.setAttribute("onclick", `showelement('${reply.id}replybox');`);
	cancelbtn.innerHTML = "Cancel";
	replyformtag.appendChild(cancelbtn);

	//create the draggable header for the draggable window
	var dragheader = document.createElement("p");
	dragheader.setAttribute("id", `${reply.id}replyboxdragheader`);
	dragheader.innerHTML = `Reply to \"${reply.username}:${reply.id}\"`;

	//add the reply form tag to the inside of the reply form div
	replyformdiv.appendChild(dragheader);
	replyformdiv.appendChild(replyformtag);

	//create tags for showing a loading animation during comment uploads
	var percentage = document.createElement("h1");
	percentage.setAttribute("class", "percentage");
	var hourglass = document.createElement("div");
	hourglass.setAttribute("class", "lds-hourglass");

	//add loading animation elements to the reply form div
	replyformdiv.appendChild(percentage);
	replyformdiv.appendChild(hourglass);

	//add a file if there is one
	if (reply.reactionfile != "") {
		console.log("COMMENT HAS A FILE:", reply.reactionfile);
		switch(reply.filetype) {
			case "img":
				break;
			case "video":
				break;
			default:
				break;
		}
	}

	//add all of the elements into an array
	var elements = [svg, username, comment, commentlikesdiv, replyformdiv];

	//the container for the comment information
	var commentcontainer = document.createElement("div");
	for (var element of elements.slice(1)) {
		commentcontainer.appendChild(element);
	}

	//the final container for all comment content
	var container = document.createElement("div");
	container.appendChild(svg);
	container.appendChild(commentcontainer);
	container.setAttribute("id", `${reply.id}`);
	container.setAttribute("class", "commentreply");

	//return the whole container html element
	return container;
}

