const $ = (...args) => document.body.querySelector(...args);
const appEl = $('#app');

let isRunning = false;
let particleSystems = [];

const UPDATE_PERIOD = 1000 / 60;

async function init() {
  reset();
  update();
  draw();

  alertFollowing({ from_name: 'ExampleUser' });

  nodecg.listenFor('twitch.following', 'twitch-connect', (data) => {
    alertFollowing(data);
  });
}

async function alertFollowing(data) {
  const { from_name } = data;

  nodecg.sendMessageToBundle('say', 'sam-say', {
    text: `Hello ${from_name}, thank you for the follow!`,
  });

  const appEl = $('#app');

  $('#alert-following .display-name').innerText = from_name;

  start([new ZoomyShips()]);
  await show();
  //await wait(3000);
  //await hide();
  //stop();
}

function show() {
  appEl.classList.add('show');
  appEl.classList.remove('hide');
  return wait(1000);
}

function hide() {
  appEl.classList.remove('show');
  appEl.classList.add('hide');
  return wait(1000);
}

function reset() {
  isRunning = false;
  particleSystems = [];
}

function start(newSystems = []) {
  isRunning = true;
  for (const system of particleSystems) {
    system.start();
  }
  window.particles = particleSystems = newSystems;
}

function stop() {
  isRunning = false;
  for (const system of particleSystems) {
    system.stop();
  }
}

function update() {
  const canvas = document.getElementById('canvas');
  for (const system of particleSystems) {
    system.update(canvas);
  }
  setTimeout(update, UPDATE_PERIOD);
}

function draw() {
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const cw = 1280; //canvas.parentElement.offsetWidth;
  const ch = 720; //canvas.parentElement.offsetHeight;
  canvas.width = cw;
  canvas.height = ch;

  ctx.fillStyle = 'rgba(0, 0, 0, 0)';
  ctx.fillRect(0, 0, cw, ch);

  for (const system of particleSystems) {
    system.draw(canvas);
  }

  window.requestAnimationFrame(draw);
}

class ParticleSystem {
  constructor() {
    this.reset();
  }

  reset() {
    this.particles = [];
    this.running = false;
    this.lastUpdate = Date.now();
  }

  start() {
    this.reset();
    this.running = true;
  }

  pause() {
    this.running = false;
  }

  update(canvas) {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    for (const particle of this.particles) {
      this.updateParticle(particle, canvas, dt);
    }
    this.particles = this.particles.filter((particle) => particle.alive);
    return dt;
  }

  draw(canvas) {
    for (const particle of this.particles) {
      this.drawParticle(particle, canvas);
    }
  }

  updateParticle(particle, canvas, dt) {}

  drawParticle(particle, canvas) {}
}

class ZoomyShips extends ParticleSystem {
  constructor({ ...opts } = {}) {
    super(opts);
    this.nextParticleDelay = 0;
  }

  update(canvas) {
    const dt = super.update(canvas);
    this.nextParticleDelay -= dt;
    if (this.nextParticleDelay <= 0) {
      this.nextParticleDelay = 0.1;
      this.spawnParticle(canvas);
    }
    window.npd = this.nextParticleDelay;
  }

  spawnParticle(canvas) {
    this.particles.push({
      x: -32,
      y: Math.random() * canvas.height,
      dx: 500 + Math.random() * 500,
      dy: 0,
      ttl: 10,
      size: 48,
      color: { h: Math.random(), s: 0.75, l: 0.5, a: 1.0 },
      dcolor: { h: Math.random(), s: 0, l: 0, a: 0 },
      size: 32,
      rotation: 90 * (Math.PI / 180),
      alive: true,
    });
  }

  updateParticle(particle, canvas, dt) {
    particle.x += particle.dx * dt;
    particle.y += particle.dy * dt;

    if (particle.x > canvas.width) {
      particle.alive = false;
    }

    for (const name of Object.keys(particle.color)) {
      particle.color[name] =
        (particle.color[name] + particle.dcolor[name] * dt) % 1.0;
    }

    particle.ttl -= dt;
    if (particle.ttl < 0) {
      particle.alive = false;
    }
  }

  drawParticle(particle, canvas) {
    const ctx = canvas.getContext('2d');
    const { x, y, color, rotation, size } = particle;
    const { h, s, l, a } = color;

    ctx.save();

    const [r, g, b] = hslToRgb(h, s, l);

    const rgba = `rgba(${r},${g},${b},1.0)`;

    ctx.lineWidth = 10;

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
}

const wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay));

// https://axonflux.com/handy-rgb-to-hsl-and-rgb-to-hsv-color-model-c
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

init();
