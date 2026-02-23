// marko birthday 2026

// audio file constants
const INTRO_DURATION   = 33.130;
const LOOP_START_TRIM  = 0.028;  // dead silence at the start of loop.mp3
const LOOP_END         = 52.99230;
const BPM              = 145;
const BEAT_INTERVAL    = 60 / BPM; // ~0.41379s

// timestamps from lyrics.txt (M:SS:CS converted to seconds)
const LYRICS = [
  { t:  5.00, text: "Today, we celebrate the birth of a true visionary." },
  { t:  8.57, text: "A man of unmatched intellect." },
  { t: 11.00, text: "Boundless creativity." },
  { t: 12.64, text: "Devastating handsomeness." },
  { t: 14.78, text: "A pioneer of digital worlds." },
  { t: 17.35, text: "A titan of Tampere." },
  { t: 19.28, text: "A beacon of hope for all mankind." },
  { t: 22.28, text: "Some call him a genius." },
  { t: 24.21, text: "Others, a legend." },
  { t: 26.35, text: "Scientists remain unable to explain his power." },
  { t: 30.64, text: "Congratulations, Marko." },
];

const loadingScreen = document.getElementById('loading-screen');
const startScreen   = document.getElementById('start-screen');
const playBtn       = document.getElementById('play-btn');
const hbdText       = document.getElementById('hbd-text');
const lyricText     = document.getElementById('lyric-text');

// app state machine: LOADING → READY → INTRO_PLAYING → LOOP_PLAYING
let state = 'LOADING';
let audioCtx           = null;
let introBuffer        = null;
let loopBuffer         = null;
let introSource        = null;
let loopSource         = null;
let introStartTime     = 0;   // audioCtx.currentTime at play click
let loopStartAudioTime = 0;   // when the loop is scheduled to begin
let loopStarted        = false;
let currentLyricIdx    = -1;
let pixiApp            = null;
let markoSprite        = null;
let particleContainer  = null;
let particles          = [];
let currentMode        = 0;
let lastBeat           = -1;
let dropHandled        = false;

// base intensities per effect mode, beat pulse adds on top of these.
// modes cycle every 16 beats (4 bars), giving each one about 6.5 seconds.
const EFFECT_MODES = [
  { wave: 0.9, chroma: 0.15, vortex: 0.0, barrel: 0.2, scanline: 0.6 },  // wave + scanlines
  { wave: 0.3, chroma: 0.5,  vortex: 0.7, barrel: 0.4, scanline: 0.1 },  // hue shift
  { wave: 0.3, chroma: 0.9,  vortex: 0.0, barrel: 0.1, scanline: 1.0 },  // glitch/chroma
  { wave: 0.5, chroma: 0.3,  vortex: 0.5, barrel: 1.0, scanline: 0.2 },  // barrel + hue
];


// ── preload ──────────────────────────────────

async function preload() {
  const imgEl = new Image();

  // fetch all three assets in parallel; image decode is fire-and-forget
  const [introAB, loopAB] = await Promise.all([
    fetch('intro.mp3').then(r => r.arrayBuffer()),
    fetch('loop.mp3').then(r => r.arrayBuffer()),
    new Promise(resolve => {
      imgEl.onload = resolve;
      imgEl.onerror = resolve;
      imgEl.src = 'image.jpg';
    }),
  ]);

  // temp AudioContext to decode audiofiles, real one created later inside a user gesture
  const tmpCtx = new (window.AudioContext || window.webkitAudioContext)();
  [introBuffer, loopBuffer] = await Promise.all([
    tmpCtx.decodeAudioData(introAB),
    tmpCtx.decodeAudioData(loopAB),
  ]);
  await tmpCtx.close();

  loadingScreen.style.display = 'none';
  startScreen.style.display   = 'flex';
  state = 'READY';
}


// ── pixi setup ───────────────────────────────

function setupPixi() {
  pixiApp = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x000000,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  document.getElementById('canvas-container').appendChild(pixiApp.view);

  const tex = PIXI.Texture.from('image.jpg');
  markoSprite = new PIXI.Sprite(tex);
  markoSprite.alpha = 0;
  coverSprite(markoSprite);
  pixiApp.stage.addChild(markoSprite);

  particleContainer = new PIXI.Container();
  pixiApp.stage.addChild(particleContainer);

  const wave     = createWaveFilter();
  const chroma   = createChromaFilter();
  const vortex   = createVortexFilter();
  const barrel   = createBarrelFilter();
  const scanline = createScanlineFilter();

  markoSprite.filters = [wave, chroma, vortex, barrel, scanline];

  // stash on window so mainTick can grab without a closure
  window._filters = { wave, chroma, vortex, barrel, scanline };

  pixiApp.renderer.on('resize', () => coverSprite(markoSprite));
  pixiApp.ticker.add(mainTick);
}

