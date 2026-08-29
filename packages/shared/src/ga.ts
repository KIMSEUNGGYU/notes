import type { HeadConfig } from 'vitepress';

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

// GA 이벤트 전송 헬퍼 함수
export function sendGAEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', eventName, params);
  }
}

// 스크롤 깊이 추적 (25%, 50%, 75%, 100%)
export function trackScrollDepth() {
  if (typeof window === 'undefined') return;

  const trackedDepths = new Set<number>();
  const depths = [25, 50, 75, 100];

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    depths.forEach((depth) => {
      if (scrollPercent >= depth && !trackedDepths.has(depth)) {
        trackedDepths.add(depth);
        sendGAEvent('scroll_depth', {
          depth_percentage: depth,
          page_path: window.location.pathname,
        });
      }
    });
  };

  window.addEventListener('scroll', handleScroll, { passive: true });

  // 클린업 함수 반환
  return () => window.removeEventListener('scroll', handleScroll);
}

// 코드 블록 복사 추적
export function trackCodeCopy() {
  if (typeof window === 'undefined') return;

  const handleCopy = (e: Event) => {
    const target = e.target as HTMLElement;
    const copyButton = target.closest('.vp-copy-code-button, [class*="copy"]');

    if (copyButton) {
      const codeBlock = copyButton.closest('.vp-code-group, div[class*="language-"]');
      const language = codeBlock?.className.match(/language-(\w+)/)?.[1] || 'unknown';

      sendGAEvent('code_copy', {
        language,
        page_path: window.location.pathname,
      });
    }
  };

  document.addEventListener('click', handleCopy);

  return () => document.removeEventListener('click', handleCopy);
}

// 외부 링크 클릭 추적
export function trackOutboundLinks() {
  if (typeof window === 'undefined') return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a');

    if (link && link.hostname !== window.location.hostname) {
      sendGAEvent('outbound_link', {
        url: link.href,
        link_text: link.textContent?.slice(0, 50),
        page_path: window.location.pathname,
      });
    }
  };

  document.addEventListener('click', handleClick);

  return () => document.removeEventListener('click', handleClick);
}

// 목차(TOC) 클릭 추적
export function trackTocClick() {
  if (typeof window === 'undefined') return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const tocLink = target.closest('.VPDocOutlineItem a, .outline-link');

    if (tocLink) {
      sendGAEvent('toc_click', {
        section: tocLink.textContent?.slice(0, 50),
        page_path: window.location.pathname,
      });
    }
  };

  document.addEventListener('click', handleClick);

  return () => document.removeEventListener('click', handleClick);
}

// 검색 사용 추적
export function trackSearch() {
  if (typeof window === 'undefined') return;

  let searchTimeout: ReturnType<typeof setTimeout>;

  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    const searchInput = target.closest('.DocSearch-Input, [class*="search"] input');

    if (searchInput && target.value) {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        sendGAEvent('site_search', {
          search_term: target.value.slice(0, 100),
          page_path: window.location.pathname,
        });
      }, 1000); // 1초 디바운스
    }
  };

  document.addEventListener('input', handleInput);

  return () => {
    document.removeEventListener('input', handleInput);
    clearTimeout(searchTimeout);
  };
}

// 읽기 시간 추적 (페이지 떠날 때)
export function trackReadTime() {
  if (typeof window === 'undefined') return;

  const startTime = Date.now();

  const handleBeforeUnload = () => {
    const timeSpent = Math.round((Date.now() - startTime) / 1000);

    // 최소 5초 이상 머문 경우만 추적
    if (timeSpent >= 5) {
      sendGAEvent('read_time', {
        time_seconds: timeSpent,
        page_path: window.location.pathname,
      });
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);

  return () => window.removeEventListener('beforeunload', handleBeforeUnload);
}

// 다크모드 전환 추적
export function trackThemeChange() {
  if (typeof window === 'undefined') return;

  const handleClick = (e: Event) => {
    const target = e.target as HTMLElement;
    const themeButton = target.closest('.VPSwitchAppearance, [class*="appearance"]');

    if (themeButton) {
      // 약간의 딜레이 후 현재 테마 확인
      setTimeout(() => {
        const isDark = document.documentElement.classList.contains('dark');
        sendGAEvent('theme_change', {
          theme: isDark ? 'dark' : 'light',
          page_path: window.location.pathname,
        });
      }, 100);
    }
  };

  document.addEventListener('click', handleClick);

  return () => document.removeEventListener('click', handleClick);
}

// 모든 GA 추적 초기화
export function initGATracking() {
  const cleanups: Array<(() => void) | undefined> = [];

  cleanups.push(trackScrollDepth());
  cleanups.push(trackCodeCopy());
  cleanups.push(trackOutboundLinks());
  cleanups.push(trackTocClick());
  cleanups.push(trackSearch());
  cleanups.push(trackReadTime());
  cleanups.push(trackThemeChange());

  // 모든 클린업 함수 반환
  return () => {
    cleanups.forEach((cleanup) => {
      cleanup?.();
    });
  };
}

// TypeScript 타입 확장
declare global {
  interface Window {
    gtag: (command: string, action: string, params?: Record<string, unknown>) => void;
  }
}
