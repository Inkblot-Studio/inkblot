export interface WorkProject {
  readonly id: string;
  readonly name: string;
  readonly discipline: string;
  readonly bgColor: string;
  readonly accentColor: string;
}

export const WORK_PROJECTS: readonly WorkProject[] = [
  {
    id: 'aperture',
    name: 'Aperture Labs',
    discipline: 'Product surfaces',
    bgColor: '#0b1623',
    accentColor: '#163352',
  },
  {
    id: 'northline',
    name: 'Northline',
    discipline: 'Realtime & simulation UX',
    bgColor: '#081a14',
    accentColor: '#0c3325',
  },
  {
    id: 'helio',
    name: 'Helio',
    discipline: 'Fintech design systems',
    bgColor: '#18100a',
    accentColor: '#3a2108',
  },
  {
    id: 'lumen',
    name: 'Lumen',
    discipline: 'Health portals',
    bgColor: '#14091a',
    accentColor: '#2b0e40',
  },
];
