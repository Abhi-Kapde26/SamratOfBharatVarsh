import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import net from 'node:net'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function autoStartBackendPlugin(): Plugin {
  let backendProcess: ChildProcess | null = null

  return {
    name: 'auto-start-backend',
    configureServer(server) {
      const probeAndStartBackend = () => {
        const socket = new net.Socket()
        socket.setTimeout(600)

        socket.on('connect', () => {
          socket.destroy()
        })

        socket.on('error', () => {
          socket.destroy()
          if (backendProcess) return

          const serverJs = path.resolve(__dirname, '../../backend/server.js')
          const backendDir = path.resolve(__dirname, '../../backend')

          console.log('\n👑 [Auto-Backend] Starting Samrat Backend on port 5000...')
          backendProcess = spawn(process.execPath, [serverJs], {
            cwd: backendDir,
            stdio: 'inherit',
            env: process.env,
          })

          backendProcess.on('exit', () => {
            backendProcess = null
          })
        })

        socket.on('timeout', () => {
          socket.destroy()
        })

        socket.connect(5000, '127.0.0.1')
      }

      probeAndStartBackend()

      const cleanup = () => {
        if (backendProcess) {
          try {
            backendProcess.kill()
          } catch (_) {}
          backendProcess = null
        }
      }

      process.on('exit', cleanup)
      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      // Buffer /api requests until the backend is ready (prevents startup 500/503 errors)
      server.middlewares.use((req, _res, next) => {
        if (!req.url || !req.url.startsWith('/api')) {
          return next()
        }

        const maxWaitMs = 5000
        const start = Date.now()

        const ensureConnected = () => {
          const s = new net.Socket()
          s.setTimeout(250)

          s.on('connect', () => {
            s.destroy()
            next()
          })

          const retry = () => {
            s.destroy()
            if (Date.now() - start < maxWaitMs) {
              setTimeout(ensureConnected, 150)
            } else {
              next()
            }
          }

          s.on('error', retry)
          s.on('timeout', retry)
          s.connect(5000, '127.0.0.1')
        }

        ensureConnected()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), autoStartBackendPlugin()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        ws: true,
      }
    }
  }
})
