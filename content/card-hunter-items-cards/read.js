
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
const contribution = {};
const totalcards = {};
const reviewedcards = {};
const totalitems = {};
const revieweditems = {};
let loadedEither = false;

function loaded() {
	if (loadedEither) fs.writeFile("backup-" + new Date().toUTCString() + ".json",
			JSON.stringify({cards: cards, items: items}), function(err) {
		if (err) throw err;
		for (author in contribution) {
			let sum = 0;
			for (rarity in contribution[author]) {
				sum += contribution[author][rarity];
			}
			console.log(sum + " reviews from " + author);
			console.log("[INDENT]");
			for (rarity in contribution[author]) {
				console.log(contribution[author][rarity] + " reviews for " + rarity + "s");
			}
			console.log("[/INDENT]");
		}
		let sumtotal = 0;
		let sumreviewed = 0;
		for (rarity in totalcards) {
			reviewedcards[rarity] = reviewedcards[rarity] || 0;
			sumtotal += totalcards[rarity];
			sumreviewed += reviewedcards[rarity];
		}
		console.log(sumreviewed + "/" + sumtotal + " cards reviewed");
		console.log("[INDENT]");
		for (rarity in totalcards) {
			console.log(reviewedcards[rarity] + "/" + totalcards[rarity] + " " + (rarity || "No Rarity") + " cards reviewed");
		}
		console.log("[/INDENT]");
		sumtotal = 0;
		sumreviewed = 0;
		for (rarity in totalitems) {
			revieweditems[rarity] = revieweditems[rarity] || 0;
			sumtotal += totalitems[rarity];
			sumreviewed += revieweditems[rarity];
		}
		console.log(sumreviewed + "/" + sumtotal + " items reviewed");
		console.log("[INDENT]");
		for (rarity in totalitems) {
			console.log(revieweditems[rarity] + "/" + totalitems[rarity] + " " + rarity + " items reviewed");
		}
		console.log("[/INDENT]");
	  console.log('Saved to backup');
	});
	else loadedEither = true;
}

function addContribution(data, review, type) {
	const rarityandtype = data.rarity + " " + type;
	if (!contribution[review.author]) contribution[review.author] = {};
	if (!contribution[review.author][rarityandtype]) contribution[review.author][rarityandtype] = 0;
	contribution[review.author][rarityandtype]++;
}

db.collection('cards').get().then(function(docs) {
	docs.forEach(function(doc) {
		const data = doc.data();
		totalcards[data.rarity] = (totalcards[data.rarity] || 0) + 1;
		if (data.reviews) {
			reviewedcards[data.rarity] = (reviewedcards[data.rarity] || 0) + 1;
			cards[doc.id] = data.reviews;
			data.reviews.forEach(function(review) {
				addContribution(data, review, "card");
			});
		}
	});
	loaded();
}).catch(function(error) {console.error("Error getting document:", error);});
db.collection('items').get().then(function(docs) {
	docs.forEach(function(doc) {
		const data = doc.data();
		totalitems[data.rarity] = (totalitems[data.rarity] || 0) + 1;
		if (data.reviews) {
			revieweditems[data.rarity] = (revieweditems[data.rarity] || 0) + 1;
			items[doc.id] = data.reviews;
			data.reviews.forEach(function(review) {
				addContribution(data, review, "item");
			});
		}
	});
	loaded();
}).catch(function(error) {console.error("Error getting document:", error);});
