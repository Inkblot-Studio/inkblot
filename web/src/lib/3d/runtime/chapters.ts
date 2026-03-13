export type WorldChapter = {
	id: string;
	label: string;
	title: string;
	copy: string;
	z: number;
};

export const worldChapters: WorldChapter[] = [
	{
		id: 'reframe',
		label: 'Chapter 01',
		title: 'Reframe the operating model',
		copy: 'Replace fragmented workflows with one guided execution layer.',
		z: 0,
	},
	{
		id: 'orchestrate',
		label: 'Chapter 02',
		title: 'Orchestrate every critical flow',
		copy: 'Route tasks, approvals, and outcomes through adaptive agent logic.',
		z: -8,
	},
	{
		id: 'scale',
		label: 'Chapter 03',
		title: 'Scale with quality control',
		copy: 'Keep speed, reliability, and visibility aligned as complexity grows.',
		z: -16,
	},
];
