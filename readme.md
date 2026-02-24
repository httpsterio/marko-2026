# marko-2026

An audio visual birthday page. It loads a custom intro track that plays over a photo with animated shader effects, then seamlessly transitions into a looping beat. Lyrics appear on screen during the intro. At the drop the page kicks into full effect mode with a particle burst, a happy birthday message, and beat-synced visuals that cycle through 16 different shader effect combinations. Images can be swiped or cycled with arrow keys / double tapping.

Built with PixiJS for the WebGL rendering and the Web Audio API for gapless audio scheduling. No build tools, just open `index.html` in a browser.


## Files and folders

```
index.html              main page, all the UI elements are here
style.css               all styles and CSS animations
js/script.js            all the logic: audio, beat sync, shader effects, lyrics, particles
js/pixi.min.js          PixiJS v6 (vendored, do not edit)
assets/intro.mp3        intro track, plays once at the start (~33 seconds)
assets/loop.mp3         the loop, plays seamlessly after the intro and loops forever
assets/lyrics.txt       lyric cue points used as reference when editing LYRICS in script.js
images/1-7.jpg          photos that cycle during playback
images/manifest.json    list of image filenames, loaded at startup to populate the carousel
```

### Key parts of script.js

The file is split into 15 sections. The main ones to know about:

- **CONSTANTS** at the top: audio timings and BPM, change these if the audio files change
- **LYRICS**: array of cue points with timestamps and text, easy to edit
- **EFFECT_MODES**: array of 16 preset intensity combinations for the shaders, one row per mode
- **GLSL FILTERS**: one function per shader effect, each returns a `PIXI.Filter`
- **MAIN TICK**: runs every frame, drives the state machine and calls the two filter helpers
- `applyIntroFilterIntensities` and `applyLoopFilterIntensities` are where the per-frame shader values get set

### State machine

```
LOADING -> READY -> INTRO_PLAYING -> LOOP_PLAYING
```

`LOADING` while assets fetch, `READY` on the start screen, `INTRO_PLAYING` once the play button is clicked, `LOOP_PLAYING` after the intro finishes and the drop fires.

# Changelog

## 2026-02-24 03:30 - Code refactor and documentation
**Status: In development**

Cleaned up `js/script.js`, no logic changes. Just easier to read and work with now.
- Section headers are consistent throughout the file
- All state variables are in one place instead of scattered around
- Pulled the filter intensity code out of `mainTick` into two smaller helper functions, mainTick was getting too long
- Moved some things into a more logical order
- Added comments and JSDoc to all functions

---

## 2026-02-24 02:53 - More images, subtitle fixes, new effects
**Status: In development**

- Went from 2 images to 7, moved them into the `images/` folder with a manifest
- Fixed some issues with the lyric/subtitle display
- Added console logging so you can see which effect mode is active
- New effect modes and some style tweaks

---

## 2026-02-24 02:19 - Image carousel
**Status: In development**

- Added a second photo, also replaced the original with a higher res version
- You can now cycle through images with arrow keys, double click/tap, or swipe left/right
- More effect tuning

---

## 2026-02-24 02:08 - Fix swirl beat
**Status: In development**

- Swirl filter was not responding right to the beat, fixed that

---

## 2026-02-24 01:58 - Fix posterize bug
**Status: In development**

- Posterize was not passing through cleanly at zero intensity, fixed

---

## 2026-02-24 01:53 - New effect groups: datamosh and 3D movement
**Status: In development**

- Added 8 new effect modes split into two groups: datamosh (slice jitter, RGB drift, block corruption, bit-crush) and 3D movement (luma parallax, perspective tilt, depth chroma, zoom blur)
- Now 16 modes total which lines up exactly to 2 full loops
- Added 7 new GLSL filters to support this

---

## 2026-02-24 01:43 - Effect system rebuild
**Status: In development**

- Rebuilt how effect modes work, now uses a structured array with base intensities per effect
- Added a beat pulse envelope so there is a sharp hit on the downbeat that fades out
- New GLSL filters: horizontal chroma, swirl, and some early datamosh stuff
- Modes cycle every 16 beats

---

## 2026-02-24 01:22 - Moved files around
**Status: In development**

- Moved assets into `assets/` and scripts into `js/`
- Updated paths in `index.html` and `js/script.js`

---

## 2026-02-24 01:08 - Readme
**Status: In development**

- Added `readme.md`

---

## 2026-02-24 00:12 - Timing tweaks
**Status: In development**

- Adjusted beat sync and filter intensity values

---

## 2026-02-23 23:29 - Refactor
**Status: In development**

- Rewrote a good chunk of `script.js`, cleaner state machine and better audio scheduling
- Small update to `index.html`

---

## 2026-02-23 23:09 - Early tweaks
**Status: In development**

- Visual and layout tweaks to `script.js` and `style.css`

---

## 2026-02-23 23:01 - Initial commit
**Status: In development**

- Got the project started: `index.html`, `style.css`, `js/script.js`, `js/pixi.min.js`
- Audio files, one image, lyrics file
- Basic version working: audio plays with a seamless intro to loop transition, PixiJS canvas, 4 shader effects (wave, chromatic aberration, hue rotation, barrel distortion), beat sync, lyrics on screen, particle burst at the drop
