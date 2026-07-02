import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  },
  envDir: '.',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // chunk splitting strategy for large 3D libs and scenes
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three') || id.includes('@react-three')) return 'r3f-vendor';
            if (id.includes('zustand')) return 'state-vendor';
            if (id.includes('gsap') || id.includes('framer-motion')) return 'anim-vendor';
            return 'vendor';
          }
        },
      },
    },
  },
})