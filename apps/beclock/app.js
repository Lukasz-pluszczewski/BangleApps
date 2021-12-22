require('Layout');

var isThenable = function (value) {
  try {
    return typeof value.then === 'function';
  } catch (e) {
    return false;
  }
};
Promise._all = Promise.all;
Promise.all = function (arrayOfValues) {
  return new Promise(function (resolve, reject) {
    var count = arrayOfValues.length;
    var results = [];
    var checkDone = function () {
      return --count === 0 && resolve(results);
    };
    arrayOfValues.forEach(function (value, index) {
      if (isThenable(value)) {
        value.then(function (result) {
          return results[index] = result;
        }, reject).then(checkDone);
      } else {
        results[index] = value;
        checkDone();
      }
    });
  });
};

var globalGraphics = g;
function Layout(layout, options) {
  var _this = this;
  this._l = this.l = layout;
  this.physBtns = process.env.HWVERSION == 2 ? 1 : 3;
  options = options || {};
  this.lazy = options.lazy || false;
  this.g = options.g || globalGraphics;
  var g = this.g;
  var btnList;
  Bangle.setUI();
  if (process.env.HWVERSION != 2) {
    var btnRecurser = function (l) {
      if (l.type == "btn") btnList.push(l);
      if (l.c) l.c.forEach(btnRecurser);
    };
    btnList = [];
    btnRecurser(layout);
    if (btnList.length) {
      this.physBtns = 0;
      this.buttons = btnList;
      this.selectedButton = -1;
      Bangle.setUI("updown", function (dir) {
        var s = _this.selectedButton,
          l = _this.buttons.length;
        if (dir === undefined && _this.buttons[s]) return _this.buttons[s].cb();
        if (_this.buttons[s]) {
          delete _this.buttons[s].selected;
          _this.render(_this.buttons[s]);
        }
        s = (s + l + dir) % l;
        if (_this.buttons[s]) {
          _this.buttons[s].selected = 1;
          _this.render(_this.buttons[s]);
        }
        _this.selectedButton = s;
      });
    }
  }
  if (options.btns) {
    var buttons = options.btns;
    this.b = buttons;
    if (this.physBtns >= buttons.length) {
      var pressHandler = function (btn, e) {
        if (e.time - e.lastTime > 0.75 && this.b[btn].cbl) this.b[btn].cbl(e);else if (this.b[btn].cb) this.b[btn].cb(e);
      };
      var btnHeight = Math.floor(Bangle.appRect.h / this.physBtns);
      if (Bangle.btnWatch) Bangle.btnWatch.forEach(clearWatch);
      Bangle.btnWatch = [];
      if (this.physBtns > 2 && buttons.length == 1) buttons.unshift({
        label: ""
      });
      while (this.physBtns > buttons.length) {
        buttons.push({
          label: ""
        });
      }
      if (buttons[0]) Bangle.btnWatch.push(setWatch(pressHandler.bind(this, 0), BTN1, {
        repeat: true,
        edge: -1
      }));
      if (buttons[1]) Bangle.btnWatch.push(setWatch(pressHandler.bind(this, 1), BTN2, {
        repeat: true,
        edge: -1
      }));
      if (buttons[2]) Bangle.btnWatch.push(setWatch(pressHandler.bind(this, 2), BTN3, {
        repeat: true,
        edge: -1
      }));
      this._l.width = g.getWidth() - 8;
      this._l = {
        type: "h",
        filly: 1,
        c: [this._l, {
          type: "v",
          pad: 1,
          filly: 1,
          c: buttons.map(function (b) {
            return b.type = "txt", b.font = "6x8", b.height = btnHeight, b.r = 1, b;
          })
        }]
      };
    } else {
      this._l.width = g.getWidth() - 32;
      this._l = {
        type: "h",
        c: [this._l, {
          type: "v",
          c: buttons.map(function (b) {
            return b.type = "btn", b.filly = 1, b.width = 32, b.r = 1, b;
          })
        }]
      };
      if (btnList) btnList.push.apply(btnList, this._l.c[1].c);
    }
  }
  if (process.env.HWVERSION == 2) {
    var touchHandler = function (l, e) {
      if (l.type == "btn" && l.cb && e.x >= l.x && e.y >= l.y && e.x <= l.x + l.w && e.y <= l.y + l.h) {
        if (e.type == 2 && l.cbl) l.cbl(e);else if (l.cb) l.cb(e);
      }
      if (l.c) l.c.forEach(function (n) {
        return touchHandler(n, e);
      });
    };
    Bangle.touchHandler = function (_, e) {
      return touchHandler(_this._l, e);
    };
    Bangle.on('touch', Bangle.touchHandler);
  }
  var ll = this;
  function recurser(l) {
    if (l.id) ll[l.id] = l;
    if (!l.type) l.type = "";
    if (l.font && l.font.includes(":")) {
      var f = l.font.split(":");
      l.font = f[0];
      l.fsz = f[1];
    }
    if (l.c) l.c.forEach(recurser);
  }
  recurser(this._l);
  this.updateNeeded = true;
}
Layout.prototype.remove = function (l) {
  if (Bangle.btnWatch) {
    Bangle.btnWatch.forEach(clearWatch);
    delete Bangle.btnWatch;
  }
  if (Bangle.touchHandler) {
    Bangle.removeListener("touch", Bangle.touchHandler);
    delete Bangle.touchHandler;
  }
};
function prepareLazyRender(l, rectsToClear, drawList, rects, parentBg) {
  var g = this.g;
  var bgCol = l.bgCol == null ? parentBg : g.toColor(l.bgCol);
  if (bgCol != parentBg || l.type == "txt" || l.type == "btn" || l.type == "img" || l.type == "custom") {
    var c = l.c;
    delete l.c;
    var hash = "H" + E.CRC32(E.toJS(l));
    if (c) l.c = c;
    if (!delete rectsToClear[hash]) {
      var r = rects[hash] = [l.x, l.y, l.x + l.w - 1, l.y + l.h - 1];
      r.bg = parentBg == null ? g.theme.bg : parentBg;
      if (drawList) {
        drawList.push(l);
        drawList = null;
      }
    }
  }
  if (l.c) for (var ch of l.c) {
    prepareLazyRender(ch, rectsToClear, drawList, rects, bgCol);
  }
}
Layout.prototype.render = function (l) {
  var g = this.g;
  if (!l) l = this._l;
  if (this.updateNeeded) this.update();
  function render(l) {
    "ram";
    g.reset();
    if (l.col) {
      g.setColor(l.col);
    } else {
      g.setColor(g.theme.fg);
    }
    if (l.bgCol !== undefined) {
      g.setBgColor(l.bgCol).clearRect(l.x, l.y, l.x + l.w - 1, l.y + l.h - 1);
    } else {
      g.setBgColor(g.theme.bg);
    }
    cb[l.type](l);
  }
  var cb = {
    "": function () {},
    "txt": function (l) {
      if (l.wrap) {
        g.setFont(l.font, l.fsz).setFontAlign(0, -1);
        var lines = g.wrapString(l.label, l.w);
        var y = l.y + (l.h - g.getFontHeight() * lines.length >> 1);
        lines.forEach(function (line, i) {
          return g.drawString(line, l.x + (l.w >> 1), y + g.getFontHeight() * i);
        });
      } else {
        g.setFont(l.font, l.fsz).setFontAlign(0, 0, l.r).drawString(l.label, l.x + (l.w >> 1), l.y + (l.h >> 1));
      }
    },
    "btn": function (l) {
      var x = l.x + (0 | l.pad),
        y = l.y + (0 | l.pad),
        w = l.w - (l.pad << 1),
        h = l.h - (l.pad << 1);
      var poly = [x, y + 4, x + 4, y, x + w - 5, y, x + w - 1, y + 4, x + w - 1, y + h - 5, x + w - 5, y + h - 1, x + 4, y + h - 1, x, y + h - 5, x, y + 4],
        bg = l.selected ? g.theme.bgH : g.theme.bg2;
      g.setColor(bg).fillPoly(poly).setColor(l.selected ? g.theme.fgH : g.theme.fg2).drawPoly(poly);
      if (l.src) g.setBgColor(bg).drawImage("function" == typeof l.src ? l.src() : l.src, l.x + 10 + (0 | l.pad), l.y + 8 + (0 | l.pad));else g.setFont("6x8", 2).setFontAlign(0, 0, l.r).drawString(l.label, l.x + l.w / 2, l.y + l.h / 2);
    },
    "img": function (l) {
      g.drawImage("function" == typeof l.src ? l.src() : l.src, l.x + (0 | l.pad), l.y + (0 | l.pad), l.scale ? {
        scale: l.scale
      } : undefined);
    },
    "custom": function (l) {
      l.render(l, g);
    },
    "h": function (l) {
      l.c.forEach(render);
    },
    "v": function (l) {
      l.c.forEach(render);
    }
  };
  if (this.lazy) {
    if (!this.rects) this.rects = {};
    var rectsToClear = this.rects.clone();
    var drawList = [];
    prepareLazyRender(l, rectsToClear, drawList, this.rects, null);
    for (var h in rectsToClear) {
      delete this.rects[h];
    }
    var clearList = Object.keys(rectsToClear).map(function (k) {
      return rectsToClear[k];
    }).reverse();
    for (var r of clearList) {
      g.setBgColor(r.bg).clearRect.apply(g, r);
    }
    drawList.forEach(render);
  } else {
    render(l);
  }
};
Layout.prototype.forgetLazyState = function () {
  this.rects = {};
};
Layout.prototype.layout = function (l) {
  var _this2 = this;
  this.g;
  switch (l.type) {
    case "h":
    {
      var acc_w = l.x + (0 | l.pad);
      var accfillx = 0;
      var fillx = l.c && l.c.reduce(function (a, l) {
        return a + (0 | l.fillx);
      }, 0);
      if (!fillx) {
        acc_w += l.w - l._w >> 1;
        fillx = 1;
      }
      var x = acc_w;
      l.c.forEach(function (c) {
        c.x = 0 | x;
        acc_w += c._w;
        accfillx += 0 | c.fillx;
        x = acc_w + Math.floor(accfillx * (l.w - l._w) / fillx);
        c.w = 0 | x - c.x;
        c.h = 0 | (c.filly ? l.h - (l.pad << 1) : c._h);
        c.y = 0 | l.y + (0 | l.pad) + ((1 + (0 | c.valign)) * (l.h - (l.pad << 1) - c.h) >> 1);
        if (c.c) _this2.layout(c);
      });
      break;
    }
    case "v":
    {
      var acc_h = l.y + (0 | l.pad);
      var accfilly = 0;
      var filly = l.c && l.c.reduce(function (a, l) {
        return a + (0 | l.filly);
      }, 0);
      if (!filly) {
        acc_h += l.h - l._h >> 1;
        filly = 1;
      }
      var y = acc_h;
      l.c.forEach(function (c) {
        c.y = 0 | y;
        acc_h += c._h;
        accfilly += 0 | c.filly;
        y = acc_h + Math.floor(accfilly * (l.h - l._h) / filly);
        c.h = 0 | y - c.y;
        c.w = 0 | (c.fillx ? l.w - (l.pad << 1) : c._w);
        c.x = 0 | l.x + (0 | l.pad) + ((1 + (0 | c.halign)) * (l.w - (l.pad << 1) - c.w) >> 1);
        if (c.c) _this2.layout(c);
      });
      break;
    }
  }
};
Layout.prototype.debug = function (l, c) {
  var _this3 = this;
  var g = this.g;
  if (!l) l = this._l;
  c = c || 1;
  g.setColor(c & 1, c & 2, c & 4).drawRect(l.x + c - 1, l.y + c - 1, l.x + l.w - c, l.y + l.h - c);
  if (l.pad) g.drawRect(l.x + l.pad - 1, l.y + l.pad - 1, l.x + l.w - l.pad, l.y + l.h - l.pad);
  c++;
  if (l.c) l.c.forEach(function (n) {
    return _this3.debug(n, c);
  });
};
Layout.prototype.update = function () {
  delete this.updateNeeded;
  var g = this.g;
  function updateMin(l) {
    "ram";
    cb[l.type](l);
    if (l.r & 1) {
      var t = l._w;
      l._w = l._h;
      l._h = t;
    }
    l._w = 0 | Math.max(l._w + (l.pad << 1), 0 | l.width);
    l._h = 0 | Math.max(l._h + (l.pad << 1), 0 | l.height);
  }
  var cb = {
    "txt": function (l) {
      if (l.font.endsWith("%")) l.font = "Vector" + Math.round(g.getHeight() * l.font.slice(0, -1) / 100);
      if (l.wrap) {
        l._h = l._w = 0;
      } else {
        var m = g.setFont(l.font, l.fsz).stringMetrics(l.label);
        l._w = m.width;
        l._h = m.height;
      }
    },
    "btn": function (l) {
      var m = l.src ? g.imageMetrics("function" == typeof l.src ? l.src() : l.src) : g.setFont("6x8", 2).stringMetrics(l.label);
      l._h = 16 + m.height;
      l._w = 20 + m.width;
    },
    "img": function (l) {
      var m = g.imageMetrics("function" == typeof l.src ? l.src() : l.src),
        s = l.scale || 1;
      l._w = m.width * s;
      l._h = m.height * s;
    },
    "": function (l) {
      l._w = 0;
      l._h = 0;
    },
    "custom": function (l) {
      l._w = 0;
      l._h = 0;
    },
    "h": function (l) {
      l.c.forEach(updateMin);
      l._h = l.c.reduce(function (a, b) {
        return Math.max(a, b._h);
      }, 0);
      l._w = l.c.reduce(function (a, b) {
        return a + b._w;
      }, 0);
      if (l.fillx == null && l.c.some(function (c) {
        return c.fillx;
      })) l.fillx = 1;
      if (l.filly == null && l.c.some(function (c) {
        return c.filly;
      })) l.filly = 1;
    },
    "v": function (l) {
      l.c.forEach(updateMin);
      l._h = l.c.reduce(function (a, b) {
        return a + b._h;
      }, 0);
      l._w = l.c.reduce(function (a, b) {
        return Math.max(a, b._w);
      }, 0);
      if (l.fillx == null && l.c.some(function (c) {
        return c.fillx;
      })) l.fillx = 1;
      if (l.filly == null && l.c.some(function (c) {
        return c.filly;
      })) l.filly = 1;
    }
  };
  var l = this._l;
  updateMin(l);
  if (l.fillx || l.filly) {
    l.w = Bangle.appRect.w;
    l.h = Bangle.appRect.h;
    l.x = Bangle.appRect.x;
    l.y = Bangle.appRect.y;
  } else {
    l.w = l._w;
    l.h = l._h;
    l.x = Bangle.appRect.w - l.w >> 1;
    l.y = Bangle.appRect.y + (Bangle.appRect.h - l.h >> 1);
  }
  this.layout(l);
};
Layout.prototype.clear = function (l) {
  var g = this.g;
  if (!l) l = this._l;
  g.reset();
  if (l.bgCol !== undefined) {
    g.setBgColor(l.bgCol);
  } else {
    g.setBgColor(g.theme.bg);
  }
  g.clearRect(l.x, l.y, l.x + l.w - 1, l.y + l.h - 1);
};