// scale + center the sprite so it covers the viewport (like CSS background-size: cover)
function coverSprite(sprite) {
  if (!sprite.texture.valid) {
    sprite.texture.on('update', () => coverSprite(sprite));
    return;
  }
  const sw = pixiApp.screen.width;
  const sh = pixiApp.screen.height;
  const tw = sprite.texture.width;
  const th = sprite.texture.height;
  const scale = Math.max(sw / tw, sh / th);
  sprite.scale.set(scale);
  sprite.x = (sw - tw * scale) / 2;
  sprite.y = (sh - th * scale) / 2;
}


// ── glsl filters ─────────────────────────────

// PIXI's built-in vertex shader has no precision declaration, so vTextureCoord
// ends up as implicitly highp. our fragment shaders use mediump, Firefox's
// GLSL linker rejects that mismatch. using our own vertex shader with explicit
// mediump keeps both sides consistent.
const VERT_SRC = `
  precision mediump float;
  attribute vec2 aVertexPosition;
  uniform mat3 projectionMatrix;
  uniform vec4 inputSize;
  uniform vec4 outputFrame;
  varying vec2 vTextureCoord;
  void main(void) {
    vec2 pos = aVertexPosition * max(outputFrame.zw, vec2(0.0)) + outputFrame.xy;
    gl_Position = vec4((projectionMatrix * vec3(pos, 1.0)).xy, 0.0, 1.0);
    vTextureCoord = aVertexPosition * (outputFrame.zw * inputSize.zw);
  }
`;

