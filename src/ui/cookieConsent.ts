import { initGoogleAnalyticsIfConfigured, analyticsPageView } from '@/analytics/googleAnalytics';
import {
  CONSENT_STORAGE_KEY,
  migrateLegacyConsent,
  readConsent,
  writeConsent,
  hasAnalyticsConsent,
} from '@/consent/consentStorage';

/** Run once at app entry: migrate legacy keys and load GA script if the visitor already opted in. */
export function bootstrapConsentAnalytics(): void {
  migrateLegacyConsent();
  if (hasAnalyticsConsent()) {
    void initGoogleAnalyticsIfConfigured();
  }
}

export function initCookieConsent(): void {
  migrateLegacyConsent();

  const root = document.getElementById('cookie-consent');
  if (!root) return;

  if (readConsent()) {
    root.remove();
    return;
  }

  root.hidden = false;

  const dismiss = (analytics: boolean) => {
    try {
      writeConsent(analytics);
    } catch {
      /* private mode */
    }
    if (analytics) {
      void initGoogleAnalyticsIfConfigured().then(() => {
        analyticsPageView(`${window.location.pathname}${window.location.search}`, document.title);
      });
    }
    root.remove();
  };

  document.getElementById('cookie-reject')?.addEventListener('click', () => dismiss(false));
  document.getElementById('cookie-accept')?.addEventListener('click', () => dismiss(true));
}

/** For tests or future “cookie settings” UI. */
export function clearConsentForTesting(): void {
  try {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