var _PAGE$CLOCK, _PAGE$SHORTCUTS, _PAGE$NOTIFICATIONS, _PAGE$LAUNCHER, _PAGE$WEATHER, _PAGE$MUSIC_CONTROL, _PAGES_DIRECTIONS, _PAGE_RENDERERS;
var storage = require('Storage');
var locale = require('locale');
var soundIcon = storage.read('beclock.sound.img');
var priorityIcon = storage.read('beclock.priority.img');
var silentIcon = storage.read('beclock.silent.img');
var vibrateIcon = storage.read('beclock.vibrate.img');
var brightnessIcon = storage.read('beclock.brightness.img');
var keyboardIcon = storage.read('beclock.keyboard.img');
var gestureIcon = storage.read('beclock.gesture.img');
var settingsIcon = storage.read('beclock.settings.img');
var weatherMappings = {
  nieznany: 'unknown',
  burza: 'thunderstorm',
  'mrożąca mżawka': 'freezing drizzle',
  'lekka marznąca mżawka': 'slight freezing drizzle',
  'marznący deszcz': 'freezing rain',
  'lekki deszcz marznący': 'slight freezing rain',
  'śnieżne prysznice': 'snow showers',
  'lekkie opady śniegu': 'slight snow showers',
  'lekkie opady deszczu i śniegu z domieszką śniegu': 'slight showers of rain and snow mixed',
  'wyjątkowo silne opady deszczu': 'extremely heavy rain showers',
  'strugi deszczu': 'rain showers',
  'niewielki deszcz': 'slight rain showers',
  'umiarkowane opady śniegu, ciągłe': 'moderate snowfall, continuous',
  'niewielki opad śniegu, ciągły': 'slight snowfall, continuous',
  'deszcz i śnieg': 'rain and snow',
  'niewielki deszcz i śnieg': 'slight rain and snow',
  'mżawka umiarkowana, ciągła': 'moderate drizzle, continuous',
  'lekka mżawka, ciągła': 'slight drizzle, continuous',
  'ulewny deszcz, ciągły': 'heavy rain, continuous',
  'umiarkowany deszcz, ciągły': 'moderate rain, continuous',
  'lekki deszcz, ciągły': 'slight rain, continuous',
  'lodowa mgła': 'ice fog',
  'mgła': 'fog',
  'przeważnie pochmurno': 'mostly cloudy',
  'chmury umiarkowane': 'moderate clouds',
  targ: 'fair',
  'opady deszczu i śniegu z domieszką śniegu': 'showers of rain and snow mixed',
  'obfite opady śniegu, ciągłe': 'heavy snowfall, continuous',
  'silna mżawka, ciągła': 'heavy drizzle, continuous',
  'lekko pochmurny': 'slightly cloudy'
};
function chooseWeatherIcon(translatedCondition) {
  var condition = (weatherMappings[translatedCondition.toLowerCase()] || 'unknown').toLowerCase();
  if (condition.includes("thunderstorm")) return storage.read('beclock.storm.img');
  if (condition.includes("freezing") || condition.includes("snow") || condition.includes("sleet")) {
    return storage.read('beclock.snow.img');
  }
  if (condition.includes("drizzle") || condition.includes("shower")) {
    return storage.read('beclock.rain.img');
  }
  if (condition.includes("rain")) return storage.read('beclock.rain.img');
  if (condition.includes("clear")) return storage.read('beclock.sun.img');
  if (condition.includes("few clouds")) return storage.read('beclock.partsun.img');
  if (condition.includes("scattered clouds")) return storage.read('beclock.cloud.img');
  if (condition.includes("clouds")) return storage.read('beclock.cloud.img');
  if (condition.includes("mist") || condition.includes("smoke") || condition.includes("haze") || condition.includes("sand") || condition.includes("dust") || condition.includes("fog") || condition.includes("ash") || condition.includes("squalls") || condition.includes("tornado")) {
    return storage.read('beclock.cloud.img');
  }
  return storage.read('beclock.cloud.img');
}
var isInside = function (xy, element) {
  return xy.x > element.x && xy.x < element.x + element.w && xy.y > element.y && xy.y < element.y + element.h;
};
var AVAILABLE_FONTS = {
  '4x6': '4x6',
  '6x8': '6x8',
  '12x20': '12x20',
  '6x15': '6x15',
  'Vector': 'Vector'
};
var fonts = {
  time: '35%',
  day: '6x8:2',
  date: '6x8:2',
  temp: '10%',
  tempUnit: '10%',
  wind: '10%',
  windUnit: '6x8:2'
};
var DRAG_THRESHOLD = 32;
var DIRECTION = {
  UP: 0b0001,
  DOWN: 0b0010,
  LEFT: 0b0100,
  RIGHT: 0b1000,
  UP_LEFT: 0b0101,
  UP_RIGHT: 0b1001,
  DOWN_LEFT: 0b0110,
  DOWN_RIGHT: 0b1010
};
var PAGE = {
  CLOCK: 1,
  SHORTCUTS: 2,
  NOTIFICATIONS: 3,
  LAUNCHER: 4,
  WEATHER: 5,
  MUSIC_CONTROL: 6
};
var PAGES_DIRECTIONS = (_PAGES_DIRECTIONS = {}, _PAGES_DIRECTIONS[PAGE.CLOCK] = (_PAGE$CLOCK = {}, _PAGE$CLOCK[DIRECTION.UP] = PAGE.NOTIFICATIONS, _PAGE$CLOCK[DIRECTION.DOWN] = PAGE.SHORTCUTS, _PAGE$CLOCK[DIRECTION.LEFT] = PAGE.LAUNCHER, _PAGE$CLOCK[DIRECTION.RIGHT] = PAGE.WEATHER, _PAGE$CLOCK[DIRECTION.DOWN_LEFT] = PAGE.MUSIC_CONTROL, _PAGE$CLOCK), _PAGES_DIRECTIONS[PAGE.SHORTCUTS] = (_PAGE$SHORTCUTS = {}, _PAGE$SHORTCUTS[DIRECTION.UP] = PAGE.CLOCK, _PAGE$SHORTCUTS[DIRECTION.DOWN] = 0, _PAGE$SHORTCUTS[DIRECTION.LEFT] = 0, _PAGE$SHORTCUTS[DIRECTION.RIGHT] = 0, _PAGE$SHORTCUTS), _PAGES_DIRECTIONS[PAGE.NOTIFICATIONS] = (_PAGE$NOTIFICATIONS = {}, _PAGE$NOTIFICATIONS[DIRECTION.UP] = 0, _PAGE$NOTIFICATIONS[DIRECTION.DOWN] = PAGE.CLOCK, _PAGE$NOTIFICATIONS[DIRECTION.LEFT] = 0, _PAGE$NOTIFICATIONS[DIRECTION.RIGHT] = 0, _PAGE$NOTIFICATIONS), _PAGES_DIRECTIONS[PAGE.LAUNCHER] = (_PAGE$LAUNCHER = {}, _PAGE$LAUNCHER[DIRECTION.UP] = 0, _PAGE$LAUNCHER[DIRECTION.DOWN] = 0, _PAGE$LAUNCHER[DIRECTION.LEFT] = 0, _PAGE$LAUNCHER[DIRECTION.RIGHT] = PAGE.CLOCK, _PAGE$LAUNCHER), _PAGES_DIRECTIONS[PAGE.WEATHER] = (_PAGE$WEATHER = {}, _PAGE$WEATHER[DIRECTION.UP] = 0, _PAGE$WEATHER[DIRECTION.DOWN] = 0, _PAGE$WEATHER[DIRECTION.LEFT] = PAGE.CLOCK, _PAGE$WEATHER[DIRECTION.RIGHT] = 0, _PAGE$WEATHER), _PAGES_DIRECTIONS[PAGE.MUSIC_CONTROL] = (_PAGE$MUSIC_CONTROL = {}, _PAGE$MUSIC_CONTROL[DIRECTION.UP] = 0, _PAGE$MUSIC_CONTROL[DIRECTION.DOWN] = 0, _PAGE$MUSIC_CONTROL[DIRECTION.LEFT] = 0, _PAGE$MUSIC_CONTROL[DIRECTION.RIGHT] = 0, _PAGE$MUSIC_CONTROL[DIRECTION.UP_RIGHT] = PAGE.CLOCK, _PAGE$MUSIC_CONTROL), _PAGES_DIRECTIONS);
var PAGE_RENDERERS = (_PAGE_RENDERERS = {}, _PAGE_RENDERERS[PAGE.CLOCK] = null, _PAGE_RENDERERS[PAGE.SHORTCUTS] = null, _PAGE_RENDERERS[PAGE.NOTIFICATIONS] = null, _PAGE_RENDERERS[PAGE.LAUNCHER] = null, _PAGE_RENDERERS[PAGE.WEATHER] = null, _PAGE_RENDERERS[PAGE.MUSIC_CONTROL] = null, _PAGE_RENDERERS);
var logDirection = function (direction) {
  if (direction === DIRECTION.UP_LEFT) return 'left-up';
  if (direction === DIRECTION.UP_RIGHT) return 'right-up';
  if (direction === DIRECTION.DOWN_LEFT) return 'left-down';
  if (direction === DIRECTION.DOWN_RIGHT) return 'right-down';
  if (direction === DIRECTION.UP) return 'up';
  if (direction === DIRECTION.DOWN) return 'down';
  if (direction === DIRECTION.LEFT) return 'left';
  if (direction === DIRECTION.RIGHT) return 'right';
  console.log('unknown direction', direction);
  return 'unknown';
};
var state = {
  page: PAGE.CLOCK,
  drawTimeout: null,
  clockLayout: null,
  swipe: {
    dy: 0,
    dx: 0
  },
  registeredShortcuts: {},
  registeredSwipeHandlers: {},
  watchSettings: null,
  requireReload: false,
  registeredCleanUps: {},
  launcherPage: 0,
  launcherSelected: null
};
function clearDrawTimeout() {
  if (state.drawTimeout) {
    clearTimeout(state.drawTimeout);
    state.drawTimeout = null;
  }
}
function resetState(oldPage) {
  Object.keys(state.registeredShortcuts).forEach(function (registeredShortcut) {
    Object.keys(state.registeredShortcuts[registeredShortcut]).forEach(function (key) {
      delete state.registeredShortcuts[registeredShortcut][key];
    });
    delete state.registeredShortcuts[registeredShortcut];
  });
  Object.keys(state.registeredSwipeHandlers).forEach(function (registeredShortcut) {
    Object.keys(state.registeredSwipeHandlers[registeredShortcut]).forEach(function (key) {
      delete state.registeredSwipeHandlers[registeredShortcut][key];
    });
    delete state.registeredSwipeHandlers[registeredShortcut];
  });
  state.watchSettings = null;
  if (state.registeredCleanUps[oldPage]) {
    state.registeredCleanUps[oldPage]();
    delete state.registeredCleanUps[oldPage];
  }
  clearDrawTimeout();
}
function renderCurrentPage() {
  if (state.drawTimeout) clearTimeout(state.drawTimeout);
  PAGE_RENDERERS[state.page]();
}
function setPage(page) {
  var oldPage = state.page;
  state.page = page;
  E.showMessage('Loading...');
  resetState(oldPage);
  if (state.requireReload) {
    state.requireReload = false;
    load();
  } else {
    renderCurrentPage();
  }
}
function handleSwipe(direction) {
  var newPage = PAGES_DIRECTIONS[state.page][direction];
  console.log('swipe', logDirection(direction), state.page + ' -> ' + newPage);
  if (newPage) {
    setPage(newPage);
  } else if (state.registeredSwipeHandlers[direction]) {
    state.registeredSwipeHandlers[direction]();
  }
}
function handleTouch(button, xy) {
  console.log('touch', {
    button: button,
    xy: xy
  });
  var found = Object.keys(state.registeredShortcuts).find(function (name) {
    return isInside(xy, state.registeredShortcuts[name]);
  });
  if (found) {
    console.log('found', found);
    state.registeredShortcuts[found].cb();
  } else {
    console.log('not found');
  }
}
PAGE_RENDERERS[PAGE.CLOCK] = function () {
  if (!state.clockLayout) {
    state.clockLayout = new Layout({
      type: "v",
      c: [{
        type: "txt",
        font: fonts.time,
        halign: 0,
        fillx: 1,
        pad: 8,
        label: "00:00",
        id: "time"
      }, {
        type: "h",
        fillx: 1,
        c: [{
          type: "txt",
          font: fonts.day,
          label: "THU",
          id: "dow"
        }, {
          type: "txt",
          font: fonts.date,
          label: "01/01/1970",
          id: "date"
        }]
      }, {
        type: "h",
        valign: 1,
        fillx: 1,
        c: [{
          type: "img",
          filly: 1,
          id: "weatherIcon",
          src: storage.read('beclock.sun.img')
        }, {
          type: "v",
          fillx: 1,
          c: [{
            type: "h",
            c: [{
              type: "txt",
              font: fonts.temp,
              id: "temp",
              label: "000°C"
            }]
          }, {
            type: "h",
            c: [{
              type: "txt",
              font: fonts.wind,
              id: "wind",
              label: "00km/h"
            }]
          }]
        }]
      }]
    });
  }
  function queueDraw() {
    clearDrawTimeout();
    state.drawTimeout = setTimeout(updateClock, 60000 - Date.now() % 60000);
  }
  function updateClock() {
    var date = new Date();
    state.clockLayout.time.label = locale.time(date, 1);
    state.clockLayout.date.label = locale.date(date, 1).toUpperCase();
    state.clockLayout.dow.label = locale.dow(date, 1).toUpperCase() + " ";
    var weatherJson = storage.readJSON('weather.json');
    if (weatherJson && weatherJson.weather) {
      var currentWeather = weatherJson.weather;
      var temp = locale.temp(currentWeather.temp - 273.15).match(/^(\D*\d*)(.*)$/);
      state.clockLayout.temp.label = temp[1] + temp[2];
      state.clockLayout.weatherIcon.src = chooseWeatherIcon(currentWeather.txt);
      var wind = locale.speed(currentWeather.wind).match(/^(\D*\d*)(.*)$/);
      state.clockLayout.wind.label = wind[1] + wind[2] + " " + (currentWeather.wrose || '').toUpperCase();
    } else {
      state.clockLayout.temp.label = "--";
      state.clockLayout.wind.label = "";
      state.clockLayout.weatherIcon.src = storage.read('beclock.err.img');
    }
    Bangle.drawWidgets();
    state.clockLayout.clear();
    state.clockLayout.render();
    queueDraw();
  }
  g.clear();
  updateClock();
};
PAGE_RENDERERS[PAGE.SHORTCUTS] = function () {
  g.clear();
  state.settings = storage.readJSON('setting.json', 1);
  if (!state.settings) {
    return E.showMessage('Settings not initialized');
  }
  function updateSettings(requireReload) {
    storage.write('setting.json', state.settings);
    if (requireReload) {
      state.requireReload = true;
    }
  }
  var renderIcon = function (l, g) {
    var pad = l.pad || 0;
    var rad = Math.min(l.w, l.h) / 2 - pad;
    if (l.value) {
      g.setColor(0, 0, 1);
    } else {
      g.setColor(0.5, 0.5, 0.5);
    }
    if (!l.hideCircle) {
      g.fillCircle(l.x + l.w / 2, l.y + l.h / 2, rad);
    }
    if (l.value) {
      g.setColor(1, 1, 1);
    } else {
      g.setColor(0, 0, 0);
    }
    if (l.label) {
      g.drawImage(l.icon || storage.read(l.iconFileName), l.x + l.w / 2, l.y + l.h / 2 - 10, {
        rotate: 0,
        scale: l.iconScale || 1
      });
      g.setFont(AVAILABLE_FONTS["12x20"]);
      g.setFontAlign(0, -1);
      g.drawString(l.label, l.x + l.w / 2, l.y + l.h / 2 + 5);
    } else {
      g.drawImage(l.icon || storage.read(l.iconFileName), l.x + l.w / 2, l.y + l.h / 2, {
        rotate: 0,
        scale: l.iconScale || 1
      });
    }
    state.registeredShortcuts[l.id] = {
      x: l.x + pad,
      y: l.y + pad,
      w: l.w - pad * 2,
      h: l.h - pad * 2,
      cb: l.cb
    };
  };
  var getQuietIcon = function (quiet) {
    return {
      0: soundIcon,
      1: priorityIcon,
      2: silentIcon
    }[quiet || 0];
  };
  var layout;
  var setAttribute = function (id, attribute, value) {
    if (Array.isArray(attribute)) {
      attribute.forEach(function (el) {
        layout[id][el[0]] = el[1];
      });
      layout.render(layout[id]);
    } else {
      layout[id][attribute] = value;
      layout.render(layout[id]);
    }
  };
  layout = new Layout({
    type: 'v',
    fillx: 1,
    filly: 1,
    c: [{
      type: 'h',
      fillx: 1,
      filly: 1,
      c: [{
        type: 'custom',
        id: 'quiet',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: getQuietIcon(state.settings.quiet),
        value: !state.settings.quiet,
        cb: function () {
          state.settings.quiet = state.settings.quiet >= 2 ? 0 : state.settings.quiet + 1;
          updateSettings(true);
          setAttribute('quiet', [['value', !state.settings.quiet], ['icon', getQuietIcon(state.settings.quiet)]]);
        }
      }, {
        type: 'custom',
        id: 'vibrate',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: vibrateIcon,
        value: state.settings.vibrate,
        cb: function () {
          state.settings.vibrate = !state.settings.vibrate;
          updateSettings(true);
          setAttribute('vibrate', 'value', state.settings.vibrate);
        }
      }, {
        type: 'custom',
        id: 'timeout',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: brightnessIcon,
        iconScale: 0.5,
        label: `${state.settings.timeout}`,
        cb: function () {
          state.settings.timeout = state.settings.timeout >= 60 ? 0 : state.settings.timeout + 10;
          updateSettings(true);
          setAttribute('timeout', 'value', `${state.settings.timeout}`);
          Bangle.setLCDTimeout(state.settings.timeout);
        }
      }]
    }, {
      type: 'h',
      fillx: 1,
      filly: 1,
      c: [{
        type: 'custom',
        id: 'HID',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: keyboardIcon,
        value: state.settings.HID,
        cb: function () {
          state.settings.HID = !state.settings.HID;
          updateSettings(true);
          setAttribute('HID', 'value', state.settings.HID);
        }
      }, {
        type: 'custom',
        id: 'twist',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: gestureIcon,
        value: state.settings.options.wakeOnTwist,
        cb: function () {
          state.settings.options.wakeOnTwist = !state.settings.options.wakeOnTwist;
          updateSettings(true);
          setAttribute('twist', 'value', state.settings.options.wakeOnTwist);
        }
      }, {
        type: 'custom',
        id: 'settings',
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        icon: settingsIcon,
        hideCircle: true,
        cb: function () {
          load('setting.app.js');
        }
      }]
    }, {
      type: 'v',
      height: 30,
      c: [{
        type: 'custom',
        id: 'brightnessslider',
        fillx: 1,
        render: function (l, g) {
          var height = 30;
          var pad = 20;
          var width = 5;
          var topOffset = height / 2 - width;
          var brightness = state.settings.brightness;
          g.fillRect(l.x + pad, l.y + topOffset, l.x + l.w * brightness - pad, l.y + topOffset + width);
          g.drawRect(l.x + pad + l.w * (1 - brightness), l.y + topOffset, l.x + l.w - pad, l.y + topOffset + width);
          g.fillCircle(l.x + l.w * brightness - pad, l.y + topOffset + width / 2, 10);
        }
      }]
    }]
  });
  g.clear();
  layout.render();
  state.registeredCleanUps[PAGE.SHORTCUTS] = function () {
    state.settings = null;
    layout.remove();
  };
  Bangle.drawWidgets();
};
PAGE_RENDERERS[PAGE.NOTIFICATIONS] = function () {
  E.showMessage('Page not implemented');
};
var APPS_PER_ROW = 3;
var ROWS_PER_PAGE = 3;
PAGE_RENDERERS[PAGE.LAUNCHER] = function () {
  var apps = storage.list(/\.info$/).map(function (app) {
    var a = storage.readJSON(app, 1);
    return a && {
      name: a.name,
      type: a.type,
      icon: a.icon,
      sortorder: a.sortorder,
      src: a.src
    };
  }).filter(function (app) {
    return app && (app.type == "app" || app.type == "clock" || !app.type);
  });
  apps.sort(function (a, b) {
    var n = (0 | a.sortorder) - (0 | b.sortorder);
    if (n) return n;
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  apps.forEach(function (app) {
    if (app.icon) app.icon = storage.read(app.icon);
  });
  var getAppIndex = function (page, row, column) {
    return page * (APPS_PER_ROW * ROWS_PER_PAGE) + row * APPS_PER_ROW + column;
  };
  var getCoordinates = function (appIndex) {
    var row = Math.floor(appIndex / APPS_PER_ROW);
    var column = appIndex % APPS_PER_ROW;
    var page = Math.floor(row / ROWS_PER_PAGE);
    return {
      page: page,
      id: `${row}-${column}`
    };
  };
  var getEmptyList = function (length) {
    return Array(length).fill().map(function (el, index) {
      return index;
    });
  };
  var maxPages = Math.floor(apps.length / (ROWS_PER_PAGE * APPS_PER_ROW));
  var layout = null;
  var renderIcon = function (l, g) {
    var pad = l.pad || 0;
    var appIndex = getAppIndex(state.launcherPage, l.rowIndex, l.columnIndex);
    var app = apps[appIndex];
    var selected = state.launcherSelected === getAppIndex(state.launcherPage, l.rowIndex, l.columnIndex);
    if (!app) {
      delete state.registeredShortcuts[`${l.rowIndex}-${l.columnIndex}`];
      return;
    }
    g.drawImage(app.icon, l.x + l.w / 2, l.y + l.h / 2, {
      rotate: 0,
      scale: l.iconScale || 1
    });
    if (selected) {
      g.setColor(g.theme.fgH);
    } else {
      g.setColor(g.theme.bg);
    }
    g.drawRect(l.x, l.y, l.x + l.w, l.y + l.h);
    state.registeredShortcuts[l.id] = {
      x: l.x + pad,
      y: l.y + pad,
      w: l.w - pad * 2,
      h: l.h - pad * 2,
      cb: function () {
        if (state.launcherSelected === getAppIndex(state.launcherPage, l.rowIndex, l.columnIndex)) {
          load(app.src);
        } else {
          var previousSelected = getCoordinates(state.launcherSelected);
          state.launcherSelected = appIndex;
          if (previousSelected.page === state.launcherPage) {
            layout.render(layout[previousSelected.id]);
          }
          layout.render(layout[l.id]);
        }
      }
    };
  };
  var renderCircle = function (l, g) {
    var pad = l.pad || 0;
    var rad = Math.min(l.w, l.h) / 2 - pad;
    if (l.page === state.launcherPage) {
      g.fillCircle(l.x + l.w / 2 + l.offsetX, l.y + l.h / 2, rad);
    } else {
      g.drawCircle(l.x + l.w / 2 + l.offsetX, l.y + l.h / 2, rad);
    }
  };
  var columnLayout = function (_ref) {
    var rowIndex = _ref[0],
      columnIndex = _ref[1];
    return {
      type: 'v',
      fillx: 1,
      filly: 1,
      pad: 2,
      c: [{
        type: 'custom',
        id: `${rowIndex}-${columnIndex}`,
        fillx: 1,
        filly: 1,
        pad: 2,
        render: renderIcon,
        rowIndex: rowIndex,
        columnIndex: columnIndex
      }]
    };
  };
  var rowLayout = function (c) {
    return {
      type: 'h',
      fillx: 1,
      filly: 1,
      c: c
    };
  };
  var rows = getEmptyList(ROWS_PER_PAGE).map(function (rowIndex) {
    return getEmptyList(APPS_PER_ROW).map(function (columnIndex) {
      return [rowIndex, columnIndex];
    });
  });
  layout = new Layout({
    type: 'h',
    fillx: 1,
    filly: 1,
    c: [{
      type: 'v',
      fillx: 1,
      filly: 1,
      c: rows.map(function (row) {
        return rowLayout(row.map(columnLayout));
      })
    }, {
      type: 'v',
      filly: 1,
      width: 10,
      c: getEmptyList(maxPages + 1).map(function (page) {
        return {
          type: 'custom',
          width: 10,
          height: 14,
          render: renderCircle,
          page: page,
          offsetX: -2
        };
      })
    }]
  });
  g.clear();
  layout.render();
  state.registeredCleanUps[PAGE.LAUNCHER] = function () {
    layout.remove();
  };
  state.registeredSwipeHandlers[DIRECTION.UP] = function () {
    if (state.launcherPage < maxPages) {
      state.launcherPage++;
      layout.clear();
      layout.render();
      Bangle.drawWidgets();
    }
  };
  state.registeredSwipeHandlers[DIRECTION.DOWN] = function () {
    if (state.launcherPage > 0) {
      state.launcherPage--;
      layout.clear();
      layout.render();
      Bangle.drawWidgets();
    }
  };
  Bangle.drawWidgets();
};
PAGE_RENDERERS[PAGE.WEATHER] = function () {
  load('weather.app.js');
};
PAGE_RENDERERS[PAGE.MUSIC_CONTROL] = function () {
  load('gbmusic.app.js');
};
Bangle.setUI = function () {};
if (Bangle.btnWatches) {
  Bangle.btnWatches.forEach(clearWatch);
  delete Bangle.btnWatches;
}
if (Bangle.dragHandler) {
  Bangle.removeListener("drag", Bangle.dragHandler);
  delete Bangle.dragHandler;
}
if (Bangle.touchHandler) {
  Bangle.removeListener("touch", Bangle.touchHandler);
  delete Bangle.touchHandler;
}
if (Bangle.baseTouchHandler) {
  Bangle.removeListener("touch", Bangle.baseTouchHandler);
  delete Bangle.baseTouchHandler;
}
if (Bangle.swipeHandler) {
  Bangle.removeListener("swipe", Bangle.swipeHandler);
  delete Bangle.swipeHandler;
}
Bangle.dragHandler = function (e) {
  state.swipe.dy += e.dy;
  state.swipe.dx += e.dx;
  if (!e.b) {
    var direction = 0b0000;
    if (state.swipe.dy > 0 && state.swipe.dy > DRAG_THRESHOLD) {
      direction |= DIRECTION.DOWN;
    } else if (state.swipe.dy < 0 && -state.swipe.dy > DRAG_THRESHOLD) {
      direction |= DIRECTION.UP;
    }
    if (state.swipe.dx > 0 && state.swipe.dx > DRAG_THRESHOLD) {
      direction |= DIRECTION.RIGHT;
    } else if (state.swipe.dx < 0 && -state.swipe.dx > DRAG_THRESHOLD) {
      direction |= DIRECTION.LEFT;
    }
    if (direction) {
      handleSwipe(direction);
    }
    state.swipe.dy = 0;
    state.swipe.dx = 0;
  }
};
Bangle.baseTouchHandler = function (button, xy) {
  return handleTouch(button, xy);
};
Bangle.on('drag', Bangle.dragHandler);
Bangle.on("touch", Bangle.baseTouchHandler);
g.clear();
Bangle.CLOCK = 1;
Bangle.btnWatches = [setWatch(Bangle.showLauncher, BTN1, {
  repeat: 1,
  edge: "falling"
})];
Bangle.loadWidgets();
renderCurrentPage();
