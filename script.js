// ─────────────────────────────────────────────
//  MARKO BIRTHDAY 2026
// ─────────────────────────────────────────────

// ── Timing constants ──
const INTRO_DURATION   = 33.130;
const LOOP_START_TRIM  = 0.028;
const LOOP_END         = 52.99230;
const BPM              = 145;
const BEAT_INTERVAL    = 60 / BPM; // ≈ 0.41379s

// ── Lyric cues (seconds) ──
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

// ── DOM refs ──
const loadingScreen = document.getElementById('loading-screen');
const startScreen   = document.getElementById('start-screen');
const playBtn       = document.getElementById('play-btn');
const hbdText       = document.getElementById('hbd-text');
const lyricText     = document.getElementById('lyric-text');

// ── App state ──
let state = 'LOADING'; // LOADING | READY | INTRO_PLAYING | LOOP_PLAYING
let audioCtx         = null;
let introBuffer      = null;
let loopBuffer       = null;
let introSource      = null;
let loopSource       = null;
let introStartTime   = 0;  // audioCtx.currentTime when play was clicked
let loopStartAudioTime = 0;
let loopStarted      = false;
let currentLyricIdx  = -1;
let pixiApp          = null;
let markoSprite      = null;
let particleContainer = null;
let particles        = [];
let currentMode      = 0;
let lastBeat         = -1;
let dropHandled      = false;

// ── Effect modes config ──
// Each mode: [wave, chroma, vortex, barrel, scanline] base intensities
const EFFECT_MODES = [
  { wave: 0.9, chroma: 0.15, vortex: 0.0, barrel: 0.2, scanline: 0.6 },  // Mode 0: Wave + scanlines
  { wave: 0.3, chroma: 0.5,  vortex: 0.9, barrel: 0.4, scanline: 0.1 },  // Mode 1: Vortex swirl
  { wave: 0.3, chroma: 0.9,  vortex: 0.0, barrel: 0.1, scanline: 1.0 },  // Mode 2: Glitch/chroma
  { wave: 0.5, chroma: 0.3,  vortex: 0.7, barrel: 1.0, scanline: 0.2 },  // Mode 3: Barrel + vortex
];

