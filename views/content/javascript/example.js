var request = new XMLHttpRequest();

var data = new FormData();
data.append("file", document.getElementById("file"));

console.log("loading progress");

document.getElementById("button").onclick = () => {
	request.open("POST", "/example");
	request.send(data);
}

request.upload.addEventListener("progress", (e) => {
	var percent_completed = (e.loaded / e.total)*100;

	console.log(percent_completed);
});
