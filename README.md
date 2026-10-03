# 🎤 Karaoke Party!

A bright, big-button karaoke app for kids' parties. React + Tailwind CSS + YouTube Iframe API.

## Run it

```bash
npm install
cp .env.example .env     # then put your YouTube Data API v3 key in YOUTUBE_API_KEY=
npm run dev              # open http://localhost:5173 on the laptop
```

The key is only read by the local server; it never reaches the browser. Without a key everything still works,
you just add songs by pasting links.

## Before the party: build the song list (grown-ups)

Click **🔧 Grown-ups** → **Song library**:

- **YouTube search** (defaults to "kidz bop karaoke"): results are limited to embeddable, kid-safe (SafeSearch strict) videos.
- **Playlist**: paste a playlist link or ID (up to 200 videos), e.g. a Kidz Bop karaoke playlist.
- **Paste link**: add one video with your own title.

Use **＋** per song or **Add all**. Titles are tidied automatically ("KIDZ BOP Kids - Flowers (Karaoke Version)" becomes "Flowers"); use
**Manage saved songs** to rename or remove. The list is saved in `data/library.json`, so it's still there next time (commit it if you like).
Search costs 100 quota units, playlists about 1 per 50 songs, so the free daily quota is plenty.

## At the party

1. Plug the laptop into the screen, run the app, drag its window to the screen and press F11 for full screen.
2. Click **Tap to start the party** once (browsers need a click before they allow sound).
3. Kids tap **🎵 Pick a song!**, tap a song, choose or type their name, and it joins the queue (the first song starts right away).
4. **Lyrics are found automatically** (from [LRCLIB](https://lrclib.net), a free lyrics database) when a song starts. Use 🔍 Find lyrics to retry, ↻ Try another if the match is wrong, or ✏️ Edit to paste your own. When timed lyrics exist, the current line is highlighted and scrolls along with the video; use Timing earlier/later if it's off. The laptop needs internet for this.
5. When a song ends, the next one starts after 3 seconds (toggle **Auto-play next**).
6. Optional: phones on the same Wi-Fi can open the link shown under 🔧 Grown-ups (`http://<laptop-ip>:5173/?remote`) to pick songs from the library too.

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
index.html  vite.config.js  tailwind.config.js  .env.example
server/partyApi.js             API inside the Vite server: queue, library, YouTube (key stays here), lyrics
data/library.json              your curated songs
src/
  main.jsx  App.jsx  index.css
  hooks/useSharedState.js      queue/current-song state, synced to the server + localStorage
  lib/youtube.js               URL parsing + Iframe API loader
  lib/lyrics.js                lyrics lookup (LRCLIB) + timed-lyrics parser
  lib/pitch.js                 tab-audio capture + Tone.js PitchShift
  hooks/useLibrary.js          curated song list
  components/                  YouTubePlayer, SongPicker, LibraryAdmin, AddSongForm, Queue, Lyrics, PitchControls, RemoteView
```

The queue lives in memory in the dev server (a restart empties it). The app needs `npm run dev`/`npm run preview` (not plain static hosting) for the library, lyrics and YouTube features.
