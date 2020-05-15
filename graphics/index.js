const $ = (...args) => document.body.querySelector(...args);

function alertFollowing(data) {
  const { userId, userDisplayName } = data;

  nodecg.sendMessageToBundle('say', 'sam-say', {
    text: `Hello ${userDisplayName}, thank you for the follow!`,
  });

  const appEl = $('#app');

  $('#alert-following .display-name').innerText = userDisplayName;

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

async function init() {
  nodecg.listenFor('follow', 'twitch-alerts', (data) => {
    alertFollowing(data);
  });
  setTimeout(update, UPDATE_PERIOD);
  window.requestAnimationFrame(draw);
}

const color = ({ r, g, b, a = 1.0 }) => ({ r, g, b, a });
const rnd = (max) => Math.floor(Math.random() * max);
const randomColor = () =>
  color({ r: rnd(255), g: rnd(255), b: rnd(255), a: 1.0 });

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
      dx: 250 + Math.random() * 250,
      dy: 0,
      ttl: 10,
      size: 48,
      color: randomColor(),
      dcolor: { r: dcolorRnd(), g: dcolorRnd(), b: dcolorRnd() },
    });
    particles.push(particle);
  }, 150);
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

function updateParticle(particle, dt) {
  const canvas = document.getElementById('canvas');

  particle.x += particle.dx * dt;
  particle.y += particle.dy * dt;

  if (particle.x > canvas.width) {
    particle.alive = false;
  }

  // Hacky color cycling
  for (const name of ['r', 'g', 'b']) {
    particle.color[name] =
      ((particle.color[name] + particle.dcolor[name] * dt) % 255);
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
  const { r, g, b, a } = color;

  ctx.save();

  const rgba = `rgba(${Math.floor(r)},${Math.floor(g)},${Math.floor(b)},${a})`;

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
