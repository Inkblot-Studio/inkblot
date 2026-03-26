const STORAGE_KEY = 'inkblot-cookie-consent';

/**
 * Shows the cookie banner until the visitor accepts or rejects (stored in localStorage).
 */
export function initCookieConsent(): void {
  const root = document.getElementById('cookie-consent');
  if (!root) return;

  try {
    if (localStorage.getItem(STORAGE_KEY)) {
      root.remove();
      return;
    }
  } catch {
    /* private mode — keep banner visible */
  }

  root.hidden = false;

  const dismiss = (value: 'accepted' | 'rejected') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    root.remove();
  };

  document.getElementById('cookie-accept')?.addEventListener('click', () => dismiss('accepted'));
  document.getElementById('cookie-reject')?.addEventListener('click', () => dismiss('rejected'));
}
