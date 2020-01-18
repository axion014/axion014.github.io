
// Being a demo I wrote this dirty in favor of speed.
// Would do more sophiscated job for the real product.

const mainpane = document.getElementById('content');
const index = document.getElementById('tree-root');
const current_label = document.getElementById('current-path');
const current = document.getElementById('current');
const input = document.getElementById('input');
const sendbutton = document.getElementById('send');
const query = new URLSearchParams(location.search.substring(1));
const style = document.getElementById('main_style').sheet;
const initial_view_path = query.has("current") ? JSON.parse(query.get("current")) : [20, 21];
let current_instance;
let you = 23;
let path = "";
const map_pending = new Map();
const objects_load = new Map();
const root = {id: -1, children: [], instances: [{dom: {side_children: index}}], isParentNode: true};
root.instances[0].node = root;
let postingContainer;
let postingReference;
let nextid = -1;
let dy = 0;
const max_nesting = 5;
const background_colors = [
	"white",
	"hsl(0, 100%, 98%)",
	"hsl(105, 100%, 98%)",
	"hsl(210, 100%, 98%)",
	"hsl(315, 100%, 98%)"
];
const holding = {};
const MOVING_MARGIN = 10;
const SCROLLING_MARGIN = 40;
const IMG_ADD = "plus-circle.svg";
const IMG_OPEN = "./angle-right.svg";
const IMG_CLOSE = "./angle-down.svg";
const IMG_MOVE = "arrows-alt.svg";
const IMG_COPY = "copy.svg";

async function main() {
	//if (current_id === -1) makeFolder(root);
	const response = await fetch("https://axion014.github.io/content/graft-demo/data.json");
	const data = await response.json();
	objects_load.set(-1, root);
	for (const node of data) {
		if (nextid <= node.id) nextid = node.id + 1;
		let ready = true;
		const dependsOn = id => {
			if (!objects_load.has(id)) {
				// console.log(`node ${node.id} is pending node ${node.parent}`);
				if (!node.dependents) node.dependents = new Set();
				if (!map_pending.has(id)) map_pending.set(id, []);
				node.dependents.add(id);
				map_pending.get(id).push(node);
				ready = false;
			}
		}
		if (node.type === "post" || node.type === "folder") {
			for (const parent of node.parents) dependsOn(parent);
			dependsOn(node.author);
		}
		if (ready) loadNode(node);
	}
	updateCurrentPath();
	document.getElementById('tree-home').addEventListener('click', () => navigate(root.instances[0]));
	sendbutton.addEventListener('click', () => {
		const node = {
			type: "post",
			id: nextid,
			parents: [postingContainer.id],
			content: input.value,
			author: you,
			created: (new Date()).toISOString(),
			instances: []
		};
		const first_child = postingContainer.children.length === 0;
		if (first_child) makeParentNode(postingContainer, "open");
		for (const parent_instance of postingContainer) {
			const instance = {parent: parent_instance, dom: {}, node: node};
			node.instances.push(instance);
			const parentNode = parent_instance.dom.children;
			input.value = "";
			addMainContent(instance);
			if (!first_child) addAddButton(parent_instance, postingReference);
			parent_instance.dom.children.insertBefore(instance.dom.main, postingReference);
		}
		objects_load.set(node.id, node);
		postingContainer.children.push(node);
		nextid++;
	});
	console.log(style);
	for (let i = 0; i < max_nesting; i++) {
		style.insertRule(`[data-depth="${i}"] {
	background-color: ${background_colors[i]};
}`);
	}
	current.hidden = current_instance.node === root;
	if (query.has("target")) show(getInstance(JSON.parse(query.get("target"))));
	window.addEventListener("pointermove", e => {
		if (holding.instance && e.pointerId === holding.id) {
			if (holding.moving || Math.abs(e.clientY - holding.y) >= MOVING_MARGIN) {
				holding.moving = true;
				holding.instance.dom.main.style.width = window.getComputedStyle(holding.instance.dom.main).width;
				holding.instance.dom.main.classList.add("holding");
				holding.instance.dom.main.style.transform = `translateY(${e.clientY - holding.y}px)`;
				const rect = mainpane.getBoundingClientRect();
				dy = 0;
				if (e.clientY < rect.top + SCROLLING_MARGIN) dy = e.clientY - rect.top - SCROLLING_MARGIN;
				if (e.clientY > rect.bottom - SCROLLING_MARGIN) dy = e.clientY + SCROLLING_MARGIN - rect.bottom;
				let found = false;
				const holding_rect = holding.instance.dom.main.getBoundingClientRect();
				const holding_center_y = holding_rect.top + holding_rect.height / 2;
				let prev;
				const setTarget = target => {
					if (holding.target && holding.target !== target) {
						holding.target.style.height = null;
						target.style.height = `${holding_rect.height}px`;
					}
					holding.target = target;
				};
				traverse(current_instance.node, instance => {
					if (found || instance === holding.instance) return {stop: true};
					const rect = instance.dom.main.getBoundingClientRect();
					if (rect.top + rect.height / 2 > holding_center_y) {
						setTarget(instance.dom.main.previousSibling);
						found = true;
						return {stop: true};
					} else prev = instance;
					return {stop: instance.state !== "open"};
				});
				if (!found) setTarget(prev.dom.main.nextSibling);
			}
		}
	});
	window.addEventListener("pointerup", e => {
		if (holding.instance && e.pointerId === holding.id) {
			if (holding.moving) {
				holding.instance.dom.main.classList.remove("holding");
				holding.instance.dom.main.style.transform = null;
				holding.instance.dom.main.style.width = null;
				holding.target.style.height = null;
				if (holding.instance.copying) {

				} else {

				}
				dy = 0;
			} else {
				setMovingState(holding.instance, !holding.instance.copying);
			}
			holding.instance = null;
		}
	});
	setInterval(() => {
		if (dy !== 0) {
			mainpane.scrollBy(0, dy);
			holding.y -= dy;
		}
	}, 50 / 3);
}

