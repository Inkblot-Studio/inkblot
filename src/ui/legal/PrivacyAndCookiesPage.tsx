import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useLayoutEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import './PrivacyAndCookiesPage.css';

const EASE = [0.25, 0.48, 0.35, 0.99] as const;

export function PrivacyAndCookiesPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  useEffect(() => {
    const prev = document.title;
    document.title = 'Privacy & cookies | Inkblot Studio';
    return () => {
      document.title = prev;
    };
  }, []);

  useLayoutEffect(() => {
    document.body.classList.add('contact-page-open');
    document.body.style.overflow = 'hidden';
    const y0 = window.scrollY || document.documentElement.scrollTop || 0;
    if (y0 > 2) {
      const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: instant ? 'auto' : 'smooth' });
    }
    return () => {
      document.body.classList.remove('contact-page-open');
      if (!document.body.classList.contains('site-drawer-open')) {
        document.body.style.removeProperty('overflow');
      }
    };
  }, []);

  const onClose = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/', { replace: true });
    }
  };

  return (
    <motion.div
      className="privacy-page"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-page-title"
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
      transition={
        reduce
          ? { duration: 0.12 }
          : { duration: 0.28, ease: EASE as [number, number, number, number] }
      }
    >
      <div className="privacy-page__backdrop" aria-hidden="true" />
      <article className="privacy-page__panel">
        <div className="privacy-page__inner">
          <p className="privacy-page__kicker">Legal</p>
          <h1 id="privacy-page-title" className="privacy-page__title">
            Privacy &amp; cookies
          </h1>
          <p className="privacy-page__updated">Last updated: 25 April 2026</p>

          <section className="privacy-page__section" aria-labelledby="privacy-overview">
            <h2 id="privacy-overview">Overview</h2>
            <p>
              This page describes how Inkblot Studio uses cookies, browser storage, and optional
              analytics on this website. We keep the site usable without optional tracking: you can
              choose “Essential only” and still browse normally.
            </p>
          </section>

          <section className="privacy-page__section" aria-labelledby="privacy-controller">
            <h2 id="privacy-controller">Who we are</h2>
            <p>
              The site is operated by <strong>Inkblot Studio</strong> (Inkblot Studio Ltd.). Contact:{' '}
              <a href="mailto:ai.support@inkblotstudio.eu">ai.support@inkblotstudio.eu</a>
              {', '}
              <a href="tel:+359882797806">+359 882 797 806</a>.
            </p>
          </section>

          <section className="privacy-page__section" aria-labelledby="privacy-essential">
            <h2 id="privacy-essential">Essential storage</h2>
            <p>
              When you respond to the cookie notice, we store your choice in{' '}
              <strong>local storage</strong> under the key <code>inkblot-consent-v2</code>. That record
              includes whether you allowed optional analytics and an ISO timestamp. This is
              necessary to remember your preference and avoid showing the banner on every visit.
            </p>
            <p>
              Clearing site data or using a different browser will reset this preference until you
              choose again.
            </p>
          </section>

          <section className="privacy-page__section" aria-labelledby="privacy-analytics">
            <h2 id="privacy-analytics">Optional analytics (Google Analytics 4)</h2>
            <p>
              If you click <strong>Allow analytics</strong>, we may load <strong>Google Analytics 4</strong>{' '}
              (via Google Tag) using the measurement ID configured for this deployment. That helps us
              understand aggregate traffic (for example, which pages are viewed and how navigation
              works in our single-page app).
            </p>
            <ul>
              <li>
                We request <strong>IP anonymisation</strong> and turn off Google Signals / ad
                personalisation flags in the configuration we send to GA4.
              </li>
              <li>
                GA4 may set or update <strong>first-party cookies</strong> on this hostname as part of
                normal operation. See Google’s documentation for details.
              </li>
              <li>
                If no measurement ID is configured in the build environment, analytics code does not
                load even after you opt in.
              </li>
            </ul>
            <p>
              Google’s privacy information:{' '}
              <a href="https://policies.google.com/privacy" rel="noreferrer" target="_blank">
                policies.google.com/privacy
              </a>
              .
            </p>
          </section>

          <section className="privacy-page__section" aria-labelledby="privacy-withdraw">
            <h2 id="privacy-withdraw">Changing or withdrawing consent</h2>
            <p>
              To stop optional analytics, clear stored data for this site (including{' '}
              <code>inkblot-consent-v2</code>) or use your browser’s controls to remove local
              storage. The cookie notice will appear again on your next visit so you can choose
              “Essential only”.
            </p>
          </section>

          <section className="privacy-page__section" aria-labelledby="privacy-more">
            <h2 id="privacy-more">Other processing</h2>
            <p>
              If you use our contact form or email links, those messages are handled according to
              the information you provide in that channel. This policy focuses on the public
              marketing site and the technologies listed above.
            </p>
          </section>

          <div className="privacy-page__actions">
            <button type="button" className="privacy-page__btn" onClick={onClose}>
              Back
            </button>
            <Link className="privacy-page__btn privacy-page__btn--ghost" to="/">
              Home
            </Link>
          </div>
        </div>
      </article>
    </motion.div>
  );
}
