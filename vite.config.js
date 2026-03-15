import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,           // bind 0.0.0.0 — reachable from LAN, port-forwards, VMs
    port: 5173,
    strictPort: false,    // if 5173 is held, try 5174 → 5175 → … instead of crashing
    allowedHosts: true,   // accept requests from any hostname/IP (Vite 6+ host-check bypass)
  },
  preview: {
    host: true,
    port: 4173,
    strictPort: false,
  },
})
