export type RendererMode = 'webgl' | 'webgpu-experimental';

export function getRequestedRendererMode(): RendererMode {
	if (typeof window === 'undefined') return 'webgl';
	const params = new URLSearchParams(window.location.search);
	return params.get('renderer') === 'webgpu' ? 'webgpu-experimental' : 'webgl';
}

export function canUseWebGpuExperimental(): boolean {
	if (typeof window === 'undefined') return false;
	const nav = navigator as Navigator & { gpu?: unknown };
	return Boolean(nav.gpu);
}

export function resolveRendererMode(): RendererMode {
	const requested = getRequestedRendererMode();
	if (requested === 'webgpu-experimental' && canUseWebGpuExperimental()) {
		return 'webgpu-experimental';
	}
	return 'webgl';
}
