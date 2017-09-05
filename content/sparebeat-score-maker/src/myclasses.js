phina.define("Infiniteof", {
  superClass: 'phina.display.DisplayElement',
  init: function(source, gap, sendindex) {
    this.superInit();
    this.source = source;
    this.gap = gap;
    this.sendindex = sendindex;
		this.reset();
  },
  draw: function() {
    var scene = this.getRoot();
    var globalpos = this.globalPosition;
    var backrate = -Math.floor(Math.min(globalpos.x / this.gap.x, globalpos.y / this.gap.y));
    var base = this.gap.clone().mul(backrate + 1);
    for(var pos = this.gap.clone().mul(backrate - 1), i = 0; pos.x - base.x < scene.width && pos.y - base.y < scene.height;
        pos = pos.clone().add(this.gap), i++) {
			if (i + backrate >= this.nodemin && i + backrate < this.nodemax) continue;
      var node = this.source(this.sendindex ? i + backrate : undefined).addChildTo(this);
			node.position = pos;
			node._i = i + backrate;

			scene.app.updater.update(node);
    }
		this.children.each(function(child) {
			(child._i < backrate || child._i > i + backrate) && child.has('removed') && child.flare('removed');
		});
    this.children = this.children.filter(function(child) {
			return child._i >= backrate && child._i < i + backrate;
		});
		this.nodemin = backrate;
		this.nodemax = i + backrate;
  },
	reset: function() {
		this.nodemin = Infinity;
		this.nodemax = -Infinity;
		this.children.each(function(child) {
			child.has('removed') && child.flare('removed');
		});
    this.children = [];
	}
});

// 親子関係のルートから順番に格納された配列
phina.app.Element.prototype.getter('sequence', function() {
  var sequence = [];
  for(var n = this; n;) {
    sequence.unshift(n);
    n = n.parent;
  }
  return sequence;
});

// 要素の絶対座標
phina.app.Object2D.prototype.getter('globalPosition', function() {
  this.sequence.each(function(val) {val._calcWorldMatrix && val._calcWorldMatrix()});
  // this._worldMatrix.clone().multiplyVector2(Vector2(0, 0))
  return phina.geom.Vector2(this._worldMatrix.m02, this._worldMatrix.m12);
});
