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
        // 회사 제출용 톤: 절제된 다크 차콜 + 청록 액센트
        ink: {
          900: '#0F1419',
          800: '#1A1F26',
          700: '#252B33',
          600: '#3A4250',
          500: '#5A6470',
          400: '#8A9199',
          300: '#B8BEC4',
          200: '#DDE2E7',
          100: '#EEF1F4',
          50:  '#F7F9FB',
        },
        accent: {
          // 차분한 청록 (의료/규제 분위기)
          DEFAULT: '#0F766E',
          50:  '#F0FDFA',
          100: '#CCFBF1',
          400: '#2DD4BF',
          500: '#14B8A6',
          600: '#0D9488',
          700: '#0F766E',
          900: '#134E4A',
        },
        signal: {
          ok:    '#15803D',
          warn:  '#B45309',
          alert: '#B91C1C',
          info:  '#1D4ED8',
        },
      },
      borderRadius: { 'xs': '2px' },
    },
  },
  plugins: [],
};
export default config;
