
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
const style_target = document.getElementById('target').sheet;
const initial_view_path = query.has("current") ? JSON.parse(query.get("current")) : [20, 21];
let current_instance;
let you = 23;
let path = "";
const map_pending = new Map();
const objects = new Map();
let postingContainer;
let postingIndex;
let nextid = -1;
let dy = 0;
const root_children = [20];
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
const IMG_OPEN = "angle-right.svg";
const IMG_CLOSE = "angle-down.svg";
const IMG_MOVE = "arrows-alt.svg";
const IMG_COPY = "copy.svg";
let init_done = false;

class Node {
	makeParentNode() {
		// console.log(`Turning node ${node.id} into a parent node`);
		this.isParentNode = true;
		for (const instance of this.potential_placements[0].instances) instance.dom.addButton.hidden = null;
		for (const instance of this.instances) instance.makeParentInstance();
	}

	traverse(cb) {
		for (let i = 0; i < this.children.length; i++) {
			const child = this.children[i];
			const ret = cb(this, child, i, this.child_instances[i]);
			if (!(ret && ret.stop)) child.traverse(cb);
		}
	}

	addChild(node, index, added) {
		if (!this.isParentNode) this.makeParentNode();
		node.parents.push(this);
		if (!added) this.children.splice(index, 0, node);
		this.child_instances.splice(index, 0, []);
		for (const instance of this.instances) makeInstance({parent: instance, dom: {}, node: node});
		new PotentialPlacement(this, index !== undefined ? index + 1 : Infinity);
	}

	removeChild(node) {
		node.parents.splice(node.parents.indexOf(this), 1);
		const index = this.children.indexOf(node);
		this.children.splice(index, 1);
		for (const instance of this.child_instances[index]) instance.remove();
	}
}

function makeNode(object) {
	Object.setPrototypeOf(object, Node.prototype);
	if (object.type === "post" || object.type === "folder") {
		if (!object.children) object.children = [];
		object.potential_placements = [];
		object.instances = [];
		new PotentialPlacement(object);
		object.child_instances = [];
		object.parents = [];
		object.author = objects.get(object.author);
		if (!init_done) for (let i = 0; i < object.children.length; i++) object.children[i] = objects.get(object.children[i]);
	} else if (object.type === "user") {
		// TBD
	}
	if (object === root) makeInstance({node: object, dom: {side_children: index}});
	return object;
}

class Instance {
	getHierarchy() {
		const hierarchy = [];
		for (let instance = this; instance.parent; instance = instance.parent) hierarchy.unshift(instance);
		return hierarchy;
	}

	addMainContent() {
		this.dom.children = document.createElement("ol");
		this.dom.children.classList.add("children");
		if (this === current_instance) {
			this.dom.main = mainpane;
			this.dom.content = current;
			this.dom.children.id = "children";
		} else {
			this.dom.main = document.createElement("li");
			this.dom.content = document.createElement("article");
			this.dom.main.classList.add("bordered");
			this.updateDepth();
			this.dom.main.appendChild(this.dom.content);
		}
		this.addContentTo(this.dom.content);
		if (this.node.isParentNode) this.dom.content.classList.add("folder");
	}

	addChildrenList() {
		this.dom.main.appendChild(this.dom.children);
		for (const place of this.node.potential_placements) place.addInstance(this);
	}

	makeParentInstance() {
		this.dom.side = document.createElement("li");
		this.dom.side.classList.add("tree-node");
		this.dom.side.addEventListener("click", e => e.stopPropagation());

		this.dom.side_image = document.createElement("img");
		this.dom.side_toggle = document.createElement("button");
		this.dom.side_toggle.classList.add("folder-toggle");
		this.dom.side_toggle.appendChild(this.dom.side_image);
		this.dom.side.appendChild(this.dom.side_toggle);

		this.dom.side_toggle.addEventListener("click", e => {
			if ((this.node.isParentFolder ? this.state_side : this.state) === "open") {
				this.updateFolderState("closed", this.isParentFolder ? "side" : null);
				if (!this.node.isParentFolder && this === current_instance) this.parent.navigate();
				e.stopImmediatePropagation();
			}
		});

		const link = document.createElement("a");
		link.textContent = this.node.name || this.node.title || this.node.content;
		link.addEventListener("click", () => {
			if (this.testWithinCurrentPath()) this.show();
			else this.navigate();
		});
		this.dom.side.appendChild(link);

		const current = this.testWithinCurrentPath();
		if (current) this.dom.content.classList.add("folder");
		this.updateFolderState(!current || this === current_instance ? "open" : "closed");

		if (this.parent.node !== root && !this.parent.isParentFolderInstance) this.parent.makeParentFolderInstance();
		const index = this.parent.children.indexOf(this) + 1;
		const ref = index < this.parent.children.length ? this.parent.children[index].dom.side : null;
		this.parent.dom.side_children.insertBefore(this.dom.side, ref);
	}