// sine wave UV displacement, x and y use different frequencies and speeds
// so it doesn't look like a regular grid ripple
function createWaveFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    void main(void) {
      vec2 uv = vTextureCoord;
      float freq = 8.0;
      float amt = uIntensity * 0.025;
      uv.x += sin(uv.y * freq + uTime * 2.5) * amt;
      uv.y += cos(uv.x * freq * 0.7 + uTime * 1.8) * amt * 0.6;
      gl_FragColor = texture2D(uSampler, uv);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// RGB channel split, samples R and B at positions offset radially from center,
// G stays put. cheap lens fringing / prismatic effect
function createChromaFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    void main(void) {
      vec2 uv = vTextureCoord;
      float amt = uIntensity * 0.018;
      vec2 dir = uv - vec2(0.5, 0.5);
      float r = texture2D(uSampler, uv + dir * amt * 1.5).r;
      float g = texture2D(uSampler, uv).g;
      float b = texture2D(uSampler, uv - dir * amt * 1.5).b;
      float a = texture2D(uSampler, uv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// hue rotation using Rodrigues' axis-angle formula on RGB.
// rotating around the (1,1,1) axis shifts hue while preserving luminance relationships.
// uIntensity drives the rotation angle, so hue pops on each beat and decays back.
// no spatial distortion — purely color-based, so it's trippy without being dizzying
function createVortexFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    vec3 hueShift(vec3 col, float angle) {
      vec3 k = vec3(0.57735); // normalize(1,1,1) — the hue rotation axis
      float c = cos(angle);
      float s = sin(angle);
      return col * c + cross(k, col) * s + k * dot(k, col) * (1.0 - c);
    }

    void main(void) {
      vec4 color = texture2D(uSampler, vTextureCoord);
      // 1.8 rad (~103deg) at full intensity — enough for a strong shift without flipping to complementary
      float angle = uIntensity * 1.8;
      color.rgb = hueShift(color.rgb, angle);
      gl_FragColor = color;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// barrel / fisheye distortion, pushes UV outward based on squared distance from center
function createBarrelFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    void main(void) {
      vec2 uv = vTextureCoord - vec2(0.5, 0.5);
      float r2 = dot(uv, uv);
      float k = uIntensity * 0.6;
      uv *= 1.0 + k * r2;
      uv += vec2(0.5, 0.5);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      } else {
        gl_FragColor = texture2D(uSampler, uv);
      }
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// CRT scanlines + glitch slices. rand() is a basic float hash.
// floor(uTime * 8) snaps to a new random slice position 8 times per second
function createScanlineFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    float rand(float x) {
      return fract(sin(x * 127.1) * 43758.5453);
    }

    void main(void) {
      vec2 uv = vTextureCoord;

      float glitchAmt = uIntensity * 0.04;
      float sliceTime = floor(uTime * 8.0);
      float sliceY = rand(sliceTime);
      float sliceH = 0.03 + rand(sliceTime + 1.0) * 0.06;
      if (abs(uv.y - sliceY) < sliceH) {
        uv.x += (rand(sliceTime + 2.0) - 0.5) * glitchAmt * 3.0;
        uv.x = clamp(uv.x, 0.0, 1.0);
      }

      vec4 color = texture2D(uSampler, uv);

      float line = sin(uv.y * 180.0) * 0.5 + 0.5;
      float darkBand = mix(1.0, 0.72, (1.0 - line) * uIntensity * 0.8);
      color.rgb *= darkBand;

      gl_FragColor = color;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}


// ── audio playback ───────────────────────────

function startPlayback() {
  // AudioContext must be created inside a user gesture (browser autoplay policy)
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  introStartTime     = audioCtx.currentTime;
  loopStartAudioTime = audioCtx.currentTime + INTRO_DURATION;

  introSource = audioCtx.createBufferSource();
  introSource.buffer = introBuffer;
  introSource.connect(audioCtx.destination);
  introSource.start(introStartTime);

  // schedule the loop to start exactly when the intro ends, no gap, no click.
  // start() with an offset skips the dead silence at the head of the file
  loopSource = audioCtx.createBufferSource();
  loopSource.buffer    = loopBuffer;
  loopSource.loop      = true;
  loopSource.loopStart = LOOP_START_TRIM;
  loopSource.loopEnd   = LOOP_END;
  loopSource.connect(audioCtx.destination);
  loopSource.start(loopStartAudioTime, LOOP_START_TRIM);
}


// ── beat sync ────────────────────────────────

// returns how many beats have elapsed since the loop started, and the
// fractional position within the current beat (0 = downbeat, 1 = next beat)
function getBeatInfo() {
  if (!loopStarted) return { beat: 0, phase: 0 };
  const elapsed   = audioCtx.currentTime - loopStartAudioTime;
  const beatFloat = elapsed / BEAT_INTERVAL;
  return { beat: Math.floor(beatFloat), phase: beatFloat % 1 };
}


// ── particles ────────────────────────────────

const PARTICLE_COLORS = [0x00ffff, 0xff00ff, 0xffcc00, 0xffffff, 0x00ff88];

function spawnParticles() {
  const cx = pixiApp.screen.width / 2;
  const cy = pixiApp.screen.height / 2;

  for (let i = 0; i < 80; i++) {
    const g     = new PIXI.Graphics();
    const color = PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    const type  = Math.floor(Math.random() * 3); // 0=dot, 1=triangle, 2=diamond
    const size  = 3 + Math.random() * 8;

    g.beginFill(color, 1);
    if (type === 0) {
      g.drawCircle(0, 0, size);
    } else if (type === 1) {
      g.drawPolygon([0, -size, size * 0.866, size * 0.5, -size * 0.866, size * 0.5]);
    } else {
      g.drawPolygon([0, -size, size * 0.6, 0, 0, size, -size * 0.6, 0]);
    }
    g.endFill();

    // evenly spread around 360° with a bit of jitter so it doesn't look like a clock
    const angle = (i / 80) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const speed = 3 + Math.random() * 9;

    g.x = cx;
    g.y = cy;
    g._vx    = Math.cos(angle) * speed;
    g._vy    = Math.sin(angle) * speed;
    g._life  = 1.0;
    g._decay = 0.008 + Math.random() * 0.012;

    particleContainer.addChild(g);
    particles.push(g);
  }
}

// iterate backwards so splicing doesn't mess up the index
function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p._vy += 0.12;   // gravity
    p._vx *= 0.985;  // drag
    p._vy *= 0.985;
    p.x += p._vx;
    p.y += p._vy;
    p._life -= p._decay;
    p.alpha = Math.max(0, p._life);
    if (p._life <= 0) {
      particleContainer.removeChild(p);
      p.destroy();
      particles.splice(i, 1);
    }
  }
}


// ── drop handler ─────────────────────────────

function handleDrop() {
  if (dropHandled) return;
  dropHandled = true;
  loopStarted = true;

  spawnParticles();
  hbdText.classList.add('visible');

  // slam all filters to max for ~2 beats then let the mode system take over
  Object.values(window._filters).forEach(f => {
    if (f.uniforms.uIntensity !== undefined) f.uniforms.uIntensity = 1.5;
  });
  setTimeout(() => { currentMode = 0; }, BEAT_INTERVAL * 2 * 1000);
}


// ── lyrics ───────────────────────────────────

let lyricFadeOutScheduled = false;

function updateLyrics(elapsed) {
  // find the last cue whose timestamp we've passed
  let active = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    if (elapsed >= LYRICS[i].t) active = i;
    else break;
  }

  if (active === currentLyricIdx) {
    // same line is still showing, check if it's time to start fading it out.
    // fade starts 0.4s before the next cue so there's a clean gap between lines
    if (active >= 0 && !lyricFadeOutScheduled) {
      const nextT  = (active + 1 < LYRICS.length) ? LYRICS[active + 1].t : INTRO_DURATION + 0.4;
      const fadeAt = nextT - 0.4;
      if (elapsed >= fadeAt) {
        lyricText.classList.remove('visible');
        lyricFadeOutScheduled = true;
      }
    }
    return;
  }

  currentLyricIdx       = active;
  lyricFadeOutScheduled = false;

  if (active < 0 || elapsed >= INTRO_DURATION) {
    lyricText.classList.remove('visible');
    lyricText.textContent = '';
    return;
  }

  lyricText.textContent = LYRICS[active].text;
  lyricText.classList.remove('visible');
  void lyricText.offsetWidth; // force reflow so the CSS transition re-fires
  lyricText.classList.add('visible');
}


// ── main tick ────────────────────────────────

let lastTimeSec = 0;

function mainTick() {
  if (!audioCtx) return;

  const now     = audioCtx.currentTime;
  const elapsed = now - introStartTime;
  lastTimeSec   = now;

  const { wave, chroma, vortex, barrel, scanline } = window._filters;

  // uTime is absolute audioCtx time, it never resets, so the shader
  // internal state (wave phase, swirl rotation, glitch positions) is
  // always different even when the song loops
  wave.uniforms.uTime     = now;
  chroma.uniforms.uTime   = now;
  vortex.uniforms.uTime   = now;
  barrel.uniforms.uTime   = now;
  scanline.uniforms.uTime = now;

  if (now >= loopStartAudioTime && !dropHandled) handleDrop();

  if (state === 'INTRO_PLAYING') {

    // photo fades in over the first 20s
    markoSprite.alpha = Math.min(1, elapsed / 20);

    // effects gently ramp up during the intro so it's not completely static,
    // but stays subtle, vortex stays off until the drop
    const introRamp = Math.min(1, elapsed / INTRO_DURATION) * 0.3;
    wave.uniforms.uIntensity     = introRamp * 0.6;
    chroma.uniforms.uIntensity   = introRamp * 0.3;
    vortex.uniforms.uIntensity   = 0.0;
    barrel.uniforms.uIntensity   = introRamp * 0.15;
    scanline.uniforms.uIntensity = introRamp * 0.4;

    updateLyrics(elapsed);

    if (now >= loopStartAudioTime) state = 'LOOP_PLAYING';

  } else if (state === 'LOOP_PLAYING') {

    markoSprite.alpha = 1;
    lyricText.classList.remove('visible');

    const { beat, phase } = getBeatInfo();

    if (beat !== lastBeat) {
      lastBeat = beat;

      // re-trigger the CSS pulse animation on each beat by removing the class,
      // forcing a reflow, then adding it back
      hbdText.classList.remove('pulse');
      void hbdText.offsetWidth;
      hbdText.classList.add('pulse');

      if (beat > 0 && beat % 16 === 0) {
        currentMode = (currentMode + 1) % EFFECT_MODES.length;
      }
    }

    // pulse envelope: (1-phase)^2.5 gives a sharp hit on the downbeat that
    // decays quickly, adds on top of the mode's base intensity
    const pulseValue    = Math.pow(1 - phase, 2.5);
    const mode          = EFFECT_MODES[currentMode];
    const PULSE_STRENGTH = 0.8;

    wave.uniforms.uIntensity     = mode.wave     + pulseValue * PULSE_STRENGTH;
    chroma.uniforms.uIntensity   = mode.chroma   + pulseValue * PULSE_STRENGTH * 0.6;
    vortex.uniforms.uIntensity   = mode.vortex   + pulseValue * PULSE_STRENGTH * 0.4;
    barrel.uniforms.uIntensity   = mode.barrel   + pulseValue * PULSE_STRENGTH * 0.5;
    scanline.uniforms.uIntensity = mode.scanline + pulseValue * PULSE_STRENGTH * 0.7;
  }

  updateParticles();
}


// ── init ─────────────────────────────────────

playBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  setupPixi();
  startPlayback();
  state       = 'INTRO_PLAYING';
  lastTimeSec = audioCtx.currentTime;
});

preload().catch(err => {
  console.error('Preload failed:', err);
  loadingScreen.querySelector('.loading-text').textContent = 'ERROR: ' + err.message;
});
