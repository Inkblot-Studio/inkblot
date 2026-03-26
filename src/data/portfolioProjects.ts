export interface PortfolioProject {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly category: 'websites' | 'installations' | 'xr' | 'realtime' | 'tools' | 'all';
  /** Optional image URL for tile interior */
  readonly imageSrc?: string;
  readonly videoSrc?: string;
}

export const PORTFOLIO_PROJECTS: PortfolioProject[] = [
  {
    id: 'citron-suite',
    title: 'CITRON SUITE',
    subtitle: 'Internal tools · Creative + business OS',
    category: 'tools',
  },
  {
    id: 'realtime-brand',
    title: 'BRAND WORLDS',
    subtitle: 'Realtime WebGL · Launch films',
    category: 'realtime',
  },
  {
    id: 'xr-lab',
    title: 'IMMERSIVE LABS',
    subtitle: 'XR / VR / AI prototypes',
    category: 'xr',
  },
  {
    id: 'b2b-pipelines',
    title: 'ENTERPRISE AI',
    subtitle: 'Custom systems · Local compute',
    category: 'websites',
  },
];
