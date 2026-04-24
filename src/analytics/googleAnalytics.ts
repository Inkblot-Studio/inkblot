import { hasAnalyticsConsent } from '@/consent/consentStorage';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gaLoadPromise: Promise<void> | null = null;

function measurementId(): string | undefined {
  const id = import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined;
  if (!id || !/^G-[A-Z0-9]+$/i.test(id.trim())) return undefined;
  return id.trim();
}

/**
 * Injects GA4 (gtag.js) once. Call only after the visitor has opted in to analytics.
 */
export function initGoogleAnalyticsIfConfigured(): Promise<void> {
  const id = measurementId();
  if (!id) return Promise.resolve();

  if (gaLoadPromise) return gaLoadPromise;

  gaLoadPromise = new Promise<void>((resolve, reject) => {
    if (typeof document === 'undefined') {
      resolve();
      return;
    }

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
    window.gtag('js', new Date());
    window.gtag('config', id, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('[Inkblot] Failed to load Google Analytics script'));
    document.head.appendChild(s);
  });

  return gaLoadPromise.catch(() => {});
}

/** SPA route changes — no-op if analytics not consented or GA not configured. */
export function analyticsPageView(path: string, title?: string): void {
  if (!hasAnalyticsConsent()) return;
  const id = measurementId();
  if (!id || typeof window.gtag !== 'function') return;
  window.gtag('config', id, {
    page_path: path,
    page_title: title ?? document.title,
  });
}
