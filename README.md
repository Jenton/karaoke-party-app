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

The public page is static (no server), but can do everything the laptop version does once you connect it to two services:
- **Supabase** (below) stores the song library and the shared queue, so phones, the TV and the laptop agree from anywhere.
- **A YouTube API key** (below) turns on YouTube search, playlist import and "Find another" on the public page.

Without them it still works: the list comes from `public/library.json`, edits and the queue stay in that browser, and you can paste links to replace songs.

The starter library (`public/library.json`) has 54 songs (K-Pop Demon Hunters, Disney, pop and sing-along favourites), each with a **karaoke** and an **original** video (`karaokeId` / `officialId`), plus artist and category. The "original" video for each song is an official audio or lyric-video upload where one exists (those start at 0:00 on the studio recording, so lyric timing lines up and there are no skits or dance tutorials), and the karaoke video is a karaoke-channel upload. The IDs were found by searching for each title (not by guessing), but nothing can confirm from outside a browser that every one allows embedding; the app checks that itself (see below). On the first sign-in on a device the app **replaces the whole shared library with this starter list** (a one-off reset); after that it only adds starter songs it hasn't offered yet.

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
6. Open the app, hold **🔧 Manage** in the picker, and sign in with the user from step 3. When you're signed in, the app adds starter songs it hasn't offered yet on that device to the database for you (nothing to click; songs you've removed don't come back). Artists for the starter songs are filled in from the bundled list, so the the optional `alter table public.songs add column if not exists artist text;` (also `genre`, `karaoke_id`, `official_id`, see `supabase/schema.sql`) is only needed if you want artists, categories and second videos saved for songs you add yourself.

After that, adding, renaming and removing songs writes to the database.
Visitors only read the list; editing needs the sign-in, which is remembered in that browser. The last list is cached, so if the
Wi-Fi drops at the party the app still shows your songs.

