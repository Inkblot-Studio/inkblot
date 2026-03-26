/**
 * Stub “Ask me anything” — wire to your API when ready (env-gated key).
 */
export function initPortfolioChat(formId = 'journey-chat-form'): void {
  const form = document.getElementById(formId) as HTMLFormElement | null;
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="q"]');
    const q = input?.value?.trim() ?? '';
    if (!q) return;

    const endpoint = import.meta.env.VITE_PORTFOLIO_CHAT_URL as string | undefined;
    if (endpoint) {
      void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      }).catch(() => {});
    } else {
      console.info('[Inkblot] Portfolio chat stub — query:', q);
    }
    if (input) input.value = '';
  });
}
