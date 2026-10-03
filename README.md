# 🎤 Karaoke Party!

A bright, big-button karaoke app for kids' parties. React + Tailwind CSS + YouTube Iframe API.

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173 on the TV/laptop
```

`npm run dev` listens on your network too. The sidebar shows a link like `http://192.168.1.20:5173/?remote`.
Open it on a phone (same Wi-Fi) to add songs to the shared queue. `npm run build && npm run preview` works too.

## How to use

1. Plug the laptop into the screen, run the app, drag its window to the screen and press F11 for full screen.
2. Click **Tap to start the party** once (browsers need a click before they allow sound).
3. Paste a YouTube link (e.g. a Kidz Bop karaoke or instrumental video), a title, a singer name, and optional lyrics, then **Add to queue**. The first song plays right away; the rest wait in **Next up**.
4. **Lyrics are found automatically** (from [LRCLIB](https://lrclib.net), a free lyrics database) when a song with no lyrics starts. Use 🔍 Find lyrics to retry, ↻ Try another if the match is wrong, or ✏️ Edit to paste your own. When timed lyrics exist, the current line is highlighted and scrolls along with the video; use the Timing earlier/later buttons if it's off (karaoke videos often have a different intro). The laptop needs internet for this.
5. When a song ends, the next one starts after 3 seconds (toggle **Auto-play next**).
6. **📺 TV mode** hides the add-song form for a cleaner screen.

## Key changer (pitch shift): important

Browsers don't let a page process the audio of an embedded YouTube player, and YouTube's own speed
control changes tempo. So the key changer works like this:

1. Click **Turn on key changer** (Chrome or Edge on a computer).
2. In the share dialog choose **This tab** and tick **Share tab audio**.
3. The tab's audio is muted and played back through a Tone.js pitch shifter (−8 … +8 semitones) with the speed unchanged.

Notes: this adds a small delay (~0.1–0.2 s) between video and audio.
Turn the key changer off (or press the browser's "Stop sharing") to return to normal audio.

## Project structure

```
index.html  vite.config.js (also hosts the tiny shared-queue API)  tailwind.config.js
src/
  main.jsx  App.jsx  index.css
  hooks/useSharedState.js      queue/current-song state, synced to the server + localStorage
  lib/youtube.js               URL parsing + Iframe API loader
  lib/lyrics.js                lyrics lookup (LRCLIB) + timed-lyrics parser
  lib/pitch.js                 tab-audio capture + Tone.js PitchShift
  components/                  YouTubePlayer, AddSongForm, Queue, Lyrics, PitchControls, RemoteView
```

The shared queue lives in memory in the dev/preview server (restart = empty queue; the TV page re-seeds it
from its saved copy). On static hosting without the server the app still works on a single device.
