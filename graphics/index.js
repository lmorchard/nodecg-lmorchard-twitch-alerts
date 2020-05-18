const UPDATE_PERIOD = 1000 / 60;

const $ = (...args) => document.body.querySelector(...args);
const appEl = $('#app');

let isRunning = false;
let particleSystems = [];

async function init() {
  reset();
  update();
  draw();

  nodecg.listenFor('twitch.following', 'twitch-connect', alertFollowing);
}

async function alertFollowing(data) {
  const { from_name } = data;

  setTimeout(() => {
    nodecg.sendMessageToBundle('say', 'sam-say', {
      text: `Greetz ${from_name}! Thanks for the follow!`,
    });  
  }, 1000);

  start([
    new ZoomyShips({
      lineWidth: 10,
    }),
    new SineScroller({
      y: 320,
      speed: 325,
      size: 75,
      kerning: 0.9,
      waveWidth: 100,
      waveHeight: 40,
      message: `Greetz ${from_name}!`,
    }),
    new SineScroller({
      y: 500,
      speed: 325,
      size: 75,
      kerning: 0.9,
      waveWidth: 175,
      waveHeight: 40,
      message: `     Thanks for the follow!`,
    }),
  ]);
  await show();
  await waitUntilFinished();
  await hide();
  stop();
}

async function show() {
  appEl.classList.add('show');
  appEl.classList.remove('hide');
  return wait(1000);
}

async function hide() {
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
  particleSystems = newSystems;
  for (const system of particleSystems) {
    system.start();
  }
}

function stop() {
  isRunning = false;
  for (const system of particleSystems) {
    system.stop();
  }
}

async function waitUntilFinished() {
  await Promise.all(
    particleSystems
      .filter((system) => system.willEverFinish)
      .map((system) => system.waitUntilFinished())
  );
}

function update() {
  if (isRunning) {
    const canvas = document.getElementById('canvas');
    for (const system of particleSystems) {
      system.update(canvas);
    }
  }
  setTimeout(update, UPDATE_PERIOD);
}

function draw() {
  if (isRunning) {
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
  }
  window.requestAnimationFrame(draw);
}

class ParticleSystem {
  constructor() {
    this.reset();
    this.particleUpdates = [];
    this.willEverFinish = false;
  }

  reset() {
    this.resolveWhenFinished = [];
    this.particles = [];
    this.running = false;
    this.lastUpdate = Date.now();
  }

  start() {
    this.reset();
    this.running = true;
  }

  pause() {
    this.running = !this.running;
  }

  stop() {
    this.running = false;
  }

  async waitUntilFinished() {
    const parent = this;
    return new Promise((resolve) => parent.resolveWhenFinished.push(resolve));
  }

  finish() {
    this.stop();
    for (const resolve of this.resolveWhenFinished) {
      resolve(true);
    }
  }

  update(canvas) {
    const now = Date.now();
    const dt = (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;
    if (this.running) {
      for (const particle of this.particles) {
        this.updateParticle(particle, canvas, dt);
      }
      this.particles = this.particles.filter((particle) => particle.alive);
    }
    return dt;
  }

  draw(canvas) {
    if (this.running) {
      for (const particle of this.particles) {
        this.drawParticle(particle, canvas);
      }
    }
  }

  updateParticle(particle, canvas, dt) {
    ParticleUpdates.apply(particle, canvas, dt, this.particleUpdates);
  }

  drawParticle(particle, canvas) {}
}

const ParticleUpdates = {
  apply(particle, canvas, dt, updates) {
    updates.forEach((fn) => fn(particle, canvas, dt));
  },

  move(particle, canvas, dt) {
    const { dx, dy } = particle;
    particle.x += dx * dt;
    particle.y += dy * dt;
  },

  moveSineWave: ({ waveWidth, waveHeight }) => (particle, canvas, dt) => {
    particle.x += particle.dx * dt;
    particle.y = particle.baseY + Math.sin(particle.x / waveWidth) * waveHeight;
  },

  age(particle, canvas, dt) {
    particle.ttl -= dt;
    if (particle.ttl < 0) {
      particle.alive = false;
    }
  },

  dieOffScreen(particle, canvas, dt) {
    const { x, y, size } = particle;
    if (
      x < 0 - size ||
      x > canvas.width + size ||
      y < 0 - size ||
      y > canvas.height + size
    ) {
      particle.alive = false;
    }
  },

  colorCycle(particle, canvas, dt) {
    for (const name of Object.keys(particle.color)) {
      particle.color[name] =
        (particle.color[name] + particle.dcolor[name] * dt) % 1.0;
    }
  },
};

class SineScroller extends ParticleSystem {
  constructor(opts = {}) {
    super(opts);
    Object.assign(this, {
      willEverFinish: true,
      y: 320,
      message: 'Hello world',
      speed: 250,
      color: { h: 0.0, s: 0.75, l: 0.5, a: 1.0 },
      dcolor: { h: 0.3, s: 0, l: 0, a: 0 },
      size: 75,
      kerning: 0.75,
      waveWidth: 75,
      waveHeight: 30,
      ...opts,
    });

    this.letters = this.message.split('');

    this.particleUpdates = [
      ParticleUpdates.moveSineWave(this),
      ParticleUpdates.age,
      ParticleUpdates.dieOffScreen,
    ];
  }

