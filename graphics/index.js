const $ = (...args) => document.body.querySelector(...args);

async function init() {
  nodecg.listenFor('twitch.following', 'twitch-connect', (data) => {
    alertFollowing(data);
  });
  setTimeout(update, UPDATE_PERIOD);
  window.requestAnimationFrame(draw);
}

function alertFollowing(data) {
  const { from_name } = data;

  nodecg.sendMessageToBundle('say', 'sam-say', {
    text: `Hello ${from_name}, thank you for the follow!`,
  });

  const appEl = $('#app');

  $('#alert-following .display-name').innerText = from_name;

  appEl.classList.add('show');
  resetAnimation();
  startAnimation();

  setTimeout(() => {
    setTimeout(() => {
      stopAnimation();
    }, 2000);
    appEl.classList.remove('show');
    appEl.classList.add('hide');
  }, 5000);
}

const color = ({ h, s, l, a = 1.0 }) => ({ h, s, l, a });
const rnd = (max) => (Math.random() * max);
const randomColor = () =>
  color({ h: rnd(1), s: 0.75, l: 0.5, a: 1.0 });

const UPDATE_PERIOD = 1000 / 60;

let isRunning = false;
let particles = [];

let createParticleInterval = null;

const resetAnimation = () => (particles = []);

const DCOLOR_RANGE = 512;
const dcolorRnd = () => DCOLOR_RANGE - rnd(DCOLOR_RANGE * 2);

const startAnimation = () => {
  isRunning = true;
  if (createParticleInterval) {
    clearInterval(createParticleInterval);
  }
  createParticleInterval = setInterval(() => {
    const canvas = document.getElementById('canvas');
    const particle = createParticle({
      x: -32,
      y: Math.random() * canvas.height,
      dx: 500 + Math.random() * 500,
      dy: 0,
      ttl: 10,
      size: 48,
      color: randomColor(),
      dcolor: { h: rnd(1.0), s: 0, l: 0, a: 0 },
    });
    particles.push(particle);
  }, 100);
};

const stopAnimation = () => {
  isRunning = false;
  if (createParticleInterval) {
    clearInterval(createParticleInterval);
  }
};

let lastUpdate = Date.now();
function update() {
  const now = Date.now();
  const dt = (now - lastUpdate) / 1000;
  if (isRunning) {
    for (const particle of particles) {
      updateParticle(particle, dt);
    }
  }
  particles = particles.filter((particle) => particle.alive);
  lastUpdate = now;
  window.particles = particles;
  setTimeout(update, UPDATE_PERIOD);
}

function draw() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');

  const cw = 1280; //canvas.parentElement.offsetWidth;
  const ch = 720; //canvas.parentElement.offsetHeight;
  canvas.width = cw;
  canvas.height = ch;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(0, 0, cw, ch);

  if (isRunning) {
    for (const particle of particles) {
      drawParticle(particle, ctx);
    }
  }

  window.requestAnimationFrame(draw);
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   Number  h       The hue
 * @param   Number  s       The saturation
 * @param   Number  l       The lightness
 * @return  Array           The RGB representation
 */
function hslToRgb(h, s, l) {
  var r, g, b;

  if (s == 0) {
    r = g = b = l; // achromatic
  } else {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }

    var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    var p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return [r * 255, g * 255, b * 255];
}

function updateParticle(particle, dt) {
  const canvas = document.getElementById('canvas');

  particle.x += particle.dx * dt;
  particle.y += particle.dy * dt;

  if (particle.x > canvas.width) {
    particle.alive = false;
  }

  for (const name of Object.keys(particle.color)) {
    particle.color[name] = (particle.color[name] + particle.dcolor[name] * dt) % 1.0;
  }

  particle.ttl -= dt;
  if (particle.ttl < 0) {
    particle.alive = false;
  }
}

function createParticle({ x, y, dx, dy, ttl, color, ...rest }) {
  return {
    x,
    y,
    dx,
    dy,
    ttl,
    color,
    size: 16,
    rotation: 90 * (Math.PI / 180),
    alive: true,
    ...rest,
  };
}

function drawParticle(particle, ctx) {
  const { x, y, color, rotation, size } = particle;
  const { h, s, l, a } = color;

  ctx.save();

  const [r, g, b] = hslToRgb(h, s, l);

  const rgba = `rgba(${r},${g},${b},1.0)`;

  ctx.lineWidth = 3;

  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(size / 100, size / 100);

  ctx.strokeStyle = rgba;
  ctx.beginPath();
  ctx.moveTo(0, -50);
  ctx.lineTo(-45, 50);
  ctx.lineTo(-12.5, 12.5);
  ctx.lineTo(0, 25);
  ctx.lineTo(12.5, 12.5);
  ctx.lineTo(45, 50);
  ctx.lineTo(0, -50);
  ctx.moveTo(0, -50);
  ctx.stroke();

  ctx.restore();
}

init();
