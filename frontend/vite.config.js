import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API calls to the local backend
      '/login': 'http://localhost:3096',
      '/register': 'http://localhost:3096',
      '/api': 'http://localhost:3096',
      '/getFacultyAdvisor': 'http://localhost:3096',
      '/updateMyDepartment': 'http://localhost:3096',
      '/getUsers': 'http://localhost:3096',
      '/submissions': 'http://localhost:3096',
      '/submit': 'http://localhost:3096',
      '/forms': 'http://localhost:3096',
      '/notifications': 'http://localhost:3096',
      '/upload': 'http://localhost:3096',
    }
  }
})
