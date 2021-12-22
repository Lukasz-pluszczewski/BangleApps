const Layout = require('Layout');
const locale = require('locale');
const weather = require('weather');
let current = weather.get();

Bangle.loadWidgets();

var layout = new Layout({type:"v", bgCol: g.theme.bg, c: [
  {filly: 1},
  {type: "h", filly: 0, c: [
    {type: "custom", width: g.getWidth()/2, height: g.getWidth()/2, valign: -1, txt: "unknown", id: "icon",
      render: l => console.log('drawingIcon', l.txt) || weather.drawIcon(l.txt, l.x+l.w/2, l.y+l.h/2, l.w/2-5)},
    {type: "v", fillx: 1, c: [
      {type: "h", pad: 2, c: [
        {type: "txt", font: "18%", id: "temp", label: "000"},
        {type: "txt", font: "12%", valign: -1, id: "tempUnit", label: "°C"},
      ]},
      {filly: 1},
      {type: "txt", font: "6x8", pad: 2, halign: 1, label: "Humidity"},
      {type: "txt", font: "9%", pad: 2, halign: 1, id: "hum", label: "000%"},
      {filly: 1},
      {type: "txt", font: "6x8", pad: 2, halign: -1, label: "Wind"},
      {type: "h", halign: -1, c: [
        {type: "txt", font: "9%", pad: 2, id: "wind",  label: "00"},
        {type: "txt", font: "6x8", pad: 2, valign: -1, id: "windUnit", label: "km/h"},
      ]},
    ]},
  ]},
  {filly: 1},
  {type: "txt", font: "9%", wrap: true, height: g.getHeight()*0.18, fillx: 1, id: "cond", label: "Weather condition"},
  {filly: 1},
  {type: "h", c: [
    {type: "txt", font: "6x8", pad: 4, id: "loc", label: "Toronto"},
    {fillx: 1},
    {type: "txt", font: "6x8", pad: 4, id: "updateTime", label: "15 minutes ago"},
  ]},
  {filly: 1},
]}, {lazy: true});

function formatDuration(millis) {
  let pluralize = (n, w) => n + " " + w + (n == 1 ? "" : "s");
  if (millis < 60000) return "< 1 minute";
  if (millis < 3600000) return pluralize(Math.floor(millis/60000), "minute");
  if (millis < 86400000) return pluralize(Math.floor(millis/3600000), "hour");
  return pluralize(Math.floor(millis/86400000), "day");
}

const weatherMappings = {
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
const charFallbacks = {
  "č":"c",
  "ř":"r",
  "ő":"o",
  "ě":"e",
  "ę":"e",
  "ą":"a",
  "ó":"o",
  "ż":"z",
  "ź":"z",
  "ń":"n",
  "ł":"l",
  "ś":"s",
  "ć":"c",
};

function draw() {
  const englishCondition = (weatherMappings[current.txt.toLowerCase()] || 'unknown').toLowerCase();
  const translatedCondition = current.txt.split('').map(letter => console.log('char?', charFallbacks[letter]) || (charFallbacks[letter] || letter)).join('');
  console.log('translated', translatedCondition);
  console.log('charFallbacks', charFallbacks);
  layout.icon.txt = englishCondition;
  console.log('englishCondition', englishCondition)
  const temp = locale.temp(current.temp-273.15).match(/^(\D*\d*)(.*)$/);
  layout.temp.label = temp[1];
  layout.tempUnit.label = temp[2];
  layout.hum.label = current.hum+"%";
  const wind = locale.speed(current.wind).match(/^(\D*\d*)(.*)$/);
  layout.wind.label = wind[1];
  layout.windUnit.label = wind[2] + " " + (current.wrose||'').toUpperCase();
  layout.cond.label = translatedCondition.charAt(0).toUpperCase()+(translatedCondition||'').slice(1);
  layout.loc.label = current.loc;
  layout.updateTime.label = `${formatDuration(Date.now() - current.time)} ago`;
  layout.update();
  layout.render();
}

function drawUpdateTime() {
  if (!current || !current.time) return;
  layout.updateTime.label = `${formatDuration(Date.now() - current.time)} ago`;
  layout.update();
  layout.render();
}

function update() {
  current = weather.get();
  NRF.removeListener("connect", update);
  if (current) {
    draw();
  } else {
    layout.forgetLazyState();
    if (NRF.getSecurityStatus().connected) {
      E.showMessage("Weather\nunknown\n\nIs Gadgetbridge\nweather\nreporting set\nup on your\nphone?");
    } else {
      E.showMessage("Weather\nunknown\n\nGadgetbridge\nnot connected");
      NRF.on("connect", update);
    }
  }
}

let interval = setInterval(drawUpdateTime, 60000);
Bangle.on('lcdPower', (on) => {
  if (interval) {
    clearInterval(interval);
    interval = undefined;
  }
  if (on) {
    drawUpdateTime();
    interval = setInterval(drawUpdateTime, 60000);
  }
});

weather.on("update", update);

update();

// Show launcher when middle button pressed
Bangle.setUI("clock");

Bangle.drawWidgets();
