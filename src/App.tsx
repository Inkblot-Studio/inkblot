import { AnimatePresence } from 'framer-motion';
import { useEffect } from 'react';
import { BrowserRouter, useLocation, useNavigate } from 'react-router-dom';

import { AnalyticsRouteTracker } from '@/analytics/AnalyticsRouteTracker';
import { registerContactRouteNavigate } from '@/navigation/contactRouteBridge';

import { WebGLHost } from './WebGLHost';
import { ContactPage } from './ui/contact/ContactPage';
import { PrivacyAndCookiesPage } from './ui/legal/PrivacyAndCookiesPage';

function ContactRouteRegister() {
  const navigate = useNavigate();
  useEffect(() => {
    registerContactRouteNavigate(navigate);
  }, [navigate]);
  return null;
}

function ContactNavExpandSync() {
  const { pathname } = useLocation();
  useEffect(() => {
    const el = document.getElementById('nav-link-contact');
    if (el) {
      el.setAttribute('aria-expanded', pathname === '/contact' ? 'true' : 'false');
    }
  }, [pathname]);
  return null;
}

function OverlayRoutes() {
  const { pathname } = useLocation();
  return (
    <AnimatePresence mode="wait" initial={false}>
      {pathname === '/contact' && <ContactPage key="inkblot-contact" />}
      {pathname === '/privacy-and-cookies' && <PrivacyAndCookiesPage key="inkblot-privacy" />}
    </AnimatePresence>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <ContactRouteRegister />
      <ContactNavExpandSync />
      <AnalyticsRouteTracker />
      <WebGLHost />
      <OverlayRoutes />
    </BrowserRouter>
  );
}