function loadNode(node) {
	// console.log(`Loading node ${node.id}`);
	if (node.type === "post" || node.type === "folder") {
		node.children = [];
		node.instances = [];
		for (const id of node.parents) {
			const parent = objects_load.get(id);
			if (!parent.isParentNode) makeParentNode(parent);
			parent.children.push(node);
			for (const parent_instance of parent.instances) {
				const instance = {parent: parent_instance, dom: {}, node: node};
				node.instances.push(instance);
				if (parent_instance.dom.children) { // node within the current path
					addMainContent(instance);
					parent_instance.dom.children.appendChild(instance.dom.main);
					addAddButton(parent_instance);
				}
				const hierarchy = getHierarchy(instance);
				if (hierarchy.length === initial_view_path.length &&
					hierarchy.reverse().every((a, i) => a.node.id === initial_view_path[i])) {
					current_instance = instance;
					instance.dom.main = mainpane;
					instance.dom.content = current;
					addContentTo(instance, current);
				}
			}
		}
	} else if (node.type === "user") {

	}
	objects_load.set(node.id, node);
	if (map_pending.has(node.id)) {
		for (const dependencie of map_pending.get(node.id)) {
			dependencie.dependents.delete(node.id);
			if (dependencie.dependents.size === 0) loadNode(dependencie);
		}
		map_pending.delete(node.id);
	}
}

function addMainContent(instance) {
	instance.dom.main = document.createElement("li");
	instance.dom.content = document.createElement("article");
	instance.dom.main.classList.add("bordered");
	instance.dom.main.setAttribute("data-depth", getDepth(instance));
	addContentTo(instance, instance.dom.content);
	instance.dom.main.appendChild(instance.dom.content);
}