The same `schema.sql` also creates a `party_state` table that holds the **shared queue** (one row). Everyone with the page can add to it
(that's the point: phones add songs), and anyone who knew your anon key could also clear it, which is fine for a party. Re-run the
whole `schema.sql` if you set up Supabase before this was added (it is safe to run again).

## YouTube API key (search, playlist import, "Find another")

1. https://console.cloud.google.com → create a project → **APIs & Services → Library** → enable **YouTube Data API v3**.
2. **APIs & Services → Credentials → Create credentials → API key**. Open the key and set:
   - **Application restrictions → Websites** and add `https://jenton.github.io/*` and `http://localhost:*/*` (so the key only works from your pages).
   - **API restrictions → Restrict key → YouTube Data API v3**.
3. Public page: GitHub repo → **Settings → Secrets and variables → Actions → Variables** → add `VITE_YOUTUBE_API_KEY` with the key, then re-run the "Deploy to GitHub Pages" workflow.
4. Laptop: put the same key in `.env` as `YOUTUBE_API_KEY=` (the local server keeps it private).

The key on the public page is visible to anyone who views the page source. The restrictions above are what stop others using it; the worst case is
someone using up your free daily quota (search costs 100 of 10,000 units, so about 100 searches a day).

## Karaoke and original versions

Each song can have both a karaoke video and the original. They are **one entry** in the library, not two. In the picker the **Play: 🎤 Karaoke / 🎬 Original** switch sets the default for everything you add (karaoke is the default), and each song has its own small switch to override it. Once a song is queued or playing, the same switch appears in the **Queue** panel and under the stage so you can flip it any time (it restarts the song on the other video). If a video refuses to play (for example the original isn't allowed to be embedded), the app automatically switches to the other version and says so.

**"Can't play outside the YouTube app" / "Playback on other websites has been disabled":** the video's owner has switched off embedding, which is common for official music-video uploads from labels. You don't have to check videos by hand, the app handles it:

1. **Automatic health check:** in the background (on load, when the library changes, then cached for hours) the app asks YouTube whether each video exists and may be embedded (the laptop version uses your API key if there is one, otherwise YouTube's oEmbed check; the public page asks from the browser).
2. **It steers around bad videos:** if the preferred version is blocked, the other one is used; a version known to be blocked is greyed out in the switch; a song with no working video is hidden from the kids' picker.
3. **It learns while playing:** if a video still fails at play time, the app switches to the other version, remembers the failure, and avoids that video from then on.
4. **Find a replacement:** in the manager (laptop version with a YouTube API key) each flagged video has **🔄 Find another**, which searches for embeddable uploads of the same song and lets you pick one (results that look right are tagged), and **🔄 Replace all blocked videos** does that automatically. Replacements are remembered on that device.
5. **You still see everything in the manager:** blocked or removed videos are flagged ⚠️ automatically, with **🔍 Re-check now**. Replace those at your leisure.
6. Karaoke uploads (Sing King and similar) almost always allow embedding, which is why karaoke is the default.

Click the stage (video or visualizer) to pause/play; Space does the same.

In the manager, **🔎 Check that videos match their songs** asks YouTube for each video's real title and channel (from your browser, nothing is stored on a server) and flags ones that look wrong: another song, a cover, remix or live version where the original should be, or a non-karaoke video in the karaoke slot. The flagged song shows the real title, with **Find another** (or a paste-a-link button). **Replace all blocked videos** also swaps these.

## Explicit lyrics

On screen, explicit words are always shown as **[bloop]**. The app also scans every song's lyrics in the background and, in the manager, tags songs with **🔞 explicit** (strong language) or **🔞 mild** (damn, hell...) and shows the words found. Songs with strong language are **hidden from the kids' picker** (switch this off in the manager if you like). Note the audio itself isn't edited, so for songs that are explicit I look for a radio-edit or KIDZ BOP upload, or leave the song out.

Songs that are explicit also get a small dark **E** tag next to the title in the library list and grid. A song gets the tag when the lyrics scan finds strong language, or when it has `"explicit": true` in `public/library.json` (use this for songs the scan can't judge). Songs with the tag are hidden from the kids' picker while "hide songs with strong language" is on.

## Seeding more songs

Three ways, from least to most effort:

1. **Add them to `public/library.json`** (what the starter list is). Each entry is `{ "videoId", "title", "artist", "genre", "karaokeId", "officialId" }` (`videoId` = the original's id, or the karaoke id if there's no original). Commit and push: on the next sign-in the shared database picks up any starter songs it hasn't seen (and drops stale rows for starters whose videos changed).
2. **Paste a list in the picker's manager** (**Paste list** tab): a JSON list of songs with a title and a `youtubeId` each. Rows for the same song's karaoke and original videos (`"id": "5-off"` / `"5-kar"`, or "(Karaoke Version)" in the title) are merged into one entry. Works with lists from any AI assistant.
3. **Bulk import from YouTube** (laptop version with an API key): manager → **Playlist** → paste a karaoke playlist (for example Sing King's "Disney Karaoke" `PL8D4Iby0Bmm9DM_LC_2MEwqidYODgXsNw`, or their per-artist playlists) → **Add all**. Those arrive as karaoke-only songs; attach the original with **＋🎬 original** if you want one.

## Adding and managing songs (all in the song picker)

Everything lives in **🎵 Pick a song**. Kids search (title or artist), filter by **category chips** (Disney & Movies, Dance, Feel-good, Sing-alongs, Throwbacks, Fun & Novelty, Pop, Karaoke) and tap **＋ Add**.

To manage the library, **hold the small 🔧 Manage button for about a second** in the picker's top bar (a plain tap does nothing, so kids don't wander in), or use **⚙️ Host → 🛠️ Manage song library**. The picker turns into the manager:

- An **Add songs to the library** card at the top: **YouTube search** (defaults to "kidz bop karaoke", embeddable and kid-safe results only), **Playlist** (paste a link or ID, up to 200 videos, then **Add all**), or **Paste link** (one video, say whether it's the karaoke or the original, optional artist and category; the title is filled in automatically when possible, with a thumbnail preview).
- Every song in the list gets **✏️ rename** and **🗑️ remove** buttons (removing asks to confirm), and **＋🎤 karaoke / ＋🎬 original** buttons to attach the missing version by pasting a link. **🔍 Check that every video can play** flags videos that are blocked or gone. Tap **✅ Done** to go back to picking.

New songs show up in the list straight away; use **＋ Add** on them to queue them. No password is needed; with the shared database you just sign in once per device (the sign-in form appears in the manager if you aren't). Titles from YouTube are tidied automatically ("KIDZ BOP Kids - Flowers (Karaoke Version)" becomes "Flowers"). Without a database the list is `public/library.json` on your laptop (commit it if you like).

Search costs 100 quota units, playlists about 1 per 50 songs, so the free daily quota is plenty.

## At the party

1. Plug the laptop into the screen, run the app, drag its window to the screen and press F11 for full screen.
2. Click **Tap to start the party** once (browsers need a click before they allow sound).
3. The screen is all stage: a colourful **visualizer** (the default) or the music video, with karaoke lyrics drawn over the bottom of it, and who's singing plus the next singer underneath. **🎬 Show video / 🌈 Visualizer** in the top bar switches (the choice is remembered). The video keeps playing, and supplying the sound, behind the visualizer. Under the stage: a **seek bar** (drag or click to jump anywhere), **⏪ 10s / ⏸️ Pause / 10s ⏩**, 🔁 Restart and ⏭️ Next. Laptop shortcuts: **Space** pause/play, **← / →** back/forward 10 seconds. The visualizer dances to the real music while the key changer is on, otherwise to a built-in beat. If YouTube refuses to play a video, the stage says so and skips to the next song. The top bar has just two buttons: **🎵 Pick a song** for the kids (each song has a **＋ Add** button that puts it straight in the queue with no name needed, or tap the song to also say who's singing; a message tells them where they are in line; a **🖼️ Pictures / ☰ List** switch lets you hide the thumbnails and show just titles and artists) and **⚙️ Host** for you: **🎟️ Queue**, **📜 Lyrics** (find/replace lyrics, size, timing), **🎚️ Key**, **🛠️ Manage song library**, the video/visualizer switch and full screen. Queue, Lyrics and Key slide in from the side and close again. Before each song a "Get ready, Mia! 3-2-1" card gives the singer time to grab the mic (**Start now ▶** skips it).
4. **Lyric timing, so you rarely have to adjust it.** (a) **Karaoke videos show their own lyrics**: those are already perfectly in time, so for a karaoke version the app shows the video and keeps its own lyrics overlay off (switchable in **📜 Lyrics**). (b) For the original versions the app picks, from the lyrics database's options, the one whose length best matches the video's length, and warns in the Lyrics panel if the video is much longer or shorter than the lyrics' track (an intro). (c) If it is still off, press **S** (or **🎯 Sync** in 📜 Lyrics) at the moment the first words are sung: it lines everything up in one tap, and the correction is **remembered for that video**, so you only fix a video once. ± fine-tune buttons are there too.
5. **Lyrics are found automatically** (only when the match has the same title and artist, so KIDZ BOP-style covers with no real artist wait for you to tap Find lyrics) and **explicit words are always shown as [bloop]** on the stage. Details: (from [LRCLIB](https://lrclib.net), a free lyrics database) when a song starts. With timed lyrics, the current line fills with colour like a real karaoke video and the next line is shown below it; without timing, the full lyrics sit in a panel that scrolls with the song. In **📜 Lyrics** use 🔍 Find lyrics to retry, ↻ Try another if the match is wrong, paste your own, and Timing earlier/later if it's off. The laptop needs internet for this.
6. When a song ends, the next one starts after 3 seconds (toggle **Auto-play next**).
7. Optional: phones on the same Wi-Fi can open the link shown in **⚙️ Host → 🎟️ Queue** (`http://<laptop-ip>:5173/?remote`) to pick songs from the library too.

## Singer names

Naming is optional. Songs can be queued with no name and named later: click the name (or **+ add singer name**) in **⚙️ Host → 🎟️ Queue**, under the stage, or on the "Get ready" card when their turn comes.

When a kid picks a song they tap their name from quick-pick chips or type a new one. The names are **not** saved anywhere permanent:
they live only in that browser session (closing the browser/tab clears them) and never go into the database. Tap the ✕ on a chip to
remove one name, or **Clear all names** in the same dialog. **⚙️ Host → 🎉 New party** clears the queue and all names at once (the song library is untouched).

## Key changer (pitch shift): important

Browsers don't let a page process the audio of an embedded YouTube player, and YouTube's own speed
control changes tempo. So the key changer works like this:

1. Click **Turn on key changer** (Chrome or Edge on a computer). Allow pop-ups if asked: a small **Karaoke player** window opens.
2. In the share dialog choose the **Chrome Tab** option, pick **🎤 Karaoke player** (never the main page: it would feed back with a loud screech) and tick **Also share tab audio**.
3. The song now plays in that small window (keep it open, you can minimise it; click it once if it asks to start). Its sound is muted there and played by the main page through a Signalsmith Stretch pitch shifter (high quality, formant-preserving) (−8 … +8 semitones) with the speed unchanged. The main screen shows the lyrics and visualizer as usual.

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
  lib/pitch.js                 tab-audio capture + Signalsmith Stretch pitch shifter
  hooks/useLibrary.js          curated song list
  components/                  YouTubePlayer, SongPicker, LibraryAdmin, AddSongForm, Queue, Lyrics, PitchControls, RemoteView
```

The queue lives in memory in the dev server (a restart empties it). The app needs `npm run dev`/`npm run preview` (not plain static hosting) for the library, lyrics and YouTube features.
