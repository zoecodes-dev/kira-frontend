// 기존 규제 검증 결과 경로를 실제 자재 하위 화면으로 연결하는 리다이렉트 페이지
import { redirect } from 'next/navigation';

export default function RegulationResultsRedirectPage() {
  redirect('/materials/regulation-results');
}
