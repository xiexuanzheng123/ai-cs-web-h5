import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const gatewayUrl = process.env.VITE_GATEWAY_URL ?? 'http://localhost:8080'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: gatewayUrl,
        changeOrigin: true,
      },
    },
  },
})
