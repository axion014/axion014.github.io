yall({observeChanges: true});

firebase.initializeApp({
  apiKey: 'AIzaSyAkpWpmj1vjLb_ayPupXSO8URQaAMes5_k',
  authDomain: 'card-hunter-review-index.firebaseapp.com',
  projectId: 'card-hunter-review-index'
});

var db = firebase.firestore();
var list = document.getElementById('list');
var searchbar = document.getElementById('searchbar');

searchbar.value = decodeURIComponent(location.hash.substring(1));

function applySearch() {
	try {
		var regex = new RegExp(searchbar.value, 'i');
		var regexAcronym = new RegExp(searchbar.value.split('').reduce(function(a, b) {
			return a + b + ".* ";
		}, '^').trim(), 'i');
	} catch(e) {} // 正規表現エラーは握りつぶす
	var resultcache = {name: {}, acronym: {}};
	for (var i = 0; i < list.children.length; i++) {
  	list.children[i].hidden = !(function() {
			var name = list.children[i].getElementsByTagName('span')[0].innerText;
			if (regex.test(name)) return true;
			if (regexAcronym.test(name)) return true;
			if (list.children[i].data.cards) for (var j = 0; j < list.children[i].data.cards.length; j++) {
				var card = list.children[i].data.cards[j];
				// = operator intended
				if (resultcache.name[card] !== undefined) {
					if (resultcache.name[card]) return true;
				} else if (resultcache.name[card] = regex.test(card)) return true;
				if (resultcache.acronym[card] !== undefined) {
					if (resultcache.acronym[card]) return true;
				} else if (resultcache.acronym[card] = regexAcronym.test(card)) return true;
			}
			return false;
		})();
	}
}

db.collection("data").doc("data").get().then(function(data) {
	data = data.data();
	data.cards.forEach(function(card) {
		var element = document.createElement('li');
		element.data = card;
		//element.id = card.name;
		var image = document.createElement('img');
		image.className = "lazy";
		image.width = 43;
		image.height = 60;
		image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + card.name + ".jpeg";
		element.appendChild(image);
		var name = document.createElement('span');
		name.innerText = card.name;
		element.appendChild(name);
		var linkToWiki = document.createElement('a');
		linkToWiki.href = "http://wiki.cardhuntria.com/wiki/Cards/" + card.name;
		linkToWiki.innerText = "Wiki";
		element.appendChild(linkToWiki);
		list.appendChild(element);
	});
	data.items.forEach(function(item) {
		var element = document.createElement('li');
		element.data = item;
		//element.id = item.name;
		if (item.image_url) {
			var image = document.createElement('img');
			image.className = "lazy";
			image.width = 60;
			image.height = 60;
			image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + item.image_url + ".png";
			element.appendChild(image);
		}
		var name = document.createElement('span');
		name.innerText = item.name;
		element.appendChild(name);
		item.cards.forEach(function(name) {
			var image = document.createElement('img');
			image.className = "lazy clickable";
			image.width = 43;
			image.height = 60;
			image.dataset.src = "http://wiki.cardhuntria.com/wiki/Special:FilePath/" + name + ".jpeg";
			image.addEventListener('pointerdown', function() {
				searchbar.value = name;
				applySearch();
			});
			element.appendChild(image);
		});
		var linkToWiki = document.createElement('a');
		linkToWiki.href = "http://wiki.cardhuntria.com/wiki/Items/" + item.name;
		linkToWiki.innerText = "Wiki";
		element.appendChild(linkToWiki);
		list.appendChild(element);
	});
	searchbar.addEventListener('input', applySearch);
	searchbar.addEventListener('change', function() {
		location.hash = searchbar.value ? "#" + searchbar.value : "";
	});
	applySearch();
	var loading = document.getElementById('loading');
	loading.parentNode.removeChild(loading);
}).catch(function(error) {console.error("Error getting document:", error);});
