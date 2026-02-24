// marko birthday 2026


// ══════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════

// Audio file timing (seconds)
const INTRO_DURATION   = 33.130;
const LOOP_START_TRIM  = 0.028;  // dead silence at the start of loop.mp3
const LOOP_END         = 52.99230;
const BPM              = 145;
const BEAT_INTERVAL    = 60 / BPM; // ~0.41379s per beat


// ══════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════

// Lyric cue points from lyrics.txt (M:SS:CS converted to seconds)
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

/**
 * Base intensities per effect mode. Beat pulse adds on top of these.
 * Modes cycle every 16 beats (~6.5 s) in four themed groups of four.
 * 16 modes × 16 beats = 256 beats = exactly 2 full loop iterations.
 */
const EFFECT_MODES = [
  // --- original 4 ---
  { wave: 0.9, chroma: 0.15, vortex: 0.0, barrel: 0.2, scanline: 0.6, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // wave + scanlines
  { wave: 0.3, chroma: 0.5,  vortex: 0.7, barrel: 0.4, scanline: 0.1, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // hue shift
  { wave: 0.3, chroma: 0.9,  vortex: 0.0, barrel: 0.1, scanline: 1.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // glitch/chroma
  { wave: 0.5, chroma: 0.3,  vortex: 0.5, barrel: 1.0, scanline: 0.2, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // barrel + hue
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
  // --- 3D movement 4 (16 total = 256 beats = exactly 2 loops) ---
  { wave: 0.1, chroma: 0.2,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.5, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.0 }, // luma parallax
  { wave: 0.2, chroma: 0.0,  vortex: 0.3, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.7, depthChroma: 0.0, zoomBlur: 0.0 }, // perspective tilt
  { wave: 0.2, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.2, perspTilt: 0.0, depthChroma: 0.5, zoomBlur: 0.0 }, // depth chroma + parallax
  { wave: 0.0, chroma: 0.0,  vortex: 0.0, barrel: 0.0, scanline: 0.0, horizChroma: 0.0, swirl: 0.0,  sliceJitter: 0.0, rgbDrift: 0.0, blockCorrupt: 0.0, posterize: 0.0, lumaParallax: 0.0, perspTilt: 0.0, depthChroma: 0.0, zoomBlur: 0.9 }, // zoom blur / rush
];

// Colours used for beat-burst particles
const PARTICLE_COLORS = [0x00ffff, 0xff00ff, 0xffcc00, 0xffffff, 0x00ff88];


// ══════════════════════════════════════════════
// DOM REFERENCES
// ══════════════════════════════════════════════

const loadingScreen = document.getElementById('loading-screen');
const startScreen   = document.getElementById('start-screen');
const playBtn       = document.getElementById('play-btn');
const hbdText       = document.getElementById('hbd-text');
const lyricText     = document.getElementById('lyric-text');


// ══════════════════════════════════════════════
// APPLICATION STATE
// ══════════════════════════════════════════════

// State machine: LOADING → READY → INTRO_PLAYING → LOOP_PLAYING
let state = 'LOADING';

// Audio nodes
let audioCtx           = null;
let introBuffer        = null;
let loopBuffer         = null;
let introSource        = null;
let loopSource         = null;
let introStartTime     = 0;   // audioCtx.currentTime at play click
let loopStartAudioTime = 0;   // when the loop is scheduled to begin

// Playback flags
let loopStarted  = false;
let dropHandled  = false;

// Lyric tracking
let currentLyricIdx       = -1;
let lyricFadeOutScheduled = false;

// Visual state
let pixiApp           = null;
let backgroundSprite       = null;
let particleContainer = null;
let particles         = [];
let currentMode       = 0;
let lastBeat          = -1;
let lastTimeSec       = 0;

// Image carousel
let imageElements     = [];   // preloaded HTMLImageElements
let imageTextures     = [];   // PIXI textures, built in setupPixi
let currentImageIndex = 0;
let touchStartX       = 0;


// ══════════════════════════════════════════════
// PRELOAD
// ══════════════════════════════════════════════

/**
 * Fetches and decodes all assets (audio + images) before the start screen
 * is shown. A temporary AudioContext is used just for decoding — the real
 * one is created later inside a user gesture (browser autoplay policy).
 */
async function preload() {
  // Load image manifest; fall back to the original single asset if missing
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

  // Fetch audio and all images in parallel
  const [introAB, loopAB, ...imgs] = await Promise.all([
    fetch('assets/intro.mp3').then(r => r.arrayBuffer()),
    fetch('assets/loop.mp3').then(r => r.arrayBuffer()),
    ...imageLoaders,
  ]);

  imageElements = imgs.filter(Boolean);
  if (!imageElements.length) {
    // Absolute fallback — blank 1×1 so the app doesn't break
    imageElements = [new Image(1, 1)];
  }

  // Decode audio buffers with a temporary context
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


// ══════════════════════════════════════════════
// PIXI SETUP
// ══════════════════════════════════════════════

/**
 * Scales and centers a sprite to fill the viewport (CSS background-size: cover).
 * Defers via a texture 'update' event if the texture isn't loaded yet.
 * @param {PIXI.Sprite} sprite
 */
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

/**
 * Creates the PixiJS application, builds all GLSL filter instances, and
 * attaches the main render loop. Called once inside the play-button handler
 * so the GPU context is created in response to a user gesture.
 */
function setupPixi() {
  pixiApp = new PIXI.Application({
    resizeTo: window,
    backgroundColor: 0x000000,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });

  document.getElementById('canvas-container').appendChild(pixiApp.view);

  // Build textures from preloaded images
  imageTextures = imageElements.map(img => PIXI.Texture.from(img));
  const tex = imageTextures[currentImageIndex] || PIXI.Texture.from('assets/image.jpg');
  backgroundSprite = new PIXI.Sprite(tex);
  backgroundSprite.alpha = 0;
  coverSprite(backgroundSprite);
  pixiApp.stage.addChild(backgroundSprite);

  particleContainer = new PIXI.Container();
  pixiApp.stage.addChild(particleContainer);

  // Instantiate all filters and assign them to the sprite
  const wave         = createWaveFilter();
  const chroma       = createChromaFilter();
  const vortex       = createVortexFilter();
  const barrel       = createBarrelFilter();
  const scanline     = createScanlineFilter();
  const horizChroma  = createHorizChromaFilter();
  const swirl        = createSwirlFilter();
  const sliceJitter  = createSliceJitterFilter();
  const rgbDrift     = createRGBDriftFilter();
  const blockCorrupt = createBlockCorruptFilter();
  const posterize    = createPosterizeFilter();
  const lumaParallax = createLumaParallaxFilter();
  const perspTilt    = createPerspTiltFilter();
  const depthChroma  = createDepthChromaFilter();
  const zoomBlur     = createZoomBlurFilter();

  backgroundSprite.filters = [wave, chroma, vortex, barrel, scanline, horizChroma, swirl, sliceJitter, rgbDrift, blockCorrupt, posterize, lumaParallax, perspTilt, depthChroma, zoomBlur];

  // Stash on window so mainTick can access without a closure
  window._filters = { wave, chroma, vortex, barrel, scanline, horizChroma, swirl, sliceJitter, rgbDrift, blockCorrupt, posterize, lumaParallax, perspTilt, depthChroma, zoomBlur };

  pixiApp.renderer.on('resize', () => coverSprite(backgroundSprite));
  pixiApp.ticker.add(mainTick);
}


// ══════════════════════════════════════════════
// GLSL FILTERS
// ══════════════════════════════════════════════

// PIXI's built-in vertex shader has no precision declaration, so vTextureCoord
// ends up as implicitly highp. Our fragment shaders use mediump, and Firefox's
// GLSL linker rejects that mismatch. Using our own vertex shader with explicit
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

/**
 * Sine-wave UV displacement. X and Y use different frequencies and speeds
 * so it doesn't look like a regular grid ripple.
 */
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

/**
 * Radial RGB channel split. R and B sample at positions offset from centre;
 * G stays put. Produces cheap lens fringing / prismatic aberration.
 */
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

/**
 * Hue rotation using Rodrigues' axis-angle formula on RGB.
 * Rotating around the (1,1,1) axis shifts hue while preserving luminance.
 * uIntensity drives the rotation angle — pops on each beat then decays.
 * No spatial distortion; purely colour-based.
 */
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
      // 1.8 rad (~103°) at full intensity — strong shift without flipping to complementary
      float angle = uIntensity * 1.8;
      color.rgb = hueShift(color.rgb, angle);
      gl_FragColor = color;
    }
  `;
  return new PIXI.Filter(VERT_SRC, frag, { uTime: 0.0, uIntensity: 0.0 });
}

/**
 * Barrel / fisheye distortion. Pushes UV outward based on squared distance
 * from centre; out-of-bounds pixels are filled black.
 */
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

/**
 * CRT scanlines combined with glitch slices. rand() is a basic float hash.
 * floor(uTime * 8) snaps to a new random slice position 8 times per second.
 */
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

/**
 * Pure horizontal RGB split — R shifts left, B shifts right, G stays.
 * uTime drives a sine oscillation so the split actively sweeps rather than
 * sitting at a fixed offset. uIntensity (beat-driven) scales the amplitude.
 */
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

/**
 * Mild swirl/twist. Rotates UV around centre, strongest at the centre and
 * fading to zero at edges. Kept low intensity to avoid disorientation.
 */
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

/**
 * Many independent horizontal slices randomly displaced — classic VHS/datamosh.
 * Each slice independently decides whether to fire on this frame; the threshold
 * is controlled by uIntensity so more slices tear at higher intensities.
 */
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

/**
 * Each RGB channel drifts on its own sinusoidal path — like an ageing CRT
 * where the three guns are slightly mis-registered and wobble independently.
 */
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

/**
 * MPEG-style block corruption. The image is divided into blocks; random blocks
 * are displaced horizontally (and slightly vertically), like a lossy codec choking.
 */
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

/**
 * Bit-crush / posterize. Quantises colour to N levels. At rest (~8 levels)
 * it's visible but not harsh; on a beat pulse it slams down to 2–3 levels
 * for a hard digital-corruption flash, then resolves back.
 */
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

/**
 * Treats image luminance as a depth map — bright pixels are "closer", dark
 * pixels are "further". A slowly-rotating viewpoint offset displaces each
 * pixel proportional to its depth, creating real parallax movement.
 */
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

/**
 * Non-linear perspective warp. X scale depends on Y position and vice versa,
 * simulating a surface rocking on two 3D axes simultaneously. Oscillation
 * frequencies are irrational so it never settles into a visible loop.
 */
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

/**
 * Luminance-driven chromatic separation. Bright areas get strong R/B fringing
 * (they're "closer" to the viewer) while dark areas stay clean. The separation
 * direction rotates with time, making the colour split shimmer and spin.
 */
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

/**
 * Radial zoom blur. Averages 6 samples along the zoom axis toward the centre,
 * simulating the image rushing at the viewer. Beat pulse spikes the blur amount
 * so each downbeat feels like a push through 3D space.
 */
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


// ══════════════════════════════════════════════
// AUDIO PLAYBACK
// ══════════════════════════════════════════════

/**
 * Creates the AudioContext (must run inside a user gesture) and schedules
 * the intro immediately, with the loop buffered to start exactly when the
 * intro ends — no gap, no click. LOOP_START_TRIM skips dead silence at the
 * head of loop.mp3.
 */
function startPlayback() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  introStartTime     = audioCtx.currentTime;
  loopStartAudioTime = audioCtx.currentTime + INTRO_DURATION;

  introSource = audioCtx.createBufferSource();
  introSource.buffer = introBuffer;
  introSource.connect(audioCtx.destination);
  introSource.start(introStartTime);

  loopSource = audioCtx.createBufferSource();
  loopSource.buffer    = loopBuffer;
  loopSource.loop      = true;
  loopSource.loopStart = LOOP_START_TRIM;
  loopSource.loopEnd   = LOOP_END;
  loopSource.connect(audioCtx.destination);
  loopSource.start(loopStartAudioTime, LOOP_START_TRIM);
}


// ══════════════════════════════════════════════
// BEAT SYNC
// ══════════════════════════════════════════════

/**
 * Returns the current beat index and fractional beat phase.
 * phase 0 = downbeat, phase 1 = next beat.
 * @returns {{ beat: number, phase: number }}
 */
function getBeatInfo() {
  if (!loopStarted) return { beat: 0, phase: 0 };
  const elapsed   = audioCtx.currentTime - loopStartAudioTime;
  const beatFloat = elapsed / BEAT_INTERVAL;
  return { beat: Math.floor(beatFloat), phase: beatFloat % 1 };
}


// ══════════════════════════════════════════════
// PARTICLES
// ══════════════════════════════════════════════

/**
 * Spawns 80 particles from the screen centre in a full 360° spread.
 * Each particle is a random shape (dot, triangle, or diamond) in a neon colour.
 */
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

    // Evenly spread around 360° with a bit of jitter so it doesn't look like a clock
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

/**
 * Advances all live particles by one frame — applies gravity, drag, and alpha
 * decay. Iterates backwards so splicing doesn't corrupt the index.
 */
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


// ══════════════════════════════════════════════
// DROP HANDLER
// ══════════════════════════════════════════════

/**
 * Fires once at the musical "drop" (when the loop begins). Spawns the particle
 * burst, shows the HBD text, and briefly slams all filter intensities to maximum
 * before handing control to the mode system.
 */
function handleDrop() {
  if (dropHandled) return;
  dropHandled = true;
  loopStarted = true;

  spawnParticles();
  hbdText.classList.add('visible');

  // Slam all filters to max for ~2 beats, then let the mode system take over
  Object.values(window._filters).forEach(f => {
    if (f.uniforms.uIntensity !== undefined) f.uniforms.uIntensity = 1.5;
  });
  setTimeout(() => { currentMode = 0; }, BEAT_INTERVAL * 2 * 1000);
}


// ══════════════════════════════════════════════
// LYRICS
// ══════════════════════════════════════════════

/**
 * Advances the lyric display to whichever cue is active at `elapsed` seconds.
 * Handles fade-in (by re-triggering the CSS transition) and schedules a
 * fade-out 0.4 s before the next cue for a clean gap between lines.
 * @param {number} elapsed - seconds since playback started
 */
function updateLyrics(elapsed) {
  // Find the last cue whose timestamp we've passed
  let active = -1;
  for (let i = 0; i < LYRICS.length; i++) {
    if (elapsed >= LYRICS[i].t) active = i;
    else break;
  }

  if (active === currentLyricIdx) {
    // Same line is still showing — check if it's time to start fading out.
    // Fade starts 0.4 s before the next cue so there's a clean gap between lines.
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


// ══════════════════════════════════════════════
// MAIN TICK
// ══════════════════════════════════════════════

/**
 * Sets all filter intensities for the intro phase. Effects gently ramp up
 * over the intro duration but stay subtle; post-drop effects (swirl, datamosh,
 * etc.) are silenced entirely until the loop begins.
 * @param {number} introRamp - 0→1 value representing progress through the intro
 */
function applyIntroFilterIntensities(introRamp) {
  const f = window._filters;
  f.wave.uniforms.uIntensity         = introRamp * 0.6;
  f.chroma.uniforms.uIntensity       = introRamp * 0.3;
  f.vortex.uniforms.uIntensity       = 0.0;
  f.barrel.uniforms.uIntensity       = introRamp * 0.15;
  f.scanline.uniforms.uIntensity     = introRamp * 0.4;
  // Keep all post-drop effects silent during the intro
  f.horizChroma.uniforms.uIntensity  = 0.0;
  f.swirl.uniforms.uIntensity        = 0.0;
  f.sliceJitter.uniforms.uIntensity  = 0.0;
  f.rgbDrift.uniforms.uIntensity     = 0.0;
  f.blockCorrupt.uniforms.uIntensity = 0.0;
  f.posterize.uniforms.uIntensity    = 0.0;
  f.lumaParallax.uniforms.uIntensity = 0.0;
  f.perspTilt.uniforms.uIntensity    = 0.0;
  f.depthChroma.uniforms.uIntensity  = 0.0;
  f.zoomBlur.uniforms.uIntensity     = 0.0;
}

/**
 * Sets all filter intensities for the loop (post-drop) phase. Base values
 * come from the current EFFECT_MODE; beat pulse adds on top. Effects whose
 * mode base value is 0 are kept fully off to avoid unnecessary GPU work.
 * @param {object} mode       - current entry from EFFECT_MODES
 * @param {number} pulseValue - beat envelope, 1 on downbeat decaying to 0
 * @param {number} beat       - current beat index (used for swirl beat modifier)
 */
function applyLoopFilterIntensities(mode, pulseValue, beat) {
  const f = window._filters;
  const P = 0.8; // pulse strength — scales the beat-envelope contribution

  f.wave.uniforms.uIntensity        = mode.wave        + pulseValue * P;
  f.chroma.uniforms.uIntensity      = mode.chroma      + pulseValue * P * 0.6;
  f.vortex.uniforms.uIntensity      = mode.vortex      + pulseValue * P * 0.4;
  f.barrel.uniforms.uIntensity      = mode.barrel      + pulseValue * P * 0.5;
  f.scanline.uniforms.uIntensity    = mode.scanline    + pulseValue * P * 0.7;
  f.horizChroma.uniforms.uIntensity = mode.horizChroma + pulseValue * P * 0.7;

  // Irrational beat step → signed per-beat modifier so the swirl kick varies:
  // some beats push further CCW, some barely nudge, some pull slightly CW
  const swirlBeatMod = Math.sin(beat * 1.8475);
  f.swirl.uniforms.uIntensity = mode.swirl > 0
    ? mode.swirl + swirlBeatMod * pulseValue * P * 0.7 : 0.0;

  f.sliceJitter.uniforms.uIntensity  = mode.sliceJitter  > 0 ? mode.sliceJitter  + pulseValue * P * 0.6  : 0.0;
  f.rgbDrift.uniforms.uIntensity     = mode.rgbDrift     > 0 ? mode.rgbDrift     + pulseValue * P * 0.5  : 0.0;
  f.blockCorrupt.uniforms.uIntensity = mode.blockCorrupt > 0 ? mode.blockCorrupt + pulseValue * P * 0.5  : 0.0;
  f.posterize.uniforms.uIntensity    = mode.posterize    > 0 ? mode.posterize    + pulseValue * P * 0.25 : 0.0;
  f.lumaParallax.uniforms.uIntensity = mode.lumaParallax > 0 ? mode.lumaParallax + pulseValue * P * 0.5  : 0.0;
  f.perspTilt.uniforms.uIntensity    = mode.perspTilt    > 0 ? mode.perspTilt    + pulseValue * P * 0.6  : 0.0;
  f.depthChroma.uniforms.uIntensity  = mode.depthChroma  > 0 ? mode.depthChroma  + pulseValue * P * 0.6  : 0.0;
  f.zoomBlur.uniforms.uIntensity     = mode.zoomBlur     > 0 ? mode.zoomBlur     + pulseValue * P * 0.7  : 0.0;
}

/**
 * Per-frame update driven by the PixiJS ticker. Advances uTime on all filters,
 * drives state-specific visuals (intro fade-in / lyrics vs. loop beat-sync /
 * mode cycling), triggers the drop, and updates particles.
 */
function mainTick() {
  if (!audioCtx) return;

  const now     = audioCtx.currentTime;
  const elapsed = now - introStartTime;
  lastTimeSec   = now;

  const f = window._filters;

  // uTime is absolute audioCtx time and never resets, so shader-internal state
  // (wave phase, swirl rotation, glitch positions) is always different even when
  // the song loops.
  f.wave.uniforms.uTime        = now;
  f.chroma.uniforms.uTime      = now;
  f.vortex.uniforms.uTime      = now;
  f.barrel.uniforms.uTime      = now;
  f.scanline.uniforms.uTime    = now;
  f.horizChroma.uniforms.uTime = now;
  f.sliceJitter.uniforms.uTime  = now;
  f.rgbDrift.uniforms.uTime     = now;
  f.blockCorrupt.uniforms.uTime = now;
  f.lumaParallax.uniforms.uTime = now;
  f.perspTilt.uniforms.uTime    = now;
  f.depthChroma.uniforms.uTime  = now;

  if (now >= loopStartAudioTime && !dropHandled) handleDrop();

  if (state === 'INTRO_PLAYING') {

    // Photo fades in over the first 20 s
    backgroundSprite.alpha = Math.min(1, elapsed / 20);

    // Effects gently ramp up during the intro so it's not completely static,
    // but stays subtle — vortex stays off until the drop
    const introRamp = Math.min(1, elapsed / INTRO_DURATION) * 0.3;
    applyIntroFilterIntensities(introRamp);

    updateLyrics(elapsed);

    if (now >= loopStartAudioTime) state = 'LOOP_PLAYING';

  } else if (state === 'LOOP_PLAYING') {

    backgroundSprite.alpha = 1;
    lyricText.classList.remove('visible');

    const { beat, phase } = getBeatInfo();

    if (beat !== lastBeat) {
      lastBeat = beat;

      // Re-trigger the CSS pulse animation on each beat by removing the class,
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
    // decays quickly, adding on top of the mode's base intensity
    const pulseValue = Math.pow(1 - phase, 2.5);
    applyLoopFilterIntensities(EFFECT_MODES[currentMode], pulseValue, beat);
  }

  updateParticles();
}


// ══════════════════════════════════════════════
// INPUT & EVENT HANDLERS
// ══════════════════════════════════════════════

/**
 * Cycles to the next (+1) or previous (-1) image in the carousel.
 * @param {number} delta - +1 for next, -1 for previous
 */
function switchImage(delta) {
  if (!backgroundSprite || imageTextures.length <= 1) return;
  currentImageIndex = (currentImageIndex + delta + imageTextures.length) % imageTextures.length;
  backgroundSprite.texture = imageTextures[currentImageIndex];
  coverSprite(backgroundSprite);
  console.log(`[image] ${currentImageIndex + 1} / ${imageTextures.length}`);
}

// Play button — must be a direct user gesture to satisfy the AudioContext policy
playBtn.addEventListener('click', () => {
  startScreen.style.display = 'none';
  setupPixi();
  startPlayback();
  state       = 'INTRO_PLAYING';
  lastTimeSec = audioCtx.currentTime;
});

// Desktop: arrow keys cycle images
document.addEventListener('keydown', e => {
  if (state !== 'INTRO_PLAYING' && state !== 'LOOP_PLAYING') return;
  if (e.key === 'ArrowRight') switchImage(1);
  if (e.key === 'ArrowLeft')  switchImage(-1);
});

// Desktop double-click / mobile double-tap — advance to next image
document.getElementById('canvas-container').addEventListener('dblclick', () => {
  if (state === 'INTRO_PLAYING' || state === 'LOOP_PLAYING') switchImage(1);
});

// Mobile: swipe left/right on canvas to cycle images
const _cvs = document.getElementById('canvas-container');
_cvs.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
_cvs.addEventListener('touchend',   e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (Math.abs(dx) > 50 && (state === 'INTRO_PLAYING' || state === 'LOOP_PLAYING')) {
    switchImage(dx < 0 ? 1 : -1);  // swipe left → next, swipe right → previous
  }
}, { passive: true });


// ══════════════════════════════════════════════
// BOOTSTRAP
// ══════════════════════════════════════════════

preload().catch(err => {
  console.error('Preload failed:', err);
  loadingScreen.querySelector('.loading-text').textContent = 'ERROR: ' + err.message;
});
