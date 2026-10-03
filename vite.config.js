import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { partyApi } from './server/partyApi.js'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // reads .env (YOUTUBE_API_KEY)
  return { plugins: [react(), partyApi(env)] }
})
