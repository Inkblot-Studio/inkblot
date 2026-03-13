import { useEffect, useState } from 'react';

export function useScrollProgress() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const onScroll = () => {
			const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
			const next = scrollHeight <= 0 ? 0 : Math.min(window.scrollY / scrollHeight, 1);
			setProgress(next);
		};

		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
	}, []);

	return progress;
}
