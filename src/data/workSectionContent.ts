export interface WorkProject {
  readonly id: string;
  readonly name: string;
  readonly videoUrl?: string;
  readonly posterUrl?: string;
  readonly accent?: string;
  readonly year?: number;
  readonly role?: string;
}

export const WORK_TITLE = 'Selected Projects';

export const WORK_PROJECTS: readonly WorkProject[] = [
  {
    id: 'aperture',
    name: 'Aperture Labs',
    accent: '#1c4a8b',
    year: 2025,
    role: 'Product surfaces',
  },
  {
    id: 'northline',
    name: 'Northline',
    accent: '#0f5c4a',
    year: 2025,
    role: 'Realtime & simulation UX',
  },
  {
    id: 'helio',
    name: 'Helio',
    accent: '#a4630e',
    year: 2024,
    role: 'Fintech design systems',
  },
  {
    id: 'lumen',
    name: 'Lumen',
    accent: '#7e2d6e',
    year: 2024,
    role: 'Health portal',
  },
  {
    id: 'noocap',
    name: 'NOOCAP',
    accent: '#0e2c64',
    year: 2024,
    role: 'AI for creators',
  },
  {
    id: 'meridian',
    name: 'Meridian',
    accent: '#3b1d54',
    year: 2023,
    role: 'Editorial cinema',
  },
];
