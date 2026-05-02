/**
 * Contact form dry-run is opt-in only. Set `VITE_CONTACT_FORM_DRY_RUN=true`
 * locally when tuning UI/UX so submissions validate without calling Web3Forms.
 *
 * `VITE_CONTACT_FORM_DRY_RUN` in .env, when set, overrides this file (`"true"` / `"false"`).
 */
const LOCAL_DRY_RUN = false;

const env = import.meta.env.VITE_CONTACT_FORM_DRY_RUN;
export const contactFormDryRun: boolean =
  env !== undefined && env !== '' ? env === 'true' : LOCAL_DRY_RUN;