// ─────────────────────────────────────────────
// STEP 1 — PRELOAD ASSETS
// ─────────────────────────────────────────────
async function preload() {
  const imgEl = new Image();

  const [introAB, loopAB] = await Promise.all([
    fetch('intro.mp3').then(r => r.arrayBuffer()),
    fetch('loop.mp3').then(r => r.arrayBuffer()),
    new Promise(resolve => {
      imgEl.onload = resolve;
      imgEl.onerror = resolve; // Don't block if image fails
      imgEl.src = 'image.jpg';
    }),
  ]);

  // Decode audio (needs AudioContext; use offline or temp one)
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

// ─────────────────────────────────────────────
// STEP 2 — PIXI SCENE SETUP
// ─────────────────────────────────────────────
function setupPixi() {
  pixiApp = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x000000,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  document.getElementById('canvas-container').appendChild(pixiApp.view);

  // Marko photo sprite
  const tex = PIXI.Texture.from('image.jpg');
  markoSprite = new PIXI.Sprite(tex);
  markoSprite.alpha = 0;
  coverSprite(markoSprite);
  pixiApp.stage.addChild(markoSprite);

  // Particle container
  particleContainer = new PIXI.Container();
  pixiApp.stage.addChild(particleContainer);

  // Attach filters
  const wave     = createWaveFilter();
  const chroma   = createChromaFilter();
  const vortex   = createVortexFilter();
  const barrel   = createBarrelFilter();
  const scanline = createScanlineFilter();

  markoSprite.filters = [wave, chroma, vortex, barrel, scanline];

  window._filters = { wave, chroma, vortex, barrel, scanline };

  // Handle resize
  pixiApp.renderer.on('resize', () => coverSprite(markoSprite));

  // Main ticker
  pixiApp.ticker.add(mainTick);
}

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

// ─────────────────────────────────────────────
// STEP 3 — GLSL FILTERS
// ─────────────────────────────────────────────

// Custom vertex shader with explicit mediump precision so the vTextureCoord
// varying precision matches the fragment shaders. PIXI's built-in vertex
// shader leaves it implicitly highp, which Firefox's strict GLSL linker
// can reject when the fragment declares mediump.
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

// Vortex swirl — replaces kaleidoscope.
// Rotates UV coordinates around the centre; strongest at centre, fading to edge.
// Also slowly spins over time when intensity > 0 for an organic feel.
function createVortexFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uTime;
    uniform float uIntensity;

    void main(void) {
      vec2 uv = vTextureCoord - vec2(0.5, 0.5);
      float dist = length(uv);
      float angle = atan(uv.y, uv.x);
      // Swirl strongest at centre, uses smoothstep falloff toward edge
      float falloff = 1.0 - smoothstep(0.0, 0.65, dist);
      float swirl = uIntensity * 5.5 * falloff;
      angle += swirl + uTime * 0.18 * uIntensity;
      vec2 swirlUV = vec2(cos(angle), sin(angle)) * dist + vec2(0.5, 0.5);
      gl_FragColor = texture2D(uSampler, swirlUV);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

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

      // Horizontal glitch slices
      float glitchAmt = uIntensity * 0.04;
      float sliceTime = floor(uTime * 8.0);
      float sliceY = rand(sliceTime);
      float sliceH = 0.03 + rand(sliceTime + 1.0) * 0.06;
      if (abs(uv.y - sliceY) < sliceH) {
        uv.x += (rand(sliceTime + 2.0) - 0.5) * glitchAmt * 3.0;
        uv.x = clamp(uv.x, 0.0, 1.0);
      }

      vec4 color = texture2D(uSampler, uv);

      // Scanlines
      float line = sin(uv.y * 180.0) * 0.5 + 0.5;
      float darkBand = mix(1.0, 0.72, (1.0 - line) * uIntensity * 0.8);
      color.rgb *= darkBand;

      gl_FragColor = color;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// ─────────────────────────────────────────────
// STEP 4 — AUDIO PLAYBACK
// ─────────────────────────────────────────────
function startPlayback() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  introStartTime    = audioCtx.currentTime;
  loopStartAudioTime = audioCtx.currentTime + INTRO_DURATION;

  // Intro
  introSource = audioCtx.createBufferSource();
  introSource.buffer = introBuffer;
  introSource.connect(audioCtx.destination);
  introSource.start(introStartTime);

  // Loop (scheduled, seamless)
  loopSource = audioCtx.createBufferSource();
  loopSource.buffer = loopBuffer;
  loopSource.loop = true;
  loopSource.loopStart = LOOP_START_TRIM;
  loopSource.loopEnd   = LOOP_END;
  loopSource.connect(audioCtx.destination);
  loopSource.start(loopStartAudioTime, LOOP_START_TRIM);
}

// ─────────────────────────────────────────────
// STEP 5 — BEAT SYNC
// ─────────────────────────────────────────────
function getBeatInfo() {
  if (!loopStarted) return { beat: 0, phase: 0 };
  const elapsed   = audioCtx.currentTime - loopStartAudioTime;
  const beatFloat = elapsed / BEAT_INTERVAL;
  return { beat: Math.floor(beatFloat), phase: beatFloat % 1 };
}

// ─────────────────────────────────────────────
// STEP 6 — PARTICLES
// ─────────────────────────────────────────────
const PARTICLE_COLORS = [0x00ffff, 0xff00ff, 0xffcc00, 0xffffff, 0x00ff88];

function spawnParticles() {
  const cx = pixiApp.screen.width / 2;
  const cy = pixiApp.screen.height / 2;

  for (let i = 0; i < 80; i++) {
    const g = new PIXI.Graphics();
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

    const angle = (i / 80) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const speed = 3 + Math.random() * 9;

    g.x = cx;
    g.y = cy;
    g._vx = Math.cos(angle) * speed;
    g._vy = Math.sin(angle) * speed;
    g._life = 1.0;
    g._decay = 0.008 + Math.random() * 0.012;

    particleContainer.addChild(g);
    particles.push(g);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p._vy += 0.12; // gravity
    p._vx *= 0.985; // drag
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

// ─────────────────────────────────────────────
// STEP 7 — DROP HANDLER
// ─────────────────────────────────────────────
function handleDrop() {
  if (dropHandled) return;
  dropHandled = true;
  loopStarted = true;

  spawnParticles();
  hbdText.classList.add('visible');

  // Snap to max intensity for 2 beats, then settle
  Object.values(window._filters).forEach(f => {
    if (f.uniforms.uIntensity !== undefined) f.uniforms.uIntensity = 1.5;
  });
  setTimeout(() => { currentMode = 0; }, BEAT_INTERVAL * 2 * 1000);
}

// ─────────────────────────────────────────────
// STEP 8 — LYRIC SYSTEM
// ─────────────────────────────────────────────
let lyricVisible = false;
let lyricFadeOutScheduled = false;

function updateLyrics(elapsed) {
  // elapsed = time since intro started
  let active = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    if (elapsed >= LYRICS[i].t) active = i;
    else break;
  }

  if (active === currentLyricIdx) {
    // Check if we need to schedule fade-out
    if (active >= 0 && !lyricFadeOutScheduled) {
      const nextT = (active + 1 < LYRICS.length) ? LYRICS[active + 1].t : INTRO_DURATION + 0.4;
      const fadeAt = nextT - 0.4;
      if (elapsed >= fadeAt) {
        lyricText.classList.remove('visible');
        lyricVisible = false;
        lyricFadeOutScheduled = true;
      }
    }
    return;
  }

  currentLyricIdx = active;
  lyricFadeOutScheduled = false;

  if (active < 0 || elapsed >= INTRO_DURATION) {
    lyricText.classList.remove('visible');
    lyricText.textContent = '';
    lyricVisible = false;
    return;
  }

  lyricText.textContent = LYRICS[active].text;
  lyricText.classList.remove('visible');
  // Force reflow so transition fires
  void lyricText.offsetWidth;
  lyricText.classList.add('visible');
  lyricVisible = true;
}

// ─────────────────────────────────────────────
// STEP 9 — MAIN TICK
// ─────────────────────────────────────────────
let lastTimeSec = 0;

function mainTick() {
  if (!audioCtx) return;

  const now     = audioCtx.currentTime;
  const elapsed = now - introStartTime;
  const dt      = now - lastTimeSec;
  lastTimeSec   = now;

  const { wave, chroma, vortex, barrel, scanline } = window._filters;

  // ── Update time uniforms ──
  const t = now;
  wave.uniforms.uTime     = t;
  chroma.uniforms.uTime   = t;
  vortex.uniforms.uTime   = t;
  barrel.uniforms.uTime   = t;
  scanline.uniforms.uTime = t;

  // ── Drop check ──
  if (now >= loopStartAudioTime && !dropHandled) {
    handleDrop();
  }

  if (state === 'INTRO_PLAYING') {
    // ── Sprite fade in ──
    const fadeProgress = Math.min(1, elapsed / 20);
    markoSprite.alpha = fadeProgress;

    // ── Intro intensity ramp ──
    const introRamp = Math.min(1, elapsed / INTRO_DURATION) * 0.3;
    wave.uniforms.uIntensity     = introRamp * 0.6;
    chroma.uniforms.uIntensity   = introRamp * 0.3;
    vortex.uniforms.uIntensity   = 0.0;
    barrel.uniforms.uIntensity   = introRamp * 0.15;
    scanline.uniforms.uIntensity = introRamp * 0.4;

    // ── Lyrics ──
    updateLyrics(elapsed);

    // ── Transition state ──
    if (now >= loopStartAudioTime) {
      state = 'LOOP_PLAYING';
    }

  } else if (state === 'LOOP_PLAYING') {
    markoSprite.alpha = 1;
    lyricText.classList.remove('visible');

    const { beat, phase } = getBeatInfo();

    // ── Beat events ──
    if (beat !== lastBeat) {
      lastBeat = beat;

      // Pulse HBD text
      hbdText.classList.remove('pulse');
      void hbdText.offsetWidth;
      hbdText.classList.add('pulse');

      // Cycle mode every 16 beats (4 bars)
      if (beat > 0 && beat % 16 === 0) {
        currentMode = (currentMode + 1) % EFFECT_MODES.length;
      }
    }

    // ── Pulse envelope: sharp attack, exponential decay ──
    const pulseValue = Math.pow(1 - phase, 2.5);

    const mode = EFFECT_MODES[currentMode];
    const PULSE_STRENGTH = 0.8;

    wave.uniforms.uIntensity     = mode.wave     + pulseValue * PULSE_STRENGTH;
    chroma.uniforms.uIntensity   = mode.chroma   + pulseValue * PULSE_STRENGTH * 0.6;
    vortex.uniforms.uIntensity   = mode.vortex   + pulseValue * PULSE_STRENGTH * 0.4;
    barrel.uniforms.uIntensity   = mode.barrel   + pulseValue * PULSE_STRENGTH * 0.5;
    scanline.uniforms.uIntensity = mode.scanline + pulseValue * PULSE_STRENGTH * 0.7;
  }

  // ── Particles ──
  updateParticles();
}

// ─────────────────────────────────────────────
// STEP 10 — PLAY BUTTON
// ─────────────────────────────────────────────
playBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  setupPixi();
  startPlayback();
  state = 'INTRO_PLAYING';
  lastTimeSec = audioCtx.currentTime;
});

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────
preload().catch(err => {
  console.error('Preload failed:', err);
  loadingScreen.querySelector('.loading-text').textContent = 'ERROR: ' + err.message;
});