  update(canvas) {
    const dt = super.update(canvas);

    for (const name of Object.keys(this.color)) {
      this.color[name] = (this.color[name] + this.dcolor[name] * dt) % 1.0;
    }

    if (
      this.particles.length === 0 ||
      this.particles[this.particles.length - 1].x < canvas.width
    ) {
      const letter = this.letters.shift();
      if (letter) {
        this.spawnParticle(canvas, letter);
      }
    }

    if (this.particles.length === 0) {
      return this.finish();
    }
  }

  spawnParticle(canvas, letter) {
    this.particles.push({
      letter,
      x: canvas.width + this.size * this.kerning,
      y: 0,
      baseY: this.y,
      dx: 0 - this.speed,
      ttl: 20,
      size: this.size,
      rotation: 90 * (Math.PI / 180),
      alive: true,
    });
  }

  drawParticle(particle, canvas) {
    const ctx = canvas.getContext('2d');
    const { letter, x, y, rotation, size } = particle;
    const { h, s, l, a } = this.color;

    ctx.save();

    const [r, g, b] = hslToRgb(h, s, l);

    const rgba = `rgba(${r},${g},${b},1.0)`;

    ctx.translate(x, y);

    ctx.font = `${this.size}px C64 User Mono`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillText(letter, this.size * 0.125, this.size * 0.125);
    ctx.fillStyle = rgba;
    ctx.fillText(letter, 0, 0);

    ctx.restore();
  }
}

class ZoomyShips extends ParticleSystem {
  constructor(opts = {}) {
    super(opts);

    Object.assign(this, {
      spawnDelay: 0.25,
      size: 50,
      lineWidth: 5,
      minSpeed: 500,
      speedVary: 1000,
      ...opts,
    });

    this.nextParticleDelay = 0;

    this.particleUpdates = [
      ParticleUpdates.move,
      ParticleUpdates.age,
      ParticleUpdates.colorCycle,
      ParticleUpdates.dieOffScreen,
    ];
  }

  update(canvas) {
    const dt = super.update(canvas);
    this.nextParticleDelay -= dt;
    if (this.nextParticleDelay <= 0) {
      this.nextParticleDelay = this.spawnDelay;
      this.spawnParticle(canvas);
    }
  }

  spawnParticle(canvas) {
    this.particles.push({
      x: this.size,
      y: Math.random() * canvas.height,
      dx: this.minSpeed + Math.random() * this.speedVary,
      dy: 0,
      ttl: 10,
      size: this.size,
      color: { h: Math.random(), s: 0.75, l: 0.5, a: 1.0 },
      dcolor: { h: Math.random(), s: 0, l: 0, a: 0 },
      rotation: 90 * (Math.PI / 180),
      alive: true,
    });
  }

  drawParticle(particle, canvas) {
    const ctx = canvas.getContext('2d');
    const { x, y, color, rotation, size } = particle;
    const { h, s, l, a } = color;

    ctx.save();

    const [r, g, b] = hslToRgb(h, s, l);

    const rgba = `rgba(${r},${g},${b},1.0)`;

    ctx.lineWidth = this.lineWidth;

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