	makeParentFolderInstance() {
		this.node.isParentFolder = true;
		this.isParentFolderInstance = true;
		this.updateFolderState();
		this.dom.side_toggle.addEventListener("click", e => {
			if (this.state_side === "closed") this.updateFolderState("open", "side");
		});
		this.dom.side_children = document.createElement("ol");
		this.dom.side.appendChild(this.dom.side_children);
	}

	testWithinCurrentPath() {
		for (let instance = this; instance; instance = instance.parent) if (instance === current_instance) return true;
		return false;
	}

	updateDepth() {
		let depth = 0;
		for (let instance = this; instance.parent && instance.parent !== current_instance; depth++) instance = instance.parent;
		this.dom.main.setAttribute("data-depth", depth);
	}

	addContentTo(container) {
		const showUserProfile = () => alert("some user profile to be shown");
		const icon = document.createElement("img");
		icon.classList.add("icon");
		icon.src = this.node.author.avatar;
		icon.addEventListener("click", showUserProfile);
		container.appendChild(icon);
		const header = document.createElement("header");
		const username = document.createElement("address");
		username.classList.add("username");
		username.textContent = this.node.author.name;
		username.addEventListener("click", showUserProfile);
		header.appendChild(username);
		const time = document.createElement("time");
		//username.classList.add("username");
		time.textContent = (new Date(Date.parse(this.node.created))).toLocaleString(navigator.language, {
			year: "numeric",
			month: "numeric",
			day: "numeric",
			hour: "numeric",
			minute: "numeric"
		});
		time.dateTime = this.node.created;
		header.appendChild(time);
		container.appendChild(header);
		if (this.node.type === "folder") container.appendChild(this.makeTitle(this.node.name));
		else if (this.node.type === "post") {
			if (this.node.title) container.appendChild(this.makeTitle(this.node.title));
			addHTML(container, md(this.node.content));
		}

		if (this !== current_instance) {
			this.dom.main_image = document.createElement("img");
			this.dom.main_image.src = IMG_ADD;
			this.dom.button_children = document.createElement("button");
			this.dom.button_children.appendChild(this.dom.main_image);
			header.appendChild(this.dom.button_children);

			this.dom.button_children.addEventListener("click", e => {
				if (this.node.isParentNode) {
					if (this.state === "open") this.updateFolderState("closed", "main");
					else this.updateFolderState("open");
				} else setPostingScope(this, Infinity);
			});

			this.dom.button_move_image = document.createElement("img");
			this.dom.button_move_image.alt = "Continue Conversation";
			this.setMovingState(false);
			this.dom.button_move_image.draggable = false;
			this.dom.button_move = document.createElement("button");
			this.dom.button_move.appendChild(this.dom.button_move_image);
			header.appendChild(this.dom.button_move);

			this.dom.button_move.addEventListener("pointerdown", e => {
				if (!holding.node) {
					holding.instance = this;
					holding.id = e.pointerId;
					holding.moving = false;
					holding.y = e.clientY;
				}
			});
		}
	}

	makeTitle(text) {
		const title = document.createElement("h1");
		const a = document.createElement("a");
		a.textContent = text;
		a.addEventListener("click", () => {
			if (this !== current_instance && this.node.isParentNode) this.navigate();
		});
		title.appendChild(a);
		return title;
	}

	updateFolderState(state, scope) {
		if (!this.node.isParentNode) throw new Error(`A terminal node got an attempt to set folder state`);
		if (state) {
			if (!scope || scope === "main") this.state = state;
			if (!scope || scope === "side") this.state_side = state;
		}
		if (this.state_side === "open") {
			this.dom.side.classList.remove("closed");
			this.dom.side_image.alt = "Close";
		} else if (this.state_side === "closed") {
			this.dom.side.classList.add("closed");
			this.dom.side_image.alt = this.node.isParentFolder ? "Open" : "";
		}
		if (this.node.isParentFolder) {
			this.dom.side_image.src = this.state_side === "open" ? IMG_CLOSE : IMG_OPEN;
		} else {
			// there's nothing under the folder to show, so it's nicer to reflect actual state
			this.dom.side_image.src = this.state === "open" ? "./folder-open.svg" : "./folder.svg";
		}

		if (this.testWithinCurrentPath() && this !== current_instance) {
			if (this.state === "open") {
				this.dom.main.classList.remove("closed");
				this.dom.main_image.src = IMG_CLOSE;
				this.dom.main_image.alt = "Close";
			} else if (this.state === "closed") {
				this.dom.main.classList.add("closed");
				this.dom.main_image.src = IMG_OPEN;
				this.dom.main_image.alt = "Open";
			}
		}
	}

