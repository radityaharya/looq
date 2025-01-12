import { useCallback } from "react";
import useLocalStorageState from "./use-localstorage-state";
import { getUserId } from "src/lib/user";

export interface SearchHistoryItem {
  query: string;
  requestId: string;
  timestamp: number;
}

export function useSearchHistory(maxItems: number = 10) {
  const userId = getUserId();
  const storageKey = `searchHistory_${userId}`;

  const [history, setHistory] = useLocalStorageState<SearchHistoryItem[]>(
    storageKey,
    []
  );

  const addToHistory = useCallback(
    (query: string, requestId: string) => {
      setHistory((prev) => {
        const newItem: SearchHistoryItem = {
          query,
          requestId,
          timestamp: Date.now(),
        };

        // Remove duplicates and add new item at the start
        const filteredHistory = prev.filter((item) => item.query !== query);
        return [newItem, ...filteredHistory].slice(0, maxItems);
      });
    },
    [setHistory, maxItems]
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
