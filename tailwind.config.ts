import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forge: {
          bg: '#080a0f',
          card: '#111827',
          accent: '#f97316',
          soft: '#fed7aa',
        },
      },
    },
  },
  plugins: [],
};

export default config;
