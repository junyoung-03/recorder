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
    },
  };
});