	setMovingState(state) {
		this.copying = state;
		if (this.copying) {
			this.dom.button_move_image.src = IMG_COPY;
			this.dom.button_move_image.alt = "Copy";
		} else {
			this.dom.button_move_image.src = IMG_MOVE;
			this.dom.button_move_image.alt = "Move";
		}
	}

	show() {
		if (!this.testWithinCurrentPath()) throw new Error(`the instance is not in the current view`);
		for (const ancestor of (this.node.isParentNode ? this : this.parent).getHierarchy()) {
			ancestor.updateFolderState("open", "main");
		}
		this.dom.main.scrollIntoView();
	}

	navigate() {
		if (!this.node.isParentNode) throw new Error(`navigate() was called with a terminal node`);
		const old = current_instance;
		clear(old.dom.children);
		for (const place of old.node.potential_placements) {
			place.instances.splice(place.instances.findIndex(i => i.instance === old), 1);
		}
		old.dom.main = null;
		old.dom.content = null;
		current_instance = this;
		clear(current);
		if (this.dom.main && this.dom.main.parentNode) this.dom.main.parentNode.removeChild(this.dom.main);
		this.dom.children = old.dom.children;
		if (this.node !== root) {
			this.addContentTo(current);
			this.updateFolderState("open");
		}
		this.traverse((instance, options) => {
			const ret = {stop: !instance.node.isParentNode, force: false};
			if (instance.dom.main) {
				if (options.force || !instance.dom.main.parentNode) instance.display();
			} else {
				instance.addMainContent();
				if (instance.node.isParentNode) instance.updateFolderState();
				instance.display();
				ret.onBubble = () => instance.addChildrenList();
			}
			return ret;
		}, {force: true});
		this.traverse(instance => instance.updateDepth());
		const index = this.node.instances.indexOf(this);
		if (!this.dom.main) for (const place of this.node.potential_placements) place.addInstance(this);
		else for (const place of this.node.potential_placements) place.display(place.instances[index]);
		current.hidden = this.node === root;
		updateCurrentPath();
	}

	traverse(cb, options) {
		for (const child of this.children) {
			const ret = cb(child, options);
			if (ret) {
				if (!ret.stop) child.traverse(cb, ret);
				if (ret.onBubble) ret.onBubble();
			} else child.traverse(cb);
		}
	}

	remove() {
		if (this.dom.side) this.dom.side.remove();
		if (this.dom.main) this.dom.main.remove();
		const child_instances = this.parent.node.child_instances[this.getIndex()];
		child_instances.splice(child_instances.indexOf(this), 1);
		this.node.instances.splice(this.node.instances.indexOf(this), 1);
	}

	addChild(child, index) {
		child.parent = this;
		if (index === undefined) index = this.node.children.indexOf(child.node);
		this.children.splice(index, 0, child);
		this.node.child_instances[index].push(child);
	}

	display() {
		const index = this.parent.children.indexOf(this);
		let ref = null;
		for (let i = index + 1; i < this.parent.children.length; i++) {
			if (!this.parent.children[i].dom.main ||
				this.parent.children[i].dom.main.parentNode !== this.parent.dom.children) continue;
			ref = this.parent.children[i].dom.main;
			break;
		}
		if (ref && !ref.classList.contains("add") && ref.previousSibling.classList.contains("add")) ref = ref.previousSibling;
		this.parent.dom.children.insertBefore(this.dom.main, ref);
	}

	getIndex() {
		return this.parent.node.child_instances.findIndex(instances => instances.includes(this));
	}
}

