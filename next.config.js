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
  // 협력사 전용 프론트 페이지 라우트를 /supplier에서 /partner로 이동(2026-07).
  // /suppliers(원청사 협력사 관리 화면)와는 무관 — 기존에 나간 초대 메일/북마크가
  // 계속 동작하도록 예전 경로를 새 경로로 리다이렉트만 해 둔다.
  async redirects() {
    return [
      // 예전 activeView 쿼리 링크(?view=xxx)가 있었다면 대응 화면으로 직접 매핑.
      { source: "/supplier", has: [{ type: "query", key: "view", value: "company-info" }], destination: "/partner/company-info", permanent: false },
      { source: "/supplier", has: [{ type: "query", key: "view", value: "ai-parsing" }], destination: "/partner/ai-parsing", permanent: false },
      { source: "/supplier", has: [{ type: "query", key: "view", value: "supply-chain" }], destination: "/partner/supply-chain", permanent: false },
      { source: "/supplier", has: [{ type: "query", key: "view", value: "notifications" }], destination: "/partner/notifications", permanent: false },
      { source: "/supplier", has: [{ type: "query", key: "view", value: "edit-info" }], destination: "/partner/settings", permanent: false },
      { source: "/supplier", destination: "/partner", permanent: false },
      { source: "/supplier/:path*", destination: "/partner/:path*", permanent: false },
    ];
  },
};

module.exports = nextConfig;