function addContentTo(instance, container) {
	const author = objects_load.get(instance.node.author);
	const showUserProfile = () => alert("some user profile to be shown");
	const icon = document.createElement("img");
	icon.classList.add("icon");
	icon.src = author.avatar;
	icon.addEventListener("click", showUserProfile);
	container.appendChild(icon);
	const header = document.createElement("header");
	const username = document.createElement("address");
	username.classList.add("username");
	username.textContent = author.name;
	username.addEventListener("click", showUserProfile);
	header.appendChild(username);
	const time = document.createElement("time");
	//username.classList.add("username");
	time.textContent = (new Date(Date.parse(instance.node.created))).toLocaleString(navigator.language, {
		year: "numeric",
		month: "numeric",
		day: "numeric",
		hour: "numeric",
		minute: "numeric"
	});
	time.dateTime = instance.node.created;
	header.appendChild(time);
	container.appendChild(header);
	if (instance.node.type === "folder") container.appendChild(makeTitle(instance, instance.node.name));
	else if (instance.node.type === "post") {
		if (instance.node.title) container.appendChild(makeTitle(instance, instance.node.title));
		addHTML(container, md(instance.node.content));
	}

	if (instance !== current_instance) {
		instance.dom.main_image = document.createElement("img");
		instance.dom.main_image.src = IMG_ADD;
		instance.dom.button_children = document.createElement("button");
		instance.dom.button_children.appendChild(instance.dom.main_image);
		header.appendChild(instance.dom.button_children);

		instance.dom.button_children.addEventListener("click", e => {
			if (instance.node.isParentNode) {
				if (instance.state === "open") updateFolderState(instance, "closed", "main");
				else updateFolderState(instance, "open");
			} else setPostingScope(instance, null);
		});

		instance.dom.button_move_image = document.createElement("img");
		setMovingState(instance, false);
		instance.dom.button_move_image.draggable = false;
		instance.dom.button_move = document.createElement("button");
		instance.dom.button_move.appendChild(instance.dom.button_move_image);
		header.appendChild(instance.dom.button_move);

		instance.dom.button_move.addEventListener("pointerdown", e => {
			if (!holding.node) {
				holding.instance = instance;
				holding.id = e.pointerId;
				holding.moving = false;
				holding.y = e.clientY;
			}
		});
	}
}

function makeTitle(instance, text) {
	const title = document.createElement("h1");
	const a = document.createElement("a");
	a.textContent = text;
	a.addEventListener("click", () => {
		if (instance !== current_instance && instance.node.isParentNode) navigate(instance);
	});
	title.appendChild(a);
	return title;
}

function addAddButton(instance, reference) {
	const addButton = document.createElement("button");
	addButton.classList.add("add");
	const image = document.createElement("img");
	image.src = IMG_ADD;
	addButton.appendChild(image);
	addButton.addEventListener("click", e => setPostingScope(instance, addButton));
	instance.dom.children.insertBefore(addButton, reference || null);
}

function setPostingScope(instance, reference) {
	postingReference = reference;
	postingContainer = instance;
	const path = generatePath(getHierarchy(instance));
	input.placeholder = path ? `${path} への書き込み` : "書き込み";
}

function makeFolder(instance) {
	instance.dom.children = document.createElement("ol");
	instance.dom.children.classList.add("children");
	if (instance.dom.content) instance.dom.content.classList.add("folder");
	if (instance === current_instance) instance.dom.children.id = "children";
	instance.dom.main.appendChild(instance.dom.children);
	addAddButton(instance);
}

function getHierarchy(instance) {
	const hierarchy = [];
	for (; instance.parent; instance = instance.parent) hierarchy.push(instance);
	return hierarchy;
}

function getInstance(id_hierarchy) {
	let i = id_hierarchy.length - 1;
	const filter = instance => instance.parent.node.id === id_hierarchy[i - 1];
	let instances = objects_load.get(id_hierarchy[i]).instances;
	for (; i >= 0; i--) {
		instances = instances.filter(filter);
		if (instances.length === 1) return instances[0];
	}
}

function testWithinCurrentPath(instance) {
	for (; instance; instance = instance.parent) if (instance === current_instance) return true;
	return false;
}