function makeInstance(object, makeChildren, index) {
	Object.setPrototypeOf(object, Instance.prototype);
	object.children = [];
	object.node.instances.push(object);
	const render = object.parent && object.parent.testWithinCurrentPath();
	if (render) {
		object.addMainContent();
		object.addChildrenList();
	}
	if (object.parent) {
		if (object.node.isParentNode) object.makeParentInstance();
		if (object.node.isParentFolder) object.makeParentFolderInstance();
	}
	if (makeChildren) {
		for (const child of object.node.children) makeInstance({parent: object, dom: {}, node: child}, true);
	}
	if (object.parent) {
		object.parent.addChild(object, index);
		if (render) object.display();
	}
	if (!init_done) {
		const hierarchy = object.getHierarchy();
		if (hierarchy.length === initial_view_path.length &&
			hierarchy.every((a, i) => a.node.id === initial_view_path[i])) {
			current_instance = object;
			object.addMainContent();
			object.addChildrenList();
		}
	}
	return object;
}

class PotentialPlacement {
	constructor(node, index) {
		this.node = node;
		this.instances = [];
		node.potential_placements.splice(index, 0, this);
		this.index = node.potential_placements.indexOf(this); // normalize negative index and others
		for (let i =  this.index + 1; i < node.potential_placements.length; i++) {
			node.potential_placements[i].index++;
		}
		for (const instance of node.instances) if (instance.dom.children) this.addInstance(instance);
	}

	addInstance(instance) {
		const addButton = document.createElement("button");
		addButton.classList.add("add");
		const image = document.createElement("img");
		image.src = IMG_ADD;
		addButton.appendChild(image);
		addButton.addEventListener("click", e => setPostingScope(instance, this.index));
		addButton.hidden = !instance.node.isParentNode;
		this.instances.push({instance: instance, dom: {addButton: addButton}});
		this.display(this.instances[this.instances.length - 1]);
	}

	removeInstance(instance) {
		instance.dom.addButton.remove();
		this.instances.splice(this.instances.indexOf(instance), 1);
	}

	display(instance) {
		const ref = this.index >= 0 && this.index < instance.instance.children.length ?
			instance.instance.children[this.index].dom.main : null;
		instance.instance.dom.children.insertBefore(instance.dom.addButton, ref);
	}

	remove() {
		for (const instance of this.instances) this.removeInstance(instance);
		this.node.potential_placements.splice(this.node.potential_placements.indexOf(this), 1);
	}
}

const root = {type: "folder", children: root_children, id: -1, isParentNode: true};

