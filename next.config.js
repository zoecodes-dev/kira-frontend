/**
 * next.config.js  (W5-#03/#04 — Vercel rewrites로 https↔http 우회)
 *
 * 브라우저는 Vercel(https)하고만 통신하고, Vercel 서버가 뒤에서 EC2(http)로
 * 요청을 대신 넘긴다(서버-서버라 mixed-content 없음).
 * 따라서 EC2 백엔드는 http(80) 그대로 두고, 인증서/도메인이 필요 없다.
 *
 * 프론트 호출 규칙: 모든 API 경로는 "/api/..." 로 시작 → 아래 rewrite가 EC2로 전달.
 *   예) lib/api.ts 가 "/api/suppliers" 호출 → http://<EC2_IP>/suppliers 로 프록시.
 *
 * EC2 IP는 환경변수 BACKEND_ORIGIN 으로 주입(Vercel 프로젝트 환경변수).
 * 로컬 개발 기본값은 localhost:8000.
 */

/** @type {import('next').NextConfig} */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://localhost:8000";

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
