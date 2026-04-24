export const CONSENT_STORAGE_KEY = 'inkblot-consent-v2';
const LEGACY_STORAGE_KEY = 'inkblot-cookie-consent';

export interface ConsentRecord {
  v: 2;
  analytics: boolean;
  decidedAt: string;
}

export function readConsent(): ConsentRecord | null {
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<ConsentRecord>;
    if (o.v !== 2 || typeof o.analytics !== 'boolean' || typeof o.decidedAt !== 'string') {
      return null;
    }
    return { v: 2, analytics: o.analytics, decidedAt: o.decidedAt };
  } catch {
    return null;
  }
}

export function writeConsent(analytics: boolean): void {
  const rec: ConsentRecord = {
    v: 2,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(rec));
}

/** Map single legacy key into v2 and remove legacy. */
export function migrateLegacyConsent(): void {
  try {
    if (localStorage.getItem(CONSENT_STORAGE_KEY)) return;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === 'accepted') {
      writeConsent(true);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } else if (legacy === 'rejected') {
      writeConsent(false);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}
