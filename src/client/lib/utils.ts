import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}
export function debounce<T extends (...args: any[]) => void>(
	func: T,
	wait: number,
): T {
	let timeout: ReturnType<typeof setTimeout>;
	return ((...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	}) as T;
}
