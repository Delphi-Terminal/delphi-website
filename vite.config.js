import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  server: {
    host: true,
    hmr: true,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        data: resolve(__dirname, 'data.html'),
        agents: resolve(__dirname, 'agents.html'),
        news: resolve(__dirname, 'news.html'),
        article: resolve(__dirname, 'article.html'),
        terms: resolve(__dirname, 'terms.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        login: resolve(__dirname, 'login.html'),
        createAccount: resolve(__dirname, 'create-account.html'),
        verify: resolve(__dirname, 'verify.html'),
        forgotPassword: resolve(__dirname, 'forgot-password.html'),
        resetPassword: resolve(__dirname, 'reset-password.html'),
        adminLogin: resolve(__dirname, 'admin/login.html'),
        adminDashboard: resolve(__dirname, 'admin/dashboard.html'),
        adminSettings: resolve(__dirname, 'admin/settings.html'),
        account: resolve(__dirname, 'account.html'),
      },
    },
  },
});
