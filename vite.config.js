import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Cai relative, ca aplicatia sa mearga si pe GitHub Pages (https://aurika999.github.io/edit-video/).
  base: './',
  server: { port: 5173, open: true },
});