function getDepth(instance) {
	let depth = 0;
	for (; instance.parent && instance.parent !== current_instance; depth++) instance = instance.parent;
	return depth;
}

function generatePath(hierarchy) {
	let path = "";
	for (let i = hierarchy.length - 1; i >= 0; i--) {
		const node = hierarchy[i].node;
		path += node.name || node.title || node.content;
		if (i > 0) path += "/";
	}
	return path;
}

function updateCurrentPath() {
	clear(current_label);
	const hierarchy = getHierarchy(current_instance);
	path = generatePath(hierarchy);
	const foldernames = path.split("/");
	for (let i = 0;; i++) {
		if (i === foldernames.length - 1) {
			current_label.appendChild(document.createTextNode(foldernames[i]));
			break;
		}
		const a = document.createElement("a");
		a.textContent = foldernames[i];
		a.addEventListener("click", e => navigate(hierarchy[i]));
		current_label.appendChild(a);
		current_label.appendChild(document.createTextNode("/"));
	}
	postingReference = current_instance.dom.children.lastChild;
	postingContainer = current_instance;
	input.placeholder = path ? `${path} への書き込み` : "書き込み";
}

function makeParentNode(node, initialState) {
	// console.log(`Turning node ${node.id} into a parent node`);
	node.isParentNode = true;
	for (const instance of node.instances) {
		instance.dom.side = document.createElement("li");
		instance.dom.side.classList.add("tree-node");
		instance.dom.side.addEventListener("click", e => e.stopPropagation());

	 	instance.dom.side_image = document.createElement("img");
		instance.dom.side_toggle = document.createElement("button");
		instance.dom.side_toggle.classList.add("folder-toggle");
		instance.dom.side_toggle.appendChild(instance.dom.side_image);
		instance.dom.side.appendChild(instance.dom.side_toggle);

		instance.dom.side_toggle.addEventListener("click", e => {
			if ((node.isParentFolder ? instance.state_side : instance.state) === "open") {
				updateFolderState(node, "closed", node.isParentFolder ? "side" : null);
				if (!node.isParentFolder && instance === current_instance) navigate(instance.parent);
				e.stopImmediatePropagation();
			}
		});

		const link = document.createElement("a");
		link.textContent = node.name || node.title || node.content;
		link.addEventListener("click", () => {
			if (testWithinCurrentPath(instance)) show(instance);
			else navigate(instance);
		});
		instance.dom.side.appendChild(link);
		if (instance.dom.main) makeFolder(instance); // node within the current path

		updateFolderState(instance, initialState || (!instance.dom.main || instance === current_instance ? "open" : "closed"));

		const parent = instance.parent;
		if (parent.node !== root && !parent.node.isParentFolder) makeParentFolder(parent.node);
		parent.dom.side_children.appendChild(instance.dom.side);
	}
}

function makeParentFolder(folder) {
	// console.log(`Turning node ${folder.id} into a parent folder`);
	folder.isParentFolder = true;
	for (const instance of folder.instances) {
		updateFolderState(instance);
		instance.dom.side_toggle.addEventListener("click", e => {
			if (instance.state_side === "closed") updateFolderState(instance, "open", "side");
		});
		instance.dom.side_children = document.createElement("ol");
		instance.dom.side.appendChild(instance.dom.side_children);
	}
}

function show(instance) {
	if (!instance.dom.main) throw new Error(`the instance is not in the current view`);
	if (instance.node.isParentNode) updateFolderState(instance, "open", "main");
	for (const ancestor of getHierarchy(instance.parent)) updateFolderState(ancestor, "open", "main");
	instance.dom.main.scrollIntoView();
}

