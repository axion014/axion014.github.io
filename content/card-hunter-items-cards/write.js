
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const nqdm = require('nqdm');

const serviceAccount = require("./card-hunter-review-index-firebase-adminsdk-x3mlm-030600cb73.json");

console.log("Getting document");

admin.initializeApp({
	credential: admin.credential.cert(serviceAccount),
	databaseURL: "https://card-hunter-review-index.firebaseio.com"
});

const db = admin.firestore();
const doc = db.collection("data").doc("data");

function parseCSV(str) {
	let i, c, r, q, l, m, v, j, len=str.length, rows = [], row = [];
	m = (l = str.indexOf('\r\n')<0 ? str.indexOf('\r')<0 ? '\n' : '\r' : '\r\n').length; //改行記号を決定
	for(i=0,c=r=-1; i<len; i++) {
		if (str.charAt(i) === '"') { //quoted
			for(j=0,q=i+1; q<len; j++,q++) { //閉quotを探す
				q = (q=str.indexOf('"',q)) < 0 ? len+1 : q; //quotの位置、無いなら末尾まで
				if (str.charAt(++q) !== '"') break;			 //""なら継続
			}
			row.push((v=str.substring(i+1,(i=q)-1),j) ? v.replace(/""/g,'"') : v);
		} else { //not quoted
			if (c<i) {
				c=str.indexOf(',',i);
				c=c<0?len:c;
			} //直近のカンマ位置と
			if (r<i) {
				r=str.indexOf(l,i);
				r=r<0?len:r;
			}	 //直近の改行位置を調べ
			row.push(str.substring(i,(i=c<r?c:r)));			//そこまでを値とする
		}
		if (i === r || l === (m>1?str.substr(i,m):str.charAt(i))) {
			rows.push(row);
			row=[];
			i+=m-1;
		}
	}
	str.charAt(i-1) === ',' && row.push(''); //,で終わる
	row.length && rows.push(row);
	str.substr(i-1,m) === l && rows.push([]); //最後の改行を無視する場合はコメントアウト
	return rows;
};

console.log("Removing document");
const deletion = doc.delete().then(function() {
	console.log("Document removed");
}).catch(function(error) {console.error("Error removing document: ", error);});

const ignoredCards = [
	"Enabling Aura", "Pact of Healing", "Blizzard", "Crippling Slash", "Fate Reversal",
	"Launching Blow", "Greased Armor", "Fiery Fists", "Fiery Incantation", "Freezing Fists",
	"Freezing Incantation", "Sparking Fists", "Sparking Incantation", "Parrying Cut", "Block Link",
	"Charmed Block", "Reactive Smoke Bomb", "Sticky Bomb", "Blaze", "Attractive", "Easily Daunted",
	"Repulsive", "Spell Train", "Blessed Beacon", "Mesmerising Beacon", "Painful Beacon",
	"Move it, Soldier!", "Over the Top"
];

console.log("Loading Cards.csv");
fetch("http://live.cardhunter.com/data/gameplay/Cards/Cards.csv").then(function(response) {
	return response.text();
}).then(function(text) {
	console.log("Parsing Cards.csv");
	const rows = parseCSV(text);
	rows.shift();
	rows.shift();
	const data = {cards: [], items: []};
	data.lastUpdated = Date.now();

	for(const cells of nqdm(rows)) {
		if (cells[1] && !ignoredCards.includes(cells[1])) {
			const card = {
				name: cells[1], type: cells[3], attacktype: cells[4],
				damage: cells[5], rarity: cells[47], quality: cells[40], reviews: []
			}
			data.cards.push(card);
		}
	}

	console.log("Loading Equipments.csv");
	fetch("http://live.cardhunter.com/data/gameplay/Equipment/Equipment.csv").then(function(response) {
		return response.text();
	}).then(function(text) {
		console.log("Parsing Equipments.csv");
		const rows = parseCSV(text);
		rows.shift();
		rows.shift();
		for(const cells of nqdm(rows)) {
			if (cells[1]) {
				const item = {
					name: cells[1], type: cells[19], rarity: cells[3], level: cells[4],
					cards: [], image_url: cells[21], reviews: []
				};
				for (let i = 9; i < 19; i++) {
					if (!cells[i]) break;
					item.cards.push(cells[i]);
				}
				data.items.push(item);
			}
		}
		deletion.then(function() {
			console.log("Setting document");
			doc.set(data).catch(function(error) {console.error("Error setting document: ", error);});
		});
	});
}).catch(function(error) {
	console.error("Error making document: ", error);
});
