import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { analyticsPageView } from '@/analytics/googleAnalytics';

/**
 * Sends GA4 virtual page views on SPA navigations when analytics is allowed.
 */
export function AnalyticsRouteTracker() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    analyticsPageView(`${pathname}${search}`, document.title);
  }, [pathname, search]);

  return null;
}