function navigate(instance) {
	if (!instance.node.isParentNode) throw new Error(`navigate() was called with a terminal node`);
	const old = current_instance;
	clear(old.dom.children);
	if (old.dom.main && old.dom.main !== current) old.dom.main.remove();
	old.dom.main = null;
	current_instance = instance;
	clear(current);
	if (instance.node !== root) {
		addContentTo(instance, current);
		updateFolderState(instance, "open");
	}
	instance.dom.children = old.dom.children;
	if (instance.children.length === 0) addAddButton(instance);
	traverse(instance.node, (instance, options) => {
		if (instance.dom.main) {
			instance.dom.main.setAttribute("data-depth", getDepth(instance));
		} else {
			addMainContent(instance);
			if (instance.node.isParentNode) {
				makeFolder(instance);
				updateFolderState(instance);
			}
		}
		if (options.force || !instance.dom.main.parentNode) {
			instance.parent.dom.children.appendChild(instance.dom.main);
			addAddButton(instance);
		}
		return	{stop: !instance.node.isParentNode, force: false};
	}, {force: true});
	current.hidden = instance.node === root;
	updateCurrentPath();
}

function traverse(node, cb, options) {
	for (const child of node.children) {
		const ret = cb(child.instances.find(i => i.parent.node === node), options);
		if (!ret.stop) traverse(child, cb, ret);
	}
}

function updateFolderState(instance, state, scope) {
	if (!instance.node.isParentNode) throw new Error(`A terminal node got an attempt to set folder state`);
	if (state) {
		if (scope !== "main") instance.state_side = state;
		if (scope !== "side") instance.state = state;
	}
	if (instance.state_side === "open") {
		instance.dom.side.classList.remove("closed");
		instance.dom.side_image.alt = "Close";
	} else if (instance.state_side === "closed") {
		instance.dom.side.classList.add("closed");
		instance.dom.side_image.alt = instance.node.isParentFolder ? "Open" : "";
	}
	if (instance.node.isParentFolder) {
		instance.dom.side_image.src = instance.state_side === "open" ? IMG_CLOSE : IMG_OPEN;
	} else {
		// there's nothing under the folder to show, so it's nicer to reflect actual state
		instance.dom.side_image.src = instance.state === "open" ? "./folder-open.svg" : "./folder.svg";
	}

	if (instance.dom.main && instance !== current_instance) {
		if (instance.state === "open") {
			instance.dom.main.classList.remove("closed");
			instance.dom.main_image.src = IMG_CLOSE;
			instance.dom.main_image.alt = "Close";
		} else if (instance.state === "closed") {
			instance.dom.main.classList.add("closed");
			instance.dom.main_image.src = IMG_OPEN;
			instance.dom.main_image.alt = "Open";
		}
	}
}

function setMovingState(instance, state) {
	instance.copying = state;
	if (instance.copying) {
		instance.dom.button_move_image.src = IMG_COPY;
		instance.dom.button_move_image.alt = "Copy";
	} else {
		instance.dom.button_move_image.src = IMG_MOVE;
		instance.dom.button_move_image.alt = "Move";
	}
}

const reader = new commonmark.Parser();
const writer = new commonmark.HtmlRenderer({safe: true, softbreak: "<br>"});
const parser = new DOMParser();

function md(string) {
	const parsed = reader.parse(string);
	return writer.render(parsed);
}

function transformElement(child) {
	if (child.tagName === "A" && child.getAttribute("href").startsWith("#")) {
		const id = Number.parseInt(child.getAttribute("href").substring(1));
		child.removeAttribute("href");
		child.addEventListener("click", () => {
			const target = objects_load.get(id);
			if (!target) throw new Error(`post id ${id} not found`);
			if (target.dom.main) show(target);
			else navigate(target);
			history.replaceState({}, "", `?current=${current_id}&target=${id}`);
		});
	}
}

function addHTML(parent, string) {
	for (const child of parser.parseFromString(string, "text/html").body.children) {
		traverseHTML(child, transformElement);
		parent.appendChild(child);
	}
}

function traverseHTML(el, cb) {
	for (const child of el.children) {
		cb(child);
		traverseHTML(child);
	}
}

function clear(domNode) {
	while (domNode.lastChild) {
  	domNode.removeChild(domNode.lastChild);
	}
}

main();