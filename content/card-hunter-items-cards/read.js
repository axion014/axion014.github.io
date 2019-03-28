
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nqdm = require('nqdm')

const serviceAccount = require("./card-hunter-review-index-firebase-adminsdk-x3mlm-030600cb73.json");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://card-hunter-review-index.firebaseio.com"
});

const db = admin.firestore();

function showContents(docs) {
	docs.forEach(function(doc) {
		const data = doc.data();
		console.log("Reviews for " + doc.id);
		data.reviews.forEach(function(review) {
			console.log(review.url + " by " + review.author);
		});
	});
}

db.collection('cards').get().then(showContents).catch(function(error) {console.error("Error getting document:", error);});
db.collection('items').get().then(showContents).catch(function(error) {console.error("Error getting document:", error);});
