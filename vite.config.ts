import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to local network (Wi-Fi / LAN)
    port: 5173,
  },
});
