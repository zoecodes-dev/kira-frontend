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
          900: '#FFFFFF',   // 가장 밝은 배경
          800: '#F7F9FB',   // 카드 배경
          700: '#E5E8EC',   // 보더
          600: '#C4CAD0',   // 옅은 보더
          500: '#6B7280',   // 보조 텍스트 (캡션)
          400: '#4B5563',   // 라벨, 부가 텍스트
          300: '#1F2937',   // 본문 텍스트 ← 진하게
          200: '#111827',   // 강조 텍스트
          100: '#030712',   // 제목
          50:  '#000000',   // 가장 진한 텍스트
        },
        accent: {
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
          ok:    '#065F46',  // 진한 녹색
          warn:  '#92400E',  // 진한 주황
          alert: '#991B1B',  // 진한 빨강
          info:  '#1E3A8A',  // 진한 파랑
        },
      },
      borderRadius: { 'xs': '2px' },
    },
  },
  plugins: [],
};
export default config;
