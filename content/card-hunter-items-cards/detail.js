
var arg = {};
var pair = location.search.substring(1).split('&');
for (var i = 0; pair[i]; i++) {
	var kv = pair[i].split('=');
	arg[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
}

document.getElementsByTagName('title')[0].innerText = arg.name + " - Card Hunter Items/Cards";
document.getElementById('title').innerText = arg.name;

firebase.initializeApp({
	apiKey: 'AIzaSyAkpWpmj1vjLb_ayPupXSO8URQaAMes5_k',
	authDomain: 'card-hunter-review-index.firebaseapp.com',
	projectId: 'card-hunter-review-index'
});

var db = firebase.firestore();
var reviews = document.getElementById('reviews');

function putContents(data) {
	if (!data.exists) return;
	data = data.data();
	for (var i = 0; i < data.reviews.length; i++) {
		var review = document.createElement('li');
		var reviewLink = document.createElement('a');
		reviewLink.href = "https://forums.cardhunter.com/" + data.reviews[i].url; // Limit URL to Card Hunter Forum
		reviewLink.innerText = data.reviews[i].author + " Review";
		review.appendChild(reviewLink);
		var removeLink = document.createElement('button');
		removeLink.className = "remove";
		removeLink.innerText = "Remove";
		(function(author) {
			removeLink.addEventListener('pointerdown', function() {
				if (!confirm("Do you really want to remove this link to review?")) return;
				db.runTransaction(function(transaction) {
					return transaction.get(dataRef).then(function(doc) {
						var data = doc.data();
						for (var i = 0; i < data.reviews.length; i++) {
							if (data.reviews[i].author === author) {
								data.reviews.splice(i, 1);
								transaction.update(dataRef, {reviews: data.reviews});
								break;
							}
						}
					});
				}).then(function() {
					location.reload();
				}).catch(function(error) {console.error("Error removing review: ", error);});
			});
		})(data.reviews[i].author);
		review.appendChild(removeLink);
		reviews.appendChild(review);
	}
}

if (arg.type === "card") { // Card
	var image = document.getElementById('icon');
	image.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + arg.name + ".jpeg";
	image.width = 248;
	image.height = 347;
	document.getElementById('wikilink').href = "http://wiki.cardhuntria.com/wiki/Cards/" + arg.name;
	var dataRef = db.collection("cards").doc(arg.name);
} else { // Item
	document.getElementById('icon').src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + arg.imageurl + ".png";
	document.getElementById('wikilink').href = "http://wiki.cardhuntria.com/wiki/Items/" + arg.name;
	var cards = arg.cards.split('、');
	var cardgroup = document.getElementById('cards');
	for (var i = 0; i < cards.length; i++) {
		var image = document.createElement('img');
		image.width = 86;
		image.height = 120;
		image.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + cards[i] + ".jpeg";
		(function(i) {
			image.addEventListener('pointerdown', function() {
				location.href = "./detail.html?type=card&name=" + cards[i];
			});
		})(i);
		cardgroup.appendChild(image);
	}
	var dataRef = db.collection("items").doc(arg.name);
}

dataRef.get().then(putContents).catch(function(error) {console.error("Error getting document:", error);});

var addElement = document.getElementById('addreview');
var addLink = document.createElement('button');
addLink.className = "smalllink";
addLink.innerText = "Add Review";
var newReview = function() {
	addLink.removeEventListener('pointerdown', newReview);
	addLink.className = "label";
	var author = document.createElement('div');
	author.innerText = "Review by ";
	var inputAuthor = document.createElement('input');
	author.appendChild(inputAuthor);
	addElement.appendChild(author);
	var url = document.createElement('div');
	url.innerText = "URL: ";
	var inputURL = document.createElement('input');
	url.appendChild(inputURL);
	addElement.appendChild(url);
	var errorText = document.createElement('span');
	errorText.id = "errortext";
	var submitButton = document.createElement('button');
	submitButton.className = "smalllink";
	submitButton.id = "submit";
	submitButton.innerText = "Submit";
	submitButton.addEventListener('pointerdown', function() {
		db.runTransaction(function(transaction) {
			return transaction.get(dataRef).then(function(doc) {
				var domain = "forums.cardhunter.com/";
				var data = doc.data();
				function ba() {
					errorText.innerText = "Only URL of forums.cardhunter.com domain is allowed";
					throw new Error("Bad Address");
				}
				if (inputURL.value.substring(0, 8) === "https://") {
					if (inputURL.value.substring(8, 30) === domain) var url = inputURL.value.substring(30);
					else ba();
				} else if (inputURL.value.substring(0, 7) === "http://") {
					if (inputURL.value.substring(7, 29) === domain) var url = inputURL.value.substring(29);
					else ba();
				} else if (inputURL.value.substring(0, 22) === domain) var url = inputURL.value.substring(22);
				else var url = inputURL.value;
				if (data) {
					for (var i = 0; i < data.reviews.length; i++) {
						if (data.reviews[i].author === inputAuthor.value) {
							errorText.innerText = "A Review from specified name already exists";
							throw new Error("Already Reviewed");
						}
					}
					data.reviews.push({author: inputAuthor.value, url: url});
					transaction.update(dataRef, {reviews: data.reviews});
				} else transaction.set(dataRef, {reviews: [{author: inputAuthor.value, url: url}]});
			});
		}).then(function() {
			addLink.className = "smalllink";
			addLink.addEventListener('pointerdown', newReview);
			addElement.removeChild(author);
			addElement.removeChild(url);
			addElement.removeChild(submitButton);
			addElement.removeChild(errorText);
			location.reload();
		}).catch(function(error) {console.error("Error adding review: ", error);});
	});
	addElement.appendChild(submitButton);
	addElement.appendChild(errorText);
};
addLink.addEventListener('pointerdown', newReview);
addElement.appendChild(addLink);
