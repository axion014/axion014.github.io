firebase.initializeApp({
	apiKey: 'AIzaSyAkpWpmj1vjLb_ayPupXSO8URQaAMes5_k',
	authDomain: 'card-hunter-review-index.firebaseapp.com',
	projectId: 'card-hunter-review-index'
});

var db = firebase.firestore();
var list = document.getElementById('list');
var searchbar = document.getElementById('searchbar');

searchbar.value = decodeURIComponent(location.hash.substring(1));

var domUpTodate = true;

function applySearch() {
	try {
		var regex = new RegExp(searchbar.value, 'i');
		var regexAcronym = new RegExp(searchbar.value.split('').reduce(function(a, b) {
			return a + b + ".* ";
		}, '^').trim(), 'i');
	} catch(e) {} // 正規表現エラーは握りつぶす
	var resultcache = {};
	var listarray = Array.prototype.slice.call(list.children);
	for (var i = 0; i < listarray.length; i++) {
		var element = listarray[i];
		element.priority = 0;
		var name = element.data.name;
		if (regex.test(name)) element.priority = Infinity;
		for (var j = 0; j < element.data.alias.length; j++) {
			if (regex.test(element.data.alias[j])) element.priority += 1000;
		}
		if (regexAcronym.test(name)) element.priority += 100;
		if (regex.test(element.data.type)) element.priority += 5;
		if (regex.test(element.data.rarity)) element.priority += 5;
		if (element.data.quality && regex.test(element.data.quality)) element.priority += 5;
		if (element.data.attacktype && regex.test(element.data.attacktype)) element.priority += 5;
		if (element.data.damage && regex.test(element.data.damage)) element.priority += 5;
		if (element.data.cards) for (j = 0; j < element.data.cards.length; j++) {
			var card = element.data.cards[j];
			// = operator intended
			if (resultcache[card] !== undefined) {
				if (resultcache[card]) element.priority += 1;
			} else if (resultcache[card] = regex.test(card) || regexAcronym.test(card)) element.priority += 1;
		}
	}
	listarray.sort(function(a, b) {return b.priority - a.priority});
	if (domUpTodate) {
		domUpTodate = false;
		requestAnimationFrame(function() {
			for (var i = 0; i < listarray.length; i++) {
				list.appendChild(listarray[i]);
				if (listarray[i].priority !== 0) {
					listarray[i].hidden = false;
				} else listarray[i].hidden = true;
			}
			domUpTodate = true;
		});
	}
}

var data = JSON.parse(localStorage.getItem("data"));

function newData(snapshot) {
	data = snapshot.data();
	console.log("New data snapshot retrieved");
	localStorage.setItem("data", JSON.stringify(data));
	showData();
}

function showData() {
	data.cards.forEach(function(card) {
		var element = document.createElement('li');
		var anchor = document.createElement('a');
		anchor.href = "./detail.html?type=card&name=" + card.name;
		element.data = card;
		//element.id = card.name;
		var image = document.createElement('img');
		image.className = "lazy";
		image.width = 43;
		image.height = 60;
		image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + card.name + ".jpeg";
		anchor.appendChild(image);
		var name = document.createElement('span');
		name.innerText = card.name;
		anchor.appendChild(name);
		var linkToWiki = document.createElement('a');
		linkToWiki.className = "external";
		linkToWiki.href = "http://wiki.cardhuntria.com/wiki/Cards/" + card.name;
		linkToWiki.innerText = "Wiki";
		anchor.appendChild(linkToWiki);
		element.appendChild(anchor);
		list.appendChild(element);
	});
	data.items.forEach(function(item) {
		var element = document.createElement('li');
		var anchor = document.createElement('a');
		anchor.href = "./detail.html?type=item&name=" + item.name;
		element.data = item;
		//element.id = item.name;
		if (item.image_url) {
			var image = document.createElement('img');
			image.className = "lazy";
			image.width = 60;
			image.height = 60;
			image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + item.image_url + ".png";
			anchor.appendChild(image);
		}
		var name = document.createElement('span');
		name.innerText = item.name;
		anchor.appendChild(name);
		item.cards.forEach(function(name) {
			var innerAnchor = document.createElement('a');
			innerAnchor.href = "./detail.html?type=card&name=" + name;
			var image = document.createElement('img');
			image.className = "lazy";
			image.width = 43;
			image.height = 60;
			image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + name + ".jpeg";
			image.addEventListener('pointerdown', function() {
				location.href = "./detail.html?type=card&name=" + name;
			});
			innerAnchor.appendChild(image);
			anchor.appendChild(innerAnchor);
		});
		var linkToWiki = document.createElement('a');
		linkToWiki.className = "external";
		linkToWiki.href = "http://wiki.cardhuntria.com/wiki/Items/" + item.name;
		linkToWiki.innerText = "Wiki";
		anchor.appendChild(linkToWiki);
		element.appendChild(anchor);
		list.appendChild(element);
	});
	searchbar.addEventListener('input', applySearch);
	searchbar.addEventListener('change', function() {
		location.hash = searchbar.value ? "#" + searchbar.value : "";
	});
	yall();
	applySearch();
	var loading = document.getElementById('loading');
	loading.parentNode.removeChild(loading);
}

if (data) {
	db.collection("data").where("lastUpdated", ">", data.lastUpdated).get()
		.then(function(snapshot) {
			if (snapshot.empty) showData();
			else newData(snapshot.docs[0]);
		})
		.catch(function(error) {console.error("Error getting document:", error);});
} else {
	db.collection("data").doc("data").get().then(newData)
		.catch(function(error) {console.error("Error getting document:", error);});
}
