// The GitHub Pages build is static (VITE_STATIC=1): no local server, so no shared queue,
// no editing the library, and lyrics are fetched straight from LRCLIB.
export const HAS_SERVER = !import.meta.env.VITE_STATIC
