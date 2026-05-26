import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard"', '"Noto Sans KR"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          900: '#FFFFFF',
          800: '#F8FAFC',
          700: '#E2E8F0',
          600: '#CBD5E1',
          500: '#64748B',
          400: '#475569',
          300: '#334155',
          200: '#1E293B',
          100: '#0F172A',
          50:  '#020617',
        },
        accent: {
          DEFAULT: '#0F766E',
          50:  '#ECFDF5',
          100: '#D1FAE5',
          400: '#34D399',
          500: '#10B981',
          600: '#059669',
          700: '#047857',
          900: '#064E3B',
        },
        signal: {
          ok:    '#047857',
          warn:  '#B45309',
          alert: '#DC2626',
          info:  '#2563EB',
        },
      },
      boxShadow: {
        control: '0 1px 2px rgba(15, 23, 42, 0.06)',
        panel: '0 8px 24px rgba(15, 23, 42, 0.06)',
      },
      borderRadius: { 'xs': '4px' },
    },
  },
  plugins: [],
};

export default config;
