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

        // 페이지 캔버스 / 보더 2단 (스펙 중립)
        canvas: '#F3F6F8',
        hairline: { DEFAULT: '#E2E8F0', soft: '#F1F5F9' },

        // brand evergreen — 로고·active·primary·좌측 강조바
        brand: {
          DEFAULT: '#11352A',
          hover:   '#1A4736',
          bg:      '#EAF1EE',
          border:  '#CAD9D2',
        },

        // 상태 4채널 — 면=bg+text, solid(채도)는 dot·바 ≤6px만. alert만 또렷.
        ok:    { bg: '#EEF4EF', border: '#D5E3D9', text: '#2F5A3D', solid: '#4B9560' },
        warn:  { bg: '#F6F1E7', border: '#E7DBC2', text: '#6E4D11', solid: '#946716' },
        alert: { bg: '#FBECEA', border: '#F0CDC9', text: '#8A271C', solid: '#A82E22' },
        info:  { bg: '#EDF1F6', border: '#D3DEEA', text: '#2A4C6E', solid: '#37618A' },

        // 하위호환 — 기존 accent-*/signal-* 클래스가 새 색을 자동으로 받도록 재정의
        accent: {
          DEFAULT: '#11352A',
          50:  '#EAF1EE',
          100: '#CAD9D2',
          400: '#2F6B53',
          500: '#1F5A44',
          600: '#174A37',
          700: '#11352A',
          900: '#0C2A20',
        },
        signal: {
          ok:    '#4B9560',
          warn:  '#946716',
          alert: '#A82E22',
          info:  '#37618A',
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
