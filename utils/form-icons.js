export function svgIcon(inner, color = '#111', fill = 'none') {
	const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`
	return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export const formIcons = {
	user: svgIcon('<circle cx="12" cy="8.5" r="3.5" fill="#111" stroke="none"/><path d="M5 20c0-3.5 3.5-6.5 7-6.5s7 3 7 6.5" fill="#111" stroke="none"/>'),
	lock: svgIcon('<rect x="7.5" y="11" width="9" height="7.5" rx="1.5" fill="#111" stroke="none"/><path d="M9 11V8.5a3 3 0 116 0V11" fill="none" stroke="#111" stroke-width="2"/>'),
	id: svgIcon('<rect x="4" y="6" width="16" height="12" rx="2" fill="#111" stroke="none"/><circle cx="9" cy="11" r="2" fill="#111" stroke="none"/><path d="M13 10h5M13 14h5" stroke="#111"/>')
}