async function main() {
	//if (current_id === -1) makeFolder(root);
	const response = await fetch("https://axion014.github.io/content/graft-demo/data.json");
	const data = await response.json();
	objects.set(-1, root);
	for (const node of data) {
		if (nextid <= node.id) nextid = node.id + 1;
		objects.set(node.id, node);
	}
	makeNode(root);
	for (const node of data) makeNode(node);
	root.traverse((node, child, index) => node.addChild(child, index, true));
	updateCurrentPath();
	document.getElementById('tree-home').addEventListener('click', () => root.instances[0].navigate());
	sendbutton.addEventListener('click', () => {
		const node = makeNode({
			type: "post",
			id: nextid,
			content: input.value,
			author: you,
			created: (new Date()).toISOString(),
		});
		if (!postingContainer.node.isParentNode) postingContainer.node.makeParentNode();
		postingContainer.node.addChild(node, postingIndex);
		postingContainer.updateFolderState("open");
		input.value = "";
		objects.set(node.id, node);
		nextid++;
	});
	for (let i = 0; i < max_nesting; i++) style.insertRule(`[data-depth="${i}"] {
	background-color: ${background_colors[i]};
}`);

	current.hidden = current_instance.node === root;
	if (query.has("target")) getInstance(JSON.parse(query.get("target"))).show();

	const getTargetPlace = (parent, index) => {
		return parent.node.potential_placements[index].instances[parent.node.instances.indexOf(parent)];
	};
	window.addEventListener("pointermove", e => {
		if (holding.instance && e.pointerId === holding.id) {
			if (holding.moving || Math.abs(e.clientY - holding.y) >= MOVING_MARGIN) {
				const holding_rect = holding.instance.dom.main.getBoundingClientRect();
				const rect = mainpane.getBoundingClientRect();
				if (!holding.moving) {
					style_target.insertRule(`.add.target {
	margin-top: calc(${holding_rect.height}px - 0.35em - 2px);
}`);
					holding.moving = true;
					if (holding.instance.copying) {
						holding.instance = makeInstance({
							parent: holding.instance.parent, dom: {}, node: holding.instance.node
						}, true);
						if (holding.isParentNode) holding.instance.updateFolderState("closed");
						holding.instance.setMovingState(true);
					}
					holding.instance.dom.main.style.top = `${mainpane.scrollTop + holding_rect.top - rect.top}px`;
					holding.instance.dom.main.style.width = window.getComputedStyle(holding.instance.dom.main).width;
					holding.instance.dom.main.classList.add("holding");
					holding.parent = holding.instance.parent;
					holding.index = holding.instance.getIndex();
					if (!holding.instance.copying) {
						getTargetPlace(holding.parent, holding.index + 1).dom.addButton.hidden = true;
					}
					const targetPlace = getTargetPlace(holding.parent, holding.index);
					targetPlace.dom.addButton.classList.add("target");
					targetPlace.dom.addButton.classList.add("initial-target");
				}
				const top = rect.top + SCROLLING_MARGIN;
				const bottom = rect.bottom - SCROLLING_MARGIN - holding_rect.height;
				const y = Math.min(Math.max(e.clientY, top), bottom);
				holding.instance.dom.main.style.transform = `translateY(${y - holding.y}px)`;
				dy = 0;
				if (e.clientY < top) dy = e.clientY - rect.top - SCROLLING_MARGIN;
				if (e.clientY > bottom) dy = e.clientY + SCROLLING_MARGIN + holding_rect.height - rect.bottom;
				let found = false;
				const holding_center_y = holding_rect.top + holding_rect.height / 2;
				let prev;
				let prevdy = -Infinity;
				const setTarget = (target, offset) => {
					const index = target.getIndex() + (offset || 0);
					const oldTargetPlace = getTargetPlace(holding.parent, holding.index);
					const targetPlace = getTargetPlace(target.parent, index);
					if (targetPlace !== oldTargetPlace) {
						oldTargetPlace.dom.addButton.classList.remove("target");
						oldTargetPlace.dom.addButton.classList.remove("initial-target");
						targetPlace.dom.addButton.classList.add("target");
					}
					holding.parent = target.parent;
					holding.index = index;
				};
				current_instance.traverse(instance => {
					if (found || instance === holding.instance) {
						prev = instance;
						return {stop: true};
					}
					const rect = instance.dom.main.getBoundingClientRect();
					const dy = rect.top + rect.height / 2 - holding_center_y;
					if (Math.abs(dy) < rect.height / 5) {
						setTarget(instance);
					} else if (dy > 0) {
						if (prev === holding.instance) {
							setTarget(prev);
						} else {
							if (dy < -prevdy) setTarget(instance);
							else setTarget(prev, 1);
						}
						found = true;
						return {stop: true};
					} else {
						prev = instance;
						prevdy = dy;
					}
					return {stop: instance.state !== "open"};
				});
				if (!found) setTarget(prev, 1);
			}
		}
	});
	window.addEventListener("pointerup", e => {
		if (holding.instance && e.pointerId === holding.id) {
			if (holding.moving) {
				holding.instance.dom.main.classList.remove("holding");
				holding.instance.dom.main.style.transform = null;
				holding.instance.dom.main.style.width = null;
				holding.instance.dom.main.style.top = null;
				const targetPlace = getTargetPlace(holding.parent, holding.index);
				targetPlace.dom.addButton.classList.remove("initial-target");
				targetPlace.dom.addButton.classList.remove("target");

				targetPlace.dom.addButton.classList.add("dropping");
				// wait until transition: none take effect
				setTimeout(() => targetPlace.dom.addButton.classList.remove("dropping"), 100);

				const node = holding.instance.node;
				const oldparent = holding.instance.parent.node;
				const newparent = holding.parent.node;
				const oldindex = holding.instance.getIndex();
				getTargetPlace(holding.parent, oldindex + 1).dom.addButton.hidden = null;
				const target = newparent.potential_placements[holding.index];
				if (oldparent === newparent && holding.index > oldindex) holding.index--;
				let side_ref_instances;
				if (node.isParentNode) for (let i = holding.index; i < newparent.children.length; i++) {
					if (newparent.children[i].isParentNode) {
						side_ref_instances = newparent.child_instances[i];
						break;
					}
				}
				newparent.children.splice(holding.index, 0, node);
				if (holding.instance.copying) {
					node.parents.push(newparent);
					// Move the temporary instance used for dragging
					oldparent.child_instances[oldindex].splice(oldparent.child_instances[oldindex].indexOf(holding.instance), 1);
					if (oldparent.child_instances[oldindex].length === 0) oldparent.child_instances.splice(oldindex, 1);
					newparent.child_instances.splice(holding.index, 0, []);
					newparent.instances[0].children.splice(newparent.instances[0].children.indexOf(holding.instance), 1);
					newparent.instances[0].addChild(holding.instance, holding.index);
					newparent.instances[0].dom.children.insertBefore(holding.instance.dom.main, target.instances[0].dom.addButton);
					if (node.isParentNode) {
						if (!newparent.instances[0].isParentFolderInstance) newparent.instances[i].makeParentFolderInstance();
						newparent.instances[0].dom.side_children.insertBefore(holding.instance.dom.side,
							side_ref_instances ? side_ref_instances[0].dom.side : null);
					}
					for (let i = 1; i < newparent.instances.length; i++) {
						makeInstance({parent: newparent.instances[i], dom: {}, node: node}, true, holding.index);
					}
				} else {
					node.parents[node.parents.indexOf(oldparent)] = newparent;
					oldparent.potential_placements[oldindex].remove();
					oldparent.children.splice(oldindex, 1);
					const old_instances = oldparent.child_instances[oldindex];
					oldparent.child_instances.splice(oldindex, 1);
					for (let i = 0; i < newparent.instances.length; i++) {
						if (old_instances.length > 0) {
							const instance = old_instances.shift();
							newparent.child_instances.splice(holding.index, 0, []);
							newparent.instances[i].addChild(instance, holding.index);
							instance.updateDepth();
							newparent.instances[i].dom.children.insertBefore(instance.dom.main, target.instances[i].dom.addButton);
							if (instance.node.isParentNode) {
								if (!newparent.instances[i].isParentFolderInstance) newparent.instances[i].makeParentFolderInstance();
								newparent.instances[i].dom.side_children.insertBefore(instance.dom.side,
									side_ref_instances ? side_ref_instances[i].dom.side : null);
							}
						} else {
							makeInstance({parent: newparent.instances[i], dom: {}, node: node});
						}
					}
					for (const instance of old_instances) instance.remove();
				}
				new PotentialPlacement(newparent, holding.index);
				dy = 0;
				style_target.deleteRule(0);
			} else {
				holding.instance.setMovingState(!holding.instance.copying);
			}
			holding.instance = null;
		}
	});
	setInterval(() => {
		if (holding.instance && holding.moving) {
			dy = Math.min(
				Math.max(dy, -mainpane.scrollTop),
				mainpane.scrollHeight - mainpane.scrollTop - mainpane.clientHeight
			);
			if (dy !== 0) {
				mainpane.scrollBy(0, dy);
				holding.y -= dy;
			}
		}
	}, 50 / 3);
	init_done = true;
}

