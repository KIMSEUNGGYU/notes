import type { HeadConfig } from 'vitepress';

// 프로덕션 환경 체크
const GA_ID = 'G-GFRZTQR57W';

export function getGoogleAnalyticsHead(): HeadConfig[] {

  return [
    ['script', { async: '', src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}` }],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`,
    ],
  ];
}
