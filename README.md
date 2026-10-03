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

## Public web page (GitHub Pages)

Every push to `main` is built and published by `.github/workflows/pages.yml` to
`https://jenton.github.io/karaoke-party-app/` (one-time setup: repo **Settings → Pages → Source: GitHub Actions**).

The public page is static: it shows the song list from `public/library.json` plus any songs you add with **Paste link** in ➕ Add songs (those are saved in that browser only), finds lyrics directly from LRCLIB, and the
queue is saved in that browser only (no phones-add-songs, no editing the library, no YouTube API calls, so your API key is never published).
To change the list for everyone: build it locally with the ➕ Add songs panel, then `git add public/library.json`, commit and push.

The starter library (`public/library.json`) has 7 KIDZ BOP karaoke videos plus 20 popular songs you supplied (artist is saved with each song and used to find lyrics). None of the video IDs have been checked for embedding.

## Shared song database (Supabase): same list at any location

By default the song list is a file (`public/library.json`). To have songs you add in the app saved to a database, so the
public page shows the same list on any laptop at any location with no git push, set up a free Supabase project once:

1. Create an account and a new project at https://supabase.com (free plan is plenty).
2. **SQL Editor → New query**: paste the contents of `supabase/schema.sql` and **Run**. This creates the `songs` table:
   everyone can read it, only a signed-in user can change it.
3. **Authentication → Providers → Email**: turn **off** "Allow new users to sign up" (so strangers can't make accounts), then
   **Authentication → Users → Add user** and create yourself an email + password (tick "Auto Confirm User").
4. **Project Settings → API**: copy the **Project URL** and the **anon public** key.
5. Locally: put them in `.env` as `VITE_SUPABASE_URL=` and `VITE_SUPABASE_ANON_KEY=` and restart `npm run dev`.
   For the public page: GitHub repo → **Settings → Secrets and variables → Actions → Variables** tab → add repository variables
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (the anon key is meant to be public), then re-run the "Deploy to GitHub Pages" workflow.
6. Open the app → **➕ Add songs** and sign in with the user from step 3. The first time you're signed in on a device, the app adds the starter songs to the database for you (nothing to click). Artists for the starter songs are filled in from the bundled list, so the optional `alter table public.songs add column if not exists artist text;` is only needed if you want artists saved for songs you add yourself.

After that, adding, renaming and removing songs (paste link, YouTube search, playlist import on your laptop) writes to the database.
Visitors only read the list; editing needs the sign-in, which is remembered in that browser. The last list is cached, so if the
Wi-Fi drops at the party the app still shows your songs. The queue itself still lives on the screen's laptop only.
Do **not** put your YouTube API key or the Supabase "service_role" key in the public variables.

## Adding and removing songs

In the song picker, kids can **search** (title or artist) and filter by **category chips** (Disney & Movies, Dance, Feel-good, Sing-alongs, Pop, KIDZ BOP). Click **➕ Add songs** in the top bar (or **➕ Add a song** inside the song picker). Anyone can pick songs; adding is open to whoever is signed in on that device (sign in once and it's remembered). **Song library** offers:

- **YouTube search** (defaults to "kidz bop karaoke"): results are limited to embeddable, kid-safe (SafeSearch strict) videos.
- **Playlist**: paste a playlist link or ID (up to 200 videos). It's pre-filled with the official KIDZ BOP Karaoke playlist, so with an API key, click **Load** then **Add all** to import the whole thing.
- **Paste link**: add one video, optionally with an artist and a category; the title is filled in automatically when possible (or type your own), with a thumbnail preview.

Use **＋** per song or **Add all**. Titles are tidied automatically ("KIDZ BOP Kids - Flowers (Karaoke Version)" becomes "Flowers"); use
**Manage saved songs** to rename or remove. The list is saved in `public/library.json`, so it's still there next time (commit it if you like).
**Removing songs:** open **⚙️ Host → 🛠️ Remove songs**. Every song gets a 🗑️ button (it asks to confirm), and **Done removing** takes you back. The kids' picker has no admin or add buttons. Admin mode needs no password; with the shared database you just need to be signed in once on that device (the sign-in form appears right there if you aren't). Turn Admin off, or close the picker, to go back to picking.

Search costs 100 quota units, playlists about 1 per 50 songs, so the free daily quota is plenty.

## At the party

1. Plug the laptop into the screen, run the app, drag its window to the screen and press F11 for full screen.
2. Click **Tap to start the party** once (browsers need a click before they allow sound).
3. The screen is all stage: a colourful **visualizer** (the default) or the music video, with karaoke lyrics drawn over the bottom of it, and who's singing plus the next singer underneath. **🎬 Show video / 🌈 Visualizer** in the top bar switches (the choice is remembered). The video keeps playing, and supplying the sound, behind the visualizer. Under the stage: a **seek bar** (drag or click to jump anywhere), **⏪ 10s / ⏸️ Pause / 10s ⏩**, 🔁 Restart and ⏭️ Next. Laptop shortcuts: **Space** pause/play, **← / →** back/forward 10 seconds. The visualizer dances to the real music while the key changer is on, otherwise to a built-in beat. If YouTube refuses to play a video, the stage says so and skips to the next song. The top bar has just two buttons: **🎵 Pick a song** for the kids (they tap a song, choose or type their name, and a message tells them where they are in line; a **🖼️ Pictures / ☰ List** switch lets you hide the thumbnails and show just titles and artists) and **⚙️ Host** for you: **🎟️ Queue**, **📜 Lyrics** (find/replace lyrics, size, timing), **🎚️ Key**, **➕ Add songs**, **🛠️ Remove songs**, the video/visualizer switch and full screen. Queue, Lyrics, Key and Add songs slide in from the side and close again. Before each song a "Get ready, Mia! 3-2-1" card gives the singer time to grab the mic (**Start now ▶** skips it).
4. **Lyrics are found automatically** (from [LRCLIB](https://lrclib.net), a free lyrics database) when a song starts. With timed lyrics, the current line fills with colour like a real karaoke video and the next line is shown below it; without timing, the full lyrics sit in a panel that scrolls with the song. In **📜 Lyrics** use 🔍 Find lyrics to retry, ↻ Try another if the match is wrong, paste your own, and Timing earlier/later if it's off. The laptop needs internet for this.
5. When a song ends, the next one starts after 3 seconds (toggle **Auto-play next**).
6. Optional: phones on the same Wi-Fi can open the link shown under ➕ Add songs (`http://<laptop-ip>:5173/?remote`) to pick songs from the library too.

## Singer names

When a kid picks a song they tap their name from quick-pick chips or type a new one. The names are **not** saved anywhere permanent:
they live only in that browser session (closing the browser/tab clears them) and never go into the database. Tap the ✕ on a chip to
remove one name, or **Clear all names** in the same dialog. **⚙️ Host → 🎉 New party** clears the queue and all names at once (the song library is untouched).

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
public/library.json              your curated songs
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
