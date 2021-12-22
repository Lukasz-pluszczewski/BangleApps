(() => {
  function draw() {
    g.reset();
    var m = process.memory();
    var pc = Math.round(m.usage*100/m.total);
    // g.drawImage(atob("BwgBqgP////AVQ=="), this.x+(24-7)/2, this.y+4);
    g.setColor("#000000");
    g.setFont("6x15").setFontAlign(-1,0).drawString(pc+"% " + m.usage, this.x+5, this.y+15, true/*solid*/);
  }
  var ramInterval;
  Bangle.on('lcdPower', function(on) {
    if (on) {
      WIDGETS["ram"].draw();
      if (!ramInterval) ramInterval = setInterval(()=>WIDGETS["ram"].draw(), 10000);
    } else {
      if (ramInterval) {
        clearInterval(ramInterval);
        ramInterval = undefined;
      }
    }
  });
  WIDGETS["ram"]={area:"tl",width: 64,draw:draw};
})()
