import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  const isVercel = Boolean(process.env.VERCEL);

  return {
    plugins: [react()],
    server: {
      port: 5174,
      strictPort: true,
    },
    build: {
      outDir: isVercel ? 'dist' : '../static/dist',
      emptyOutDir: true,
      manifest: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('@supabase')) {
              return 'vendor-supabase';
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            return 'vendor';
          },
        },
      },
    },
  };
});

