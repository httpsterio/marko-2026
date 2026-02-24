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
let imageElements      = [];   // preloaded HTMLImageElements
let imageTextures      = [];   // PIXI textures, built in setupPixi
let currentImageIndex  = 0;
let touchStartX        = 0;

// base intensities per effect mode, beat pulse adds on top of these.
// modes cycle every 16 beats (4 bars), giving each one about 6.5 seconds.
const EFFECT_MODES = [
  // --- original 4 ---
  { wave: 0.9, chroma: 0.15, vortex: 0.0, barrel: 0.2, scanline: 0.6, horizChroma: 0.0, swirl: 0.0, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // wave + scanlines
  { wave: 0.3, chroma: 0.5,  vortex: 0.7, barrel: 0.4, scanline: 0.1, horizChroma: 0.0, swirl: 0.0, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // hue shift
  { wave: 0.3, chroma: 0.9,  vortex: 0.0, barrel: 0.1, scanline: 1.0, horizChroma: 0.0, swirl: 0.0, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // glitch/chroma
  { wave: 0.5, chroma: 0.3,  vortex: 0.5, barrel: 1.0, scanline: 0.2, horizChroma: 0.0, swirl: 0.0, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // barrel + hue
  // --- chromatic 4 ---
  { wave: 0.2, chroma: 0.0,  vortex: 0.0, barrel: 0.1, scanline: 0.3, horizChroma: 0.9, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // horizontal chroma dominant
  { wave: 0.4, chroma: 0.3,  vortex: 0.0, barrel: 0.0, scanline: 0.2, horizChroma: 0.5, swirl: 0.35, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // swirl + horiz chroma
  { wave: 0.1, chroma: 0.0,  vortex: 0.6, barrel: 0.2, scanline: 0.0, horizChroma: 0.0, swirl: 0.45, sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // swirl + hue rotation
  { wave: 0.6, chroma: 0.2,  vortex: 0.0, barrel: 0.5, scanline: 0.8, horizChroma: 0.7, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // glitch + horiz chroma
  // --- datamosh 4 ---
  { wave: 0.2, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.7, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // VHS slice jitter
  { wave: 0.3, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.3, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.8, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // analog RGB drift
  { wave: 0.1, chroma: 0.0,  vortex: 0.0, barrel: 0.2, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.3, rgbDrift: 0.0, blockCorrupt: 0.8, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // MPEG block corrupt
  { wave: 0.2, chroma: 0.2,  vortex: 0.5, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.3, blockCorrupt: 0.0, posterize: 0.1, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // bit-crush + hue
  // --- 3d movement 4 (16 total = 256 beats = exactly 2 loops) ---
  { wave: 0.1, chroma: 0.2,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.5, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // luma parallax
  { wave: 0.2, chroma: 0.0,  vortex: 0.3, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.7, depthChroma: 0.0, zoomBlur: 0.0 }, // perspective tilt
  { wave: 0.2, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.2, perspTilt: 0.0, depthChroma: 0.5, zoomBlur: 0.0 }, // depth chroma + parallax
  { wave: 0.0, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.9 }, // zoom blur / rush
];


// ── preload ──────────────────────────────────

async function preload() {
  // load image manifest, fall back to original asset if missing
  let imageNames = [];
  try {
    imageNames = await fetch('images/manifest.json').then(r => r.json());
  } catch (_) {}

  const imageLoaders = imageNames.length
    ? imageNames.map(name => new Promise(resolve => {
        const img = new Image();
        img.onload  = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = `images/${name}`;
      }))
    : [new Promise(resolve => {
        const img = new Image();
        img.onload = img.onerror = () => resolve(img.complete ? img : null);
        img.src = 'assets/image.jpg';
      })];

  // fetch audio + all images in parallel
  const [introAB, loopAB, ...imgs] = await Promise.all([
    fetch('assets/intro.mp3').then(r => r.arrayBuffer()),
    fetch('assets/loop.mp3').then(r => r.arrayBuffer()),
    ...imageLoaders,
  ]);

  imageElements = imgs.filter(Boolean);
  if (!imageElements.length) {
    // absolute fallback — create a blank 1×1 so the app doesn't break
    const fb = new Image(1, 1);
    imageElements = [fb];
  }

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

  imageTextures = imageElements.map(img => PIXI.Texture.from(img));
  const tex = imageTextures[currentImageIndex] || PIXI.Texture.from('assets/image.jpg');
  markoSprite = new PIXI.Sprite(tex);
  markoSprite.alpha = 0;
  coverSprite(markoSprite);
  pixiApp.stage.addChild(markoSprite);

  particleContainer = new PIXI.Container();
  pixiApp.stage.addChild(particleContainer);

  const wave        = createWaveFilter();
  const chroma      = createChromaFilter();
  const vortex      = createVortexFilter();
  const barrel      = createBarrelFilter();
  const scanline    = createScanlineFilter();
  const horizChroma = createHorizChromaFilter();
  const swirl       = createSwirlFilter();
  const sliceJitter  = createSliceJitterFilter();
  const rgbDrift     = createRGBDriftFilter();
  const blockCorrupt = createBlockCorruptFilter();
  const posterize    = createPosterizeFilter();
  const lumaParallax = createLumaParallaxFilter();
  const perspTilt    = createPerspTiltFilter();
  const depthChroma  = createDepthChromaFilter();
  const zoomBlur     = createZoomBlurFilter();

  markoSprite.filters = [wave, chroma, vortex, barrel, scanline, horizChroma, swirl, sliceJitter, rgbDrift, blockCorrupt, posterize, lumaParallax, perspTilt, depthChroma, zoomBlur];

  // stash on window so mainTick can grab without a closure
  window._filters = { wave, chroma, vortex, barrel, scanline, horizChroma, swirl, sliceJitter, rgbDrift, blockCorrupt, posterize, lumaParallax, perspTilt, depthChroma, zoomBlur };

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

      float line = sin(uv.y * 80.0) * 0.5 + 0.5;
      float darkBand = mix(1.0, 0.87, (1.0 - line) * uIntensity * 0.8);
      color.rgb *= darkBand;

      gl_FragColor = color;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

// pure horizontal RGB split — R shifts left, B shifts right, G stays.
// uTime drives a sine oscillation so the split actively sweeps rather than
// sitting at a fixed offset. uIntensity (beat-driven) scales the amplitude,
// making the sweep largest on each beat and fading between them.
function createHorizChromaFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    void main(void) {
      vec2 uv = vTextureCoord;
      float osc = 0.5 + 0.5 * sin(uTime * 5.5);
      float amt = uIntensity * 0.028 * osc;
      float r = texture2D(uSampler, vec2(uv.x - amt, uv.y)).r;
      float g = texture2D(uSampler, uv).g;
      float b = texture2D(uSampler, vec2(uv.x + amt, uv.y)).b;
      float a = texture2D(uSampler, uv).a;
      gl_FragColor = vec4(r, g, b, a);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// mild swirl/twist — rotates UV around center, strongest at center and
// fading to zero at edges. kept low intensity to avoid disorientation.
function createSwirlFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;

    void main(void) {
      vec2 uv = vTextureCoord - vec2(0.5);
      float dist = length(uv);
      float angle = uIntensity * 1.8 * (1.0 - smoothstep(0.0, 0.7, dist));
      float sinA = sin(angle), cosA = cos(angle);
      vec2 rotated = vec2(uv.x * cosA - uv.y * sinA, uv.x * sinA + uv.y * cosA) + vec2(0.5);
      gl_FragColor = texture2D(uSampler, clamp(rotated, 0.0, 1.0));
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0 });
}

// many independent horizontal slices randomly displaced — classic VHS / data-mosh
// shutter: each slice independently decides whether to fire on this frame,
// threshold controlled by uIntensity so more slices tear at higher intensities
function createSliceJitterFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    float rand(float x) { return fract(sin(x * 127.1) * 43758.5453); }

    void main(void) {
      vec2 uv = vTextureCoord;
      float numSlices = 24.0;
      float sliceIdx  = floor(uv.y * numSlices);
      float t         = floor(uTime * 10.0);
      float trigger   = rand(sliceIdx * 0.71 + t * 3.17);
      if (trigger > 1.0 - uIntensity * 0.55) {
        float offset = (rand(sliceIdx + t + 1.0) - 0.5) * uIntensity * 0.22;
        uv.x = fract(uv.x + offset);
      }
      gl_FragColor = texture2D(uSampler, uv);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// each RGB channel drifts on its own sinusoidal path — like an aging CRT
// where the three guns are slightly mis-registered and wobble independently
function createRGBDriftFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    void main(void) {
      vec2 uv  = vTextureCoord;
      float a  = uIntensity * 0.04;
      vec2 rOff = vec2( a * sin(uTime * 1.3),        a * 0.25 * cos(uTime * 0.9));
      vec2 gOff = vec2( a * sin(uTime * 2.1 + 1.0), -a * 0.15 * sin(uTime * 1.1));
      vec2 bOff = vec2( a * sin(uTime * 1.7 + 2.1),  a * 0.30 * sin(uTime * 0.7));
      float r = texture2D(uSampler, clamp(uv + rOff, 0.0, 1.0)).r;
      float g = texture2D(uSampler, clamp(uv + gOff, 0.0, 1.0)).g;
      float b = texture2D(uSampler, clamp(uv + bOff, 0.0, 1.0)).b;
      float alpha = texture2D(uSampler, uv).a;
      gl_FragColor = vec4(r, g, b, alpha);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// MPEG-style block corruption — image divided into blocks, random blocks
// displaced horizontally (and a touch vertically), like a lossy codec choking
function createBlockCorruptFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    float rand(float x) { return fract(sin(x * 127.1) * 43758.5453); }

    void main(void) {
      vec2  uv      = vTextureCoord;
      float bSize   = 0.07;
      vec2  blockId = floor(uv / bSize);
      float t       = floor(uTime * 6.0);
      float seed    = blockId.x + blockId.y * 19.0 + t * 37.0;
      float trigger = rand(seed);
      if (trigger > 1.0 - uIntensity * 0.4) {
        float ox = (rand(seed + 1.0) - 0.5) * uIntensity * 0.20;
        float oy = (rand(seed + 2.0) - 0.5) * uIntensity * 0.04;
        uv = clamp(uv + vec2(ox, oy), 0.0, 1.0);
      }
      gl_FragColor = texture2D(uSampler, uv);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// bit-crush / posterize — quantises colour to N levels. at rest ~8 levels
// (visible but not harsh); on a beat pulse it slams down to 2–3 levels
// for a hard digital-corruption flash before resolving back
function createPosterizeFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;

    void main(void) {
      vec4 original = texture2D(uSampler, vTextureCoord);
      float t = clamp(uIntensity, 0.0, 1.0);
      float levels = mix(32.0, 2.0, t);
      vec3 quantized = floor(original.rgb * levels + 0.5) / levels;
      // blend so t=0 is a pure pass-through — no effect unless the mode enables it
      gl_FragColor = vec4(mix(original.rgb, quantized, t), original.a);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0 });
}

// treats image luminance as a depth map — bright pixels are "closer",
// dark pixels are "further". a slowly-rotating viewpoint offset displaces
// each pixel proportional to its depth, creating real parallax movement.
function createLumaParallaxFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    void main(void) {
      vec2 uv   = vTextureCoord;
      float luma = dot(texture2D(uSampler, uv).rgb, vec3(0.299, 0.587, 0.114));
      // slowly rotating pan direction — different x/y speeds avoid axis-locked drift
      vec2 pan  = vec2(cos(uTime * 0.35), sin(uTime * 0.27)) * uIntensity * 0.025;
      // bright pixels shift more than dark ones (parallax)
      gl_FragColor = texture2D(uSampler, clamp(uv + (luma - 0.5) * pan, 0.0, 1.0));
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// non-linear perspective warp — X scale depends on Y position and vice versa,
// simulating a surface rocking on two 3D axes simultaneously. the oscillation
// frequencies are irrational so it never settles into a visible loop.
function createPerspTiltFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    void main(void) {
      vec2 uv = vTextureCoord - vec2(0.5);
      float tx = sin(uTime * 0.37) * uIntensity * 0.40;
      float ty = cos(uTime * 0.29) * uIntensity * 0.25;
      // keystone / foreshortening: scale each axis by the opposite coordinate
      uv.x *= 1.0 + tx * uv.y;
      uv.y *= 1.0 + ty * uv.x;
      gl_FragColor = texture2D(uSampler, clamp(uv + vec2(0.5), 0.0, 1.0));
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// luminance-driven chromatic separation — bright areas get strong R/B fringing
// (they're "closer" to the viewer) while dark areas stay clean. the separation
// direction rotates with time, making the colour split shimmer and spin.
function createDepthChromaFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;
    uniform float uTime;

    void main(void) {
      vec2 uv    = vTextureCoord;
      vec4 base  = texture2D(uSampler, uv);
      float luma = dot(base.rgb, vec3(0.299, 0.587, 0.114));
      // separation magnitude scales with brightness — foreground gets more fringing
      vec2 sep   = vec2(cos(uTime * 0.52), sin(uTime * 0.41)) * uIntensity * luma * 0.018;
      float r    = texture2D(uSampler, clamp(uv + sep, 0.0, 1.0)).r;
      float b    = texture2D(uSampler, clamp(uv - sep, 0.0, 1.0)).b;
      gl_FragColor = vec4(r, base.g, b, base.a);
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0, uTime: 0.0 });
}

// radial zoom blur — averages 6 samples along the zoom axis toward the centre,
// simulating the image rushing at the viewer. beat pulse spikes the blur amount
// so each downbeat feels like a push through 3D space.
function createZoomBlurFilter() {
  const frag = `
    precision mediump float;
    uniform sampler2D uSampler;
    varying vec2 vTextureCoord;
    uniform float uIntensity;

    void main(void) {
      vec2 uv  = vTextureCoord - vec2(0.5);
      float amt = uIntensity * 0.05;
      vec4 col = vec4(0.0);
      for (int i = 0; i < 6; i++) {
        float t = float(i) / 5.0;
        col += texture2D(uSampler, uv * (1.0 - amt * t) + vec2(0.5));
      }
      gl_FragColor = col / 6.0;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uIntensity: 0.0 });
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

  const { wave, chroma, vortex, barrel, scanline, horizChroma, swirl, sliceJitter, rgbDrift, blockCorrupt, posterize, lumaParallax, perspTilt, depthChroma, zoomBlur } = window._filters;

  // uTime is absolute audioCtx time, it never resets, so the shader
  // internal state (wave phase, swirl rotation, glitch positions) is
  // always different even when the song loops
  wave.uniforms.uTime         = now;
  chroma.uniforms.uTime       = now;
  vortex.uniforms.uTime       = now;
  barrel.uniforms.uTime       = now;
  scanline.uniforms.uTime     = now;
  horizChroma.uniforms.uTime  = now;
  sliceJitter.uniforms.uTime   = now;
  rgbDrift.uniforms.uTime      = now;
  blockCorrupt.uniforms.uTime  = now;
  lumaParallax.uniforms.uTime  = now;
  perspTilt.uniforms.uTime     = now;
  depthChroma.uniforms.uTime   = now;

  if (now >= loopStartAudioTime && !dropHandled) handleDrop();

  if (state === 'INTRO_PLAYING') {

    // photo fades in over the first 20s
    markoSprite.alpha = Math.min(1, elapsed / 20);

    // effects gently ramp up during the intro so it's not completely static,
    // but stays subtle, vortex stays off until the drop
    const introRamp = Math.min(1, elapsed / INTRO_DURATION) * 0.3;
    wave.uniforms.uIntensity         = introRamp * 0.6;
    chroma.uniforms.uIntensity       = introRamp * 0.3;
    vortex.uniforms.uIntensity       = 0.0;
    barrel.uniforms.uIntensity       = introRamp * 0.15;
    scanline.uniforms.uIntensity     = introRamp * 0.4;
    // keep all post-drop effects silent during the intro
    horizChroma.uniforms.uIntensity  = 0.0;
    swirl.uniforms.uIntensity        = 0.0;
    sliceJitter.uniforms.uIntensity  = 0.0;
    rgbDrift.uniforms.uIntensity     = 0.0;
    blockCorrupt.uniforms.uIntensity = 0.0;
    posterize.uniforms.uIntensity    = 0.0;
    lumaParallax.uniforms.uIntensity = 0.0;
    perspTilt.uniforms.uIntensity    = 0.0;
    depthChroma.uniforms.uIntensity  = 0.0;
    zoomBlur.uniforms.uIntensity     = 0.0;

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
        const m = EFFECT_MODES[currentMode];
        const active = Object.entries(m).filter(([,v]) => v > 0).map(([k,v]) => `${k}:${v}`).join(' ');
        console.log(`[mode ${currentMode}] beat ${beat} —`, active || '(all zero)');
      }
    }

    // pulse envelope: (1-phase)^2.5 gives a sharp hit on the downbeat that
    // decays quickly, adds on top of the mode's base intensity
    const pulseValue    = Math.pow(1 - phase, 2.5);
    const mode          = EFFECT_MODES[currentMode];
    const PULSE_STRENGTH = 0.8;

    wave.uniforms.uIntensity            = mode.wave        + pulseValue * PULSE_STRENGTH;
    chroma.uniforms.uIntensity          = mode.chroma      + pulseValue * PULSE_STRENGTH * 0.6;
    vortex.uniforms.uIntensity          = mode.vortex      + pulseValue * PULSE_STRENGTH * 0.4;
    barrel.uniforms.uIntensity          = mode.barrel      + pulseValue * PULSE_STRENGTH * 0.5;
    scanline.uniforms.uIntensity        = mode.scanline    + pulseValue * PULSE_STRENGTH * 0.7;
    horizChroma.uniforms.uIntensity     = mode.horizChroma + pulseValue * PULSE_STRENGTH * 0.7;
    // irrational beat step → signed per-beat modifier so the beat kick varies:
    // some beats push further CCW, some barely nudge, some pull slightly CW
    const swirlBeatMod = Math.sin(beat * 1.8475);
    swirl.uniforms.uIntensity            = mode.swirl        > 0 ? mode.swirl        + swirlBeatMod * pulseValue * PULSE_STRENGTH * 0.7 : 0.0;
    sliceJitter.uniforms.uIntensity      = mode.sliceJitter  > 0 ? mode.sliceJitter  + pulseValue * PULSE_STRENGTH * 0.6 : 0.0;
    rgbDrift.uniforms.uIntensity         = mode.rgbDrift     > 0 ? mode.rgbDrift     + pulseValue * PULSE_STRENGTH * 0.5 : 0.0;
    blockCorrupt.uniforms.uIntensity     = mode.blockCorrupt > 0 ? mode.blockCorrupt + pulseValue * PULSE_STRENGTH * 0.5 : 0.0;
    posterize.uniforms.uIntensity        = mode.posterize    > 0 ? mode.posterize    + pulseValue * PULSE_STRENGTH * 0.25 : 0.0;
    lumaParallax.uniforms.uIntensity     = mode.lumaParallax > 0 ? mode.lumaParallax + pulseValue * PULSE_STRENGTH * 0.5  : 0.0;
    perspTilt.uniforms.uIntensity        = mode.perspTilt    > 0 ? mode.perspTilt    + pulseValue * PULSE_STRENGTH * 0.6  : 0.0;
    depthChroma.uniforms.uIntensity      = mode.depthChroma  > 0 ? mode.depthChroma  + pulseValue * PULSE_STRENGTH * 0.6  : 0.0;
    zoomBlur.uniforms.uIntensity         = mode.zoomBlur     > 0 ? mode.zoomBlur     + pulseValue * PULSE_STRENGTH * 0.7  : 0.0;
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

// ── image switching ───────────────────────────

function switchImage(delta) {
  if (!markoSprite || imageTextures.length <= 1) return;
  currentImageIndex = (currentImageIndex + delta + imageTextures.length) % imageTextures.length;
  markoSprite.texture = imageTextures[currentImageIndex];
  coverSprite(markoSprite);
  console.log(`[image] ${currentImageIndex + 1} / ${imageTextures.length}`);
}

// desktop: arrow keys
document.addEventListener('keydown', e => {
  if (state !== 'INTRO_PLAYING' && state !== 'LOOP_PLAYING') return;
  if (e.key === 'ArrowRight') switchImage(1);
  if (e.key === 'ArrowLeft')  switchImage(-1);
});

// desktop: double-click canvas  /  mobile: double-tap
document.getElementById('canvas-container').addEventListener('dblclick', () => {
  if (state === 'INTRO_PLAYING' || state === 'LOOP_PLAYING') switchImage(1);
});

// mobile: swipe left/right on canvas
const _cvs = document.getElementById('canvas-container');
_cvs.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
_cvs.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50 && (state === 'INTRO_PLAYING' || state === 'LOOP_PLAYING')) {
    switchImage(dx < 0 ? 1 : -1);  // swipe left → next, swipe right → previous
  }
}, { passive: true });


preload().catch(err => {
  console.error('Preload failed:', err);
  loadingScreen.querySelector('.loading-text').textContent = 'ERROR: ' + err.message;
});
