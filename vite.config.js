import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'node:os'

// Tiny in-memory "party server" so phones on the same Wi-Fi can share the queue
// with the TV. Runs inside the Vite dev/preview server - no extra process needed.
function partyApi() {
  let state = { rev: 0, queue: [], current: null }

  const lanAddresses = () =>
    Object.values(os.networkInterfaces())
      .flat()
      .filter((i) => i && i.family === 'IPv4' && !i.internal)
      .map((i) => i.address)

  const middleware = (req, res, next) => {
    if (!req.url.startsWith('/api/')) return next()
    const send = (obj, code = 200) => {
      res.statusCode = code
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Cache-Control', 'no-store')
      res.end(JSON.stringify(obj))
    }
    if (req.url.startsWith('/api/info')) return send({ addresses: lanAddresses() })
    if (req.url.startsWith('/api/state')) {
      if (req.method === 'GET') return send(state)
      if (req.method === 'POST') {
        let body = ''
        req.on('data', (c) => (body += c))
        req.on('end', () => {
          try {
            const next = JSON.parse(body)
            state = { rev: state.rev + 1, queue: next.queue ?? [], current: next.current ?? null }
            send(state)
          } catch {
            send({ error: 'bad json' }, 400)
          }
        })
        return
      }
    }
    send({ error: 'not found' }, 404)
  }

  return {
    name: 'party-api',
    configureServer(s) { s.middlewares.use(middleware) },
    configurePreviewServer(s) { s.middlewares.use(middleware) },
  }
}

export default defineConfig({
  plugins: [react(), partyApi()],
})
