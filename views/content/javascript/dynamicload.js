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
		//get the loading animation div for comment reply loading
		var loading = document.getElementById(`${commentid}loading`);

		if (!Object.keys(replycommentids).includes(commentid)) {
			//show the loading animation
			loading.style.display = "initial";

			//get replies html from the server
			var response = await fetch(`/comment/replies/${commentid}`);
			var data = await response.text();

			//make the loading animation invisible once the replies are done loading
			loading.style.display = "none";

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

			//show the loading animation
			loading.style.display = "initial";

			//get the next set of replies html
			var response = await fetch(`/comment/replies/${commentid}?limit=${limitnum*50}`);
			var data = await response.text();

			//make the loading animation invisible once the replies are done loading
			loading.style.display = "none";

			//parse the response data as html text
			var parser = new DOMParser();
			var replies = parser.parseFromString(data, "text/html");
			replies = replies.body.getElementsByTagName("div")[0].innerHTML;

			//add the replies html to the replies div
			document.getElementById(`${commentid}replies`).innerHTML += replies;

			//if there are no more replies, set the "more replies" button to be invisible
			if (replies.replaceAll(" ", "").replaceAll("\n", "").replaceAll("\t", "") === "") {
				document.getElementById(`${commentid}morerepliesbtn`).style.display = 'none';
			}

			//increase the recorded amount of times replies have been requested from the server
			replycommentids[commentid] += 1;
		}
	}
}
