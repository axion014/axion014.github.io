
var SCREEN_WIDTH = 960;
var SCREEN_HEIGHT = 640;
var SCREEN_CENTER_X = SCREEN_WIDTH / 2;
var SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

phina.globalize();

phina.display.DisplayScene.defaults.$extend({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
});
phina.game.LoadingScene.defaults.$extend({
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT
});

phina.ui.Button.defaults.$extend({
  width: 160,
  height: 64,
  fontSize: 24
});

var NOTHING = 0;
var NORMAL = 1;
var ATTACK = 2;
var LONG_START = 3;
var LONG_END = 4;

var START = 5;
var END = 6;

var LANES = [0, 1, 2, 3, "bind", "random"];

function colorOf(id) {
  if (id === NOTHING) return 'black';
  else if (id === NORMAL) return '#2222bb';
  else if (id === ATTACK) return '#aa0000';
  else if (id === LONG_START) return '#aaaa00';
  else if (id === LONG_END) return '#00aaaa';
}

phina.define('MainScene', {
  superClass: 'phina.display.DisplayScene',
  init: function() {
    this.superInit();
    this.notetype = NORMAL;
    this.level = "normal";
    this.json = {
      title: "",
      artist: "",
      bpm: 120,
      startTime: 80,
      level: {
        easy: 4,
        normal: 7,
        hard: 9
      },
      map: {}
    };
    this.time = {                  easy: 5,         normal: 5,          hard: 5};
    this.notesdata = {            easy: [],         normal: [],        hard: []};
    this.tripletnotesdata = {      easy: [],         normal: [],        hard: []};
    this.notesCount = {            easy: 0,         normal: 0,          hard: 0};
    this.notesCountofBar = {      easy: [],         normal: [],        hard: []};
    this.attackNotesCount = {      easy: 0,         normal: 0,          hard: 0};
    this.attackNotesCountofBar = {easy: [],         normal: [],        hard: []};
    this.lengths = {              easy: Lengths(), normal: Lengths(), hard: Lengths()};
    this.score = DisplayElement({x: SCREEN_CENTER_X, y: SCREEN_HEIGHT}).addChildTo(this);
    this.dencitygraph = DisplayElement().addChildTo(this);
    this.dencitygraph.alpha = 0.3;
    this.limitline = PathShape({x: 8 + 240 / 9, strokeWidth: 2, paths: [Vector2(0, 0), Vector2(0, SCREEN_HEIGHT)]}).addChildTo(this);
    Label({x: 35, y: 600, fontSize: 12, text: "10notes/s"}).addChildTo(this.limitline);
    this.notesCountofBar.forIn(function(k, v) {v.fill(0, 0, 5)});
    this.attackNotesCountofBar.forIn(function(k, v) {v.fill(0, 0, 5)});
    this.currentpos = RectangleShape({
      width: 100,
      height: 10,
      x: 48,
      y: 629,
      fill: "gray",
      stroke: null
    }).addChildTo(this);
    this.currentpos.alpha = 0.3;
    this.extend = Button({x: -320, y: -2360, text: "+", width: 48, height: 48}).on("pointstart", function() {
      this.time[this.level]++;
      if (this.lengths[this.level].length < this.time[this.level]) this.lengths[this.level].push(16);
      this.updateTime();
      this.save();
    }.bind(this)).addChildTo(this.score);
    this.cut = Button({x: -320, y: -1880, text: "-", width: 48, height: 48}).on("pointstart", function() {
      this.time[this.level]--;
      this.lengths[this.level].cut();
      this.updateTime();
      this.save();
    }.bind(this)).addChildTo(this.score);
    this.s = Infiniteof(function(i) {
      i = -i;
      if (this.lengths[this.level].sum.includes(i) || i === 0) {
        var group = DisplayElement();
        PathShape({paths: [Vector2(-1000, 0), Vector2(1000, 0)], y: 29}).addChildTo(group);
        Label({
          x: -360, y: 14,
          text: i === 0 ? 0 : this.lengths[this.level].sum.indexOf(i) + 1,
          fontFamily: "Nova Mono"
        }).addChildTo(group);
        return group;
      }
      for (var j = 0; j < this.lengths[this.level].length; j++) {
        if (this.lengths[this.level].sum[j] > i) {
          if (this.lengths[this.level].diff[j] % 4 === 0 && (i - (j === 0 ? 0 : this.lengths[this.level].sum[j - 1])) % 4 === 3) return PathShape({paths: [Vector2(-1000, 0), Vector2(1000, 0)], y: -1, strokeWidth: 1, stroke: '#cccccc'});
          return Element();
        }
      }
      return Element();
    }.bind(this), Vector2(0, 30)).addChildTo(this.score);
    this.notes = Infiniteof(function(i) {
      if (!this.notesdata[this.level][-i]) {
        this.notesdata[this.level][-i] = [NOTHING, NOTHING, NOTHING, NOTHING];
        this.notesdata[this.level][-i].bind = NOTHING;
        this.notesdata[this.level][-i].random = NOTHING;
      }
      var group = DisplayElement();
      if (this.lengths[this.level].sum.includes(-i + 1)) {
        Button({x: -140, y: 24, text: "+", width: 36, height: 36}).on("pointstart", function() {
          var index = this.lengths[this.level].sum.indexOf(-i + 1);
          this.lengths[this.level].set(index, this.lengths[this.level].diff[index] + 1);
          this.notes.reset();
          this.updateTime();
          this.save();
        }.bind(this)).addChildTo(group);
      }
      if (this.lengths[this.level].sum.includes(-i + 3)) {
        Button({x: -140, y: 8, text: "-", width: 36, height: 36}).on("pointstart", function() {
          var index = this.lengths[this.level].sum.indexOf(-i + 3);
          this.lengths[this.level].set(index, this.lengths[this.level].diff[index] - 1);
          this.notes.reset();
          this.updateTime();
          this.save();
        }.bind(this)).addChildTo(group);
      }
      var self = this;
      var flag = false;
      LANES.each(function (lane) {
        if (this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3] && this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3][lane] !== NOTHING || this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3 + 1] && this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3 + 1][lane] !== NOTHING || this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3 + 2] && this.tripletnotesdata[this.level][Math.floor(-i / 2) * 3 + 2][lane] !== NOTHING) flag = true;
      }, this);
      if (flag) for (j = 0; j < 4; j++) {
        RectangleShape({x: -90 + j * 60, y: 14, width: 50, height: 25, fill: "#666666", stroke: null}).addChildTo(group);
      } else for (var j = 0; j < 4; j++) {
        RectangleShape({x: -90 + j * 60, y: 14, width: 50, height: 25, fill: colorOf(this.notesdata[this.level][-i][j]), stroke: null}).on("pointstart",
        function() {
          if (self.notesdata[self.level][this.i][this.lane]) {
            self.notesCount[self.level]--;
            self.notesCountofBar[self.level][Math.floor(this.i / 16)]--;
            if (self.notesdata[self.level][this.i][this.lane] === ATTACK) {
              self.attackNotesCount[self.level]--;
              self.attackNotesCountofBar[self.level][Math.floor(this.i / 16)]--;
            }
            self.notesdata[self.level][this.i][this.lane] = NOTHING;
          } else {
            self.notesCount[self.level]++;
            self.notesCountofBar[self.level][Math.floor(this.i / 16)]++;
            if (self.notetype === ATTACK) {
              self.attackNotesCount[self.level]++;
              self.attackNotesCountofBar[self.level][Math.floor(this.i / 16)]++;
            }
            self.notesdata[self.level][this.i][this.lane] = self.notetype;
          }
          this.fill = colorOf(self.notesdata[self.level][this.i][this.lane]);
          self.updateNotesCount();
          self.save();
          self.tripletnotes.reset();
        }).$safe({i: -i, lane: j}).setInteractive(true).addChildTo(group);
      }
      return group;
    }.bind(this), Vector2(0, 30)).addChildTo(this.score);
    this.tripletnotes = Infiniteof(function(i) {
      if (!this.tripletnotesdata[this.level][-i]) {
        this.tripletnotesdata[this.level][-i] = [NOTHING, NOTHING, NOTHING, NOTHING];
        this.tripletnotesdata[this.level][-i].bind = NOTHING;
        this.tripletnotesdata[this.level][-i].random = NOTHING;
      }
      var group = DisplayElement();
      var self = this;
      var flag = false;
      LANES.each(function (lane) {
        if (this.notesdata[this.level][Math.floor(-i / 3) * 2] && this.notesdata[this.level][Math.floor(-i / 3) * 2][lane] !== NOTHING || this.notesdata[this.level][Math.floor(-i / 3) * 2 + 1] && this.notesdata[this.level][Math.floor(-i / 3) * 2 + 1][lane] !== NOTHING) flag = true;
      }, this);
      if (flag) for (j = 0; j < 4; j++) {
        RectangleShape({x: -90 + j * 60, y: 8, width: 50, height: 16, fill: "#666666", stroke: null}).addChildTo(group);
      } else for (j = 0; j < 4; j++) {
        RectangleShape({x: -90 + j * 60, y: 8, width: 50, height: 16, fill: colorOf(this.tripletnotesdata[this.level][-i][j]), stroke: null}).on("pointstart",
        function() {
          if (self.tripletnotesdata[self.level][this.i][this.lane]) {
            self.notesCount[self.level]--;
            self.notesCountofBar[self.level][Math.floor(this.i / 24)]--;
            if (self.tripletnotesdata[self.level][this.i][this.lane] === ATTACK) {
              self.attackNotesCount[self.level]--;
              self.attackNotesCountofBar[self.level][Math.floor(this.i / 24)]--;
            }
            self.tripletnotesdata[self.level][this.i][this.lane] = NOTHING;
          } else {
            self.notesCount[self.level]++;
            self.notesCountofBar[self.level][Math.floor(this.i / 24)]++;
            if (self.notetype === ATTACK) {
              self.attackNotesCountofBar[self.level][Math.floor(this.i / 24)]++;
              self.attackNotesCount[self.level]++;
            }
            self.tripletnotesdata[self.level][this.i][this.lane] = self.notetype;
          }
          this.fill = colorOf(self.tripletnotesdata[self.level][this.i][this.lane]);
          self.updateNotesCount();
          self.save();
          self.notes.reset();
        }).$safe({i: -i, lane: j}).setInteractive(true).addChildTo(group);
      }
      return group;
    }.bind(this), Vector2(0, this.notes.pitch.y / 3 * 2), {x: 120}).hide().addChildTo(this.score);
    this.notesCountLabel = Label({
      text: "0 Notes\n0 Attack Notes\n0.00 Notes Per Second",
      fontSize: 22,
      fontFamily: "Nova Mono",
      align: "left",
      baseline: "top"
    }).setPosition(10, 35).addChildTo(this);
    var BUTTONS_X = 860;
    var notetype = Button({
      text: "Normal Notes",
      fill: colorOf(NORMAL),
      fontSize: 20
    }).setPosition(BUTTONS_X, 50).on("pointstart", function() {
      if (++this.notetype > LONG_END) this.notetype = NORMAL;
      notetype.text = ["Normal Notes", "Attack Notes", "Long-Start", "Long-end"][this.notetype - 1];
      notetype.fill = colorOf(this.notetype);
    }.bind(this)).addChildTo(this);
    Button({text: "Triplet"}).setPosition(BUTTONS_X, 130).on("pointstart", function() {
      this.tripletnotes.visible = !this.tripletnotes.visible;
      this.notes.x = this.tripletnotes.visible ? -120 : 0;
    }.bind(this)).addChildTo(this);

    var updateDifficutly = function(level) {
      this.level = level;
      this.fullUpdate();
      easyButton.fill = "#1abc9c";
      normalButton.fill = "#f1c40f";
      hardButton.fill = "#c0392b";
    }.bind(this);

    var easyButton = Button({text: "Easy", fill: "#1abc9c"}).setPosition(BUTTONS_X, 210).on("pointstart", function() {
      updateDifficutly("easy");
      easyButton.fill = "#18997a";
    }.bind(this)).addChildTo(this);
    var normalButton = Button({text: "Normal", fill: "#cea20a"}).setPosition(BUTTONS_X, 290).on("pointstart", function() {
      updateDifficutly("normal");
      normalButton.fill = "#cea20a";
    }.bind(this)).addChildTo(this)
    var hardButton = Button({text: "Hard", fill: "#c0392b"}).setPosition(BUTTONS_X, 370).on("pointstart", function() {
      updateDifficutly("hard");
      hardButton.fill = "#a43220";
    }.bind(this)).addChildTo(this);

    Button({text: "Load"}).setPosition(BUTTONS_X, 450).on("pointstart", function() {
      this.app.pushScene(LoadMenuScene(this));
    }.bind(this)).addChildTo(this);

    /*Button({text: "Metadata", fill: "#444444"}).setPosition(840, 610).on("pointstart", function() {
      this.app.pushScene(MetaSettingScene(this.json));
    }.bind(this)).addChildTo(this);*/

    var importFile = function(file) {
      var fileReader = new FileReader();
      fileReader.onload = function(event) {
        this.import(JSON.parse(event.target.result));
        this.id = undefined;
      }.bind(this);
      fileReader.readAsText(file);
    }.bind(this);

    document.getElementById("import").addEventListener("change", function(event) {
      importFile(event.target.files[0]);
    });

    this.on("enter", function(e) {
      e.app.domElement.addEventListener('wheel', function(e) {
        this.score.y = Math.min(Math.max(this.score.y - e.deltaY * (e.deltaMode === 1 ? 35 : 1), 640), this.notes.pitch.y * this.lengths[this.level].totaltime);
        this.updateGraphY();
      }.bind(this));
      e.app.domElement.addEventListener("dragover", function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
      });
      e.app.domElement.addEventListener("drop", function(event) {
        event.preventDefault();
        importFile(event.dataTransfer.files[0]);
      });
    });

    document.getElementById("export").addEventListener("click", function() {
      var json = this.export();
      console.time("copy");
      var temp = document.createElement('textarea');

      temp.value = json;
      temp.selectionStart = 0;
      temp.selectionEnd = temp.value.length;

      var s = temp.style;
      s.position = 'fixed';
      s.left = '-100%';

      document.body.appendChild(temp);
      temp.focus();
      var result = document.execCommand('copy');
      temp.blur();
      document.body.removeChild(temp);
      console.timeEnd("copy");
      if (!result) console.error("export failed!");
    }.bind(this));
  },
  save: function() {
    var saves = JSON.parse(localStorage.getItem('saves') || "[]");
    this.export();
    var save = {changed: Date.now(), json: this.json};
    if (this.id !== undefined) {
      saves[this.id] = save;
    } else {
      this.id = saves.length;
      saves.push(save);
    }
    localStorage.setItem('saves', JSON.stringify(saves));
  },
  updateDencityGraph: function() {
    while (this.dencitygraph.children.length > this.notesCountofBar[this.level].length) this.dencitygraph.children.last.remove();
    while (this.dencitygraph.children.length < this.notesCountofBar[this.level].length) {
      var group = DisplayElement({y: 631 - this.dencitygraph.children.length * 8}).addChildTo(this.dencitygraph)
      group.normal = RectangleShape({
        height: 6,
        stroke: null
      }).setOrigin(0, 0.5).addChildTo(group);
      group.attack = RectangleShape({
        height: 6,
        fill: "red",
        stroke: null
      }).setOrigin(0, 0.5).addChildTo(group);
    }
    for(var i = 0; i < this.dencitygraph.children.length; i++) {
      this.dencitygraph.children[i].normal.width = this.notesCountofBar[this.level][i] * this.json.bpm / 90;
      this.dencitygraph.children[i].attack.width = this.attackNotesCountofBar[this.level][i] * this.json.bpm / 90;
    }
  },
  updateGraphY: function() {
    // 37080 = (629 - 6 - 10 / 2) * 60
    var a = Math.min(32000 / (this.notes.pitch.y * this.lengths[this.level].totaltime - 640), 1);
    this.currentpos.y = 629 - (this.score.y - 640) / 60 * a;
    this.dencitygraph.y = (this.score.y - 640) / 60 * (1 - a);
  },
  updateTime: function(updategraph) {
    this.extend.y = -this.notes.pitch.y * this.lengths[this.level].totaltime + 40;
    this.cut.y = this.extend.y + this.lengths[this.level].diff[this.lengths[this.level].length - 1] * this.notes.pitch.y;
    if (this.score.y > this.notes.pitch.y * this.lengths[this.level].totaltime) {
      this.notes.sleep();
      this.tripletnotes.sleep();
      this.score.tweener.to({y: this.notes.pitch.y * this.lengths[this.level].totaltime}, 500, "easeOutQuad").call(function() {
        this.notes.wakeUp();
        this.tripletnotes.wakeUp();
      }.bind(this)).play();
    }
    this.s.reset();
    for (var i = this.notesCountofBar[this.level].length; i < this.time[this.level]; i++) {
      this.notesCountofBar[this.level][i] = 0;
      this.attackNotesCountofBar[this.level][i] = 0;
    }

    this.updateGraphY();
    if (updategraph !== false) this.updateDencityGraph();
    this.updateNotesCount();
  },
  updateNotesCount: function() {
    // 4 / 60 = 1 / 15
    this.notesCountLabel.text = this.notesCount[this.level] + " Notes\n" + this.attackNotesCount[this.level] + " Attack Notes\n" + (this.notesCount[this.level] * this.json.bpm / 15 / this.lengths[this.level].totaltime).toFixed(2) + " Notes Per Second";
    this.updateDencityGraph();
  },
  fullUpdate: function() {
    this.updateTime(false);
    this.notes.reset();
    this.tripletnotes.reset();
  },
  import: function(score) {
    function dataOf(ch) {
      if (ch === "1" || ch === "2" || ch === "3" || ch === "4") return NORMAL;
      if (ch === "5" || ch === "6" || ch === "7" || ch === "8") return ATTACK;
      if (ch === "a" || ch === "b" || ch === "c" || ch === "d") return LONG_START;
      if (ch === "e" || ch === "f" || ch === "g" || ch === "h") return LONG_END;
      if (ch === "[" || ch === "{") return START;
      if (ch === "]" || ch === "}") return END;
      throw new Error("invaild note!");
    }
    function laneOf(ch) {
      if (ch === "1" || ch === "5" || ch === "a" || ch === "e") return 0;
      if (ch === "2" || ch === "6" || ch === "b" || ch === "f") return 1;
      if (ch === "3" || ch === "7" || ch === "c" || ch === "g") return 2;
      if (ch === "4" || ch === "8" || ch === "d" || ch === "h") return 3;
      if (ch === "[" || ch === "]") return "bind";
      if (ch === "{" || ch === "}") return "random";
      throw new Error("invaild lane!");
    }
    function isVaild(ch) {
      return ch === "1" || ch === "2" || ch === "3" || ch === "4" || ch === "5" || ch === "6" || ch === "7" || ch === "8" || ch === "a" || ch === "b" || ch === "c" || ch === "d" || ch === "e" || ch === "f" || ch === "g" || ch === "h" || ch === "[" || ch === "]" || ch === "{" || ch === "}";
    }
    var increment = function(key, ii, type) {
      this.notesCount[key]++;
      if(!this.notesCountofBar[key][Math.floor(ii / 16)]) this.notesCountofBar[key][Math.floor(ii / 16)] = 0;
      this.notesCountofBar[key][Math.floor(ii / 16)]++;
      if (type === ATTACK) {
        this.attackNotesCount[key]++;
        if(!this.attackNotesCountofBar[key][Math.floor(ii / 16)]) this.attackNotesCountofBar[key][Math.floor(ii / 16)] = 0;
        this.attackNotesCountofBar[key][Math.floor(ii / 16)]++;
      }
    }.bind(this);
    console.time("import");
    this.json = score;
    this.json.map.forIn(function(key, value) {
      console.log("importing " + key)
      this.notesdata[key] = [];
      this.tripletnotesdata[key] = [];
      this.notesCount[key] = 0;
      this.notesCountofBar[key] = [];
      this.attackNotesCount[key] = 0;
      this.attackNotesCountofBar[key] = [];
      this.lengths[key].clear();
      var ii = 0, ij = 0, nextTriplet = -1;
      for (var i = 0; i < value.length; i++) {
        value[i] = value[i].split(",");
        for (var j = 0, jj = 0; j < value[i].length; j++) {
          this.notesdata[key][ii] = [NOTHING, NOTHING, NOTHING, NOTHING];
          this.notesdata[key][ii].bind = NOTHING;
          this.notesdata[key][ii].random = NOTHING;
          if (value[i][j].includes("(") || nextTriplet >= 0) {
            var nowTriplet = Math.max(nextTriplet, 0);
            nextTriplet = -1;
            for (var k = 0;; k++) { // )か小節区切りまでループ
              var ik = ij / 2 + k;
              this.tripletnotesdata[key][ik] = [NOTHING, NOTHING, NOTHING, NOTHING];
              this.tripletnotesdata[key][ik].bind = NOTHING;
              this.tripletnotesdata[key][ik].random = NOTHING;
              if(value[i][j] === undefined) {
                nextTriplet = k % 3;
                break;
              }
              var tripletEnd = false;
              for(var l = 0; l < value[i][j].length; l++) {
                var ch = value[i][j].charAt(l);
                if (ch === ")") tripletEnd = true;
                else if (ch === "(") tripletEnd = false;
              }
              if (tripletEnd && (k + nowTriplet) % 3 === 0) {
                j--; // 三連符が8分のタイミングで終わる時は通常の8分にする
                break;
              } else for(l = 0; l < value[i][j].length; l++) {
                var ch = value[i][j].charAt(l);
                if(isVaild(ch) && this.tripletnotesdata[key][ik][laneOf(ch)] === NOTHING) {
                  var type = dataOf(ch);
                  increment(key, ii, type);
                  this.tripletnotesdata[key][ik][laneOf(ch)] = type;
                }
              }
              if (tripletEnd) {
                jj++;
                ii++;
                ij += 2;
                break;
              }
              j++;
              ii += 2 / 3;
            }
            jj += k / 3 * 2;
            ij += k * 2;
            ii = Math.round(ii);
          } else {
            for(var k = 0; k < value[i][j].length; k++) {
              var ch = value[i][j].charAt(k);
              if(isVaild(ch) && this.notesdata[key][ii][laneOf(ch)] === NOTHING) {
                var type = dataOf(ch);
                increment(key, ii, type);
                this.notesdata[key][ii][laneOf(ch)] = type;
              }
            }
            ii++;
            jj++;
            ij += 3;
          }
        }
        this.lengths[key].push(Math.round(jj));
      }
      for (;i < 5; i++) this.lengths[key].push(16);
      this.time[key] = Math.max(i, 5);
      for(i = 0; i < Math.max(this.notesCountofBar[key].length, 5); i++) {
        if(!this.notesCountofBar[key][i]) this.notesCountofBar[key][i] = 0;
        if(!this.attackNotesCountofBar[key][i]) this.attackNotesCountofBar[key][i] = 0;
      }
    }, this);
    console.timeEnd("import");
    this.fullUpdate();
  },
  export: function() {
    function codeOf(data, lane) {
      if (data === NOTHING) return "";
      if (data === NORMAL) return lane + 1;
      if (data === ATTACK) return lane + 5;
      if (data === LONG_START) return ["a", "b", "c", "d"][lane];
      if (data === LONG_END) return ["e", "f", "g", "h"][lane];

      if (data === START) return {bind: "[", random: "{"}[lane];
      if (data === END) return {bind: "]", random: "}"}[lane];
      throw new Error("invaild data: " + data);
    }
    console.time("export");
    ["easy", "normal", "hard"].each(function(level) {
      this.json.map[level] = [];
      var putrightparenthese = false;
      for (var i = 0; i < this.time[level]; i++) {
        var data = "";
        var o = i === 0 ? 0 : this.lengths[level].sum[i - 1];
        t:
        for (var j = o; j < o + this.lengths[level].diff[i]; j++, data += ",") {
          if(putrightparenthese) {
            data += ")";
            putrightparenthese = false;
          }
          if (this.notesdata[level][j]) LANES.each(function (lane) {
            data += codeOf(this.notesdata[level][j][lane], lane);
          }, this);
          if (j % 2 === 0 && j < o + this.lengths[level].diff[i] - 1) {
            if (this.notesdata[level][j]) if (LANES.some(function (lane) {
              return this.notesdata[level][j][lane] !== NOTHING;
            }, this)) continue;
            if (this.notesdata[level][j + 1]) if (LANES.some(function (lane) {
              return this.notesdata[level][j + 1][lane] !== NOTHING;
            }, this)) continue;
            data += "("
            for(var k = 0;; k++) {
              if (this.tripletnotesdata[level][j * 3 / 2 + k]) LANES.each(function (lane) {
                data += codeOf(this.tripletnotesdata[level][j * 3 / 2 + k][lane], lane);
              }, this);
              if (k === 2) break;
              data += ",";
            }
            j++;
            putrightparenthese = true;
          }
        }
        data = data.slice(0, -1);
        if (data.endsWith("(,,")) {
          putrightparenthese = false;
          data = data.replace(/\(,,$/, ",");
        }
        this.json.map[level].push(data.replace(/\(,,,\)/g, ",,").replace(/\)\(/g, ""));
      }
    }, this);

    var json = JSON.stringify(this.json, null, "  ");

    console.timeEnd("export");

    return json;
  }
});

phina.define("Lengths", {
  init: function() {
    this.diff = [16, 16, 16, 16, 16];
    this.sum = [16, 32, 48, 64, 80];
  },
  push: function(x) {
    this.diff.push(x);
    this.sum.push(this.length > 1 ? this.sum[this.length - 2] + x : x);
  },
  set: function(i, x) {
    this.diff[i] = x;
    this.sum[i] = i > 0 ? this.sum[i - 1] + x : x;
    for (i++; i < this.length; i++) this.sum[i] = this.sum[i - 1] + this.diff[i];
  },
  cut: function() {
    this.diff.pop();
    this.sum.pop();
  },
  clear: function() {
    this.diff = [];
    this.sum = [];
  },
  _accessor: {
    length: {
      get: function() {return this.diff.length;},
    },
    totaltime: {
      get: function() {return this.sum[this.length - 1];},
    }
  }
});

phina.main(function() {
  var app = GameApp({
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    startLabel: "main",
    fps: 60
  });

  app.run();
});
