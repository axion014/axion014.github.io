
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const fs = require('fs');

const serviceAccount = require("./card-hunter-review-index-firebase-adminsdk-x3mlm-030600cb73.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://card-hunter-review-index.firebaseio.com"
});

const db = admin.firestore();

function showContents(doc, data) {
	console.log("Reviews for " + doc.id);
	data.reviews.forEach(function(review) {
		console.log(review.url + " by " + review.author);
	});
}

const cards = {};
const items = {};
let loadedEither = false;

function loaded() {
	if (loadedEither) fs.writeFile("backup-" + new Date().toUTCString() + ".json",
			JSON.stringify({cards: cards, items: items}), function(err) {
		if (err) throw err;
	  console.log('Saved to backup');
	});
	else loadedEither = true;
}

db.collection('cards').get().then(function(docs) {
	docs.forEach(function(doc) {
		const data = doc.data();
		cards[doc.id] = data;
	});
	loaded();
}).catch(function(error) {console.error("Error getting document:", error);});
db.collection('items').get().then(function(docs) {
	docs.forEach(function(doc) {
		const data = doc.data();
		items[doc.id] = data;
	});
	loaded();
}).catch(function(error) {console.error("Error getting document:", error);});
