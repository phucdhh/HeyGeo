import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fffbeb',   // amber-50
          100: '#fef3c7',   // amber-100
          500: '#f59e0b',   // amber-500
          600: '#d97706',   // amber-600
          700: '#b45309',   // amber-700
          900: '#1c1917',   // stone-900 (warm dark)
        },
      },
    },
  },
  plugins: [],
};

export default config;
