import { useCallback } from "react";
import { getUserId } from "src/lib/user";
import useLocalStorageState from "./use-localstorage-state";

export interface SearchHistoryItem {
	query: string;
	requestId: string;
	timestamp: number;
}

export function useSearchHistory(maxItems = 10) {
	const userId = getUserId();
	const storageKey = `searchHistory_${userId}`;

	const [history, setHistory] = useLocalStorageState<SearchHistoryItem[]>(
		storageKey,
		[],
	);

	const addToHistory = useCallback(
		(query: string, requestId: string) => {
			setHistory((prev) => {
				const newItem: SearchHistoryItem = {
					query,
					requestId,
					timestamp: Date.now(),
				};

				const filteredHistory = prev.filter((item) => item.query !== query);
				return [newItem, ...filteredHistory].slice(0, maxItems);
			});
		},
		[setHistory, maxItems],
	);

	const clearHistory = useCallback(() => {
		setHistory([]);
	}, [setHistory]);

	return {
		history,
		addToHistory,
		clearHistory,
	};
}
