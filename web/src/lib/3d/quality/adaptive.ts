export type QualityTier = 'ultra' | 'high' | 'balanced' | 'safe';

export type RuntimeQuality = {
	tier: QualityTier;
	pixelRatio: number;
	nodeCount: number;
	particleCount: number;
	effectStrength: number;
};

export function detectInitialQualityTier(): QualityTier {
	if (typeof window === 'undefined') return 'balanced';

	const cores = navigator.hardwareConcurrency ?? 4;
	const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 4;
	const dpr = window.devicePixelRatio || 1;

	if (cores >= 12 && memory >= 8 && dpr <= 2) return 'ultra';
	if (cores >= 8 && memory >= 6) return 'high';
	if (cores >= 4 && memory >= 4) return 'balanced';
	return 'safe';
}

export function getRuntimeQuality(tier: QualityTier): RuntimeQuality {
	switch (tier) {
		case 'ultra':
			return { tier, pixelRatio: 1.5, nodeCount: 46, particleCount: 1200, effectStrength: 1 };
		case 'high':
			return { tier, pixelRatio: 1.3, nodeCount: 34, particleCount: 850, effectStrength: 0.8 };
		case 'balanced':
			return { tier, pixelRatio: 1.1, nodeCount: 24, particleCount: 520, effectStrength: 0.6 };
		case 'safe':
			return { tier, pixelRatio: 1, nodeCount: 14, particleCount: 220, effectStrength: 0.35 };
	}
}

export function degradeTier(current: QualityTier): QualityTier {
	if (current === 'ultra') return 'high';
	if (current === 'high') return 'balanced';
	return 'safe';
}
