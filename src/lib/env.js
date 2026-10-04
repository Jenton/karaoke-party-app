// The GitHub Pages build is static (VITE_STATIC=1): no local server. The queue and library live in Supabase
// (if configured), YouTube search uses VITE_YOUTUBE_API_KEY, and lyrics are fetched straight from LRCLIB.
export const HAS_SERVER = !import.meta.env.VITE_STATIC