function getInstance(id_hierarchy) {
	let i = id_hierarchy.length - 1;
	let instances = objects.get(id_hierarchy[i]).instances;
	for (; i >= 0; i--) {
		instances = instances.filter(instance => instance.parent.node.id === id_hierarchy[i - 1]);
		if (instances.length === 1) return instances[0];
	}
}

function generatePath(hierarchy) {
	let path = "";
	if (hierarchy.length) for (let i = 0;; i++) {
		const node = hierarchy[i].node;
		path += node.name || node.title || node.content;
		if (i === hierarchy.length - 1) break;
		path += "/";
	}
	return path;
}

function updateCurrentPath() {
	clear(current_label);
	const hierarchy = current_instance.getHierarchy();
	path = generatePath(hierarchy);
	const foldernames = path.split("/");
	for (let i = 0;; i++) {
		if (i === foldernames.length - 1) {
			current_label.appendChild(document.createTextNode(foldernames[i]));
			break;
		}
		const a = document.createElement("a");
		a.textContent = foldernames[i];
		a.addEventListener("click", e => hierarchy[i].navigate());
		current_label.appendChild(a);
		current_label.appendChild(document.createTextNode("/"));
	}
	postingIndex = Infinity;
	postingContainer = current_instance;
	input.placeholder = path ? `${path} への書き込み` : "書き込み";
}

function setPostingScope(instance, index) {
	postingIndex = index;
	postingContainer = instance;
	const path = generatePath(instance.getHierarchy());
	input.placeholder = path ? `${path} への書き込み` : "書き込み";
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
			const target = objects.get(id);
			if (!target) throw new Error(`post id ${id} not found`);
			if (target.dom.main) target.show();
			else target.navigate();
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

window.objects = objects;

main();