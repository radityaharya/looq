import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { debounce } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { AppType } from "functions/api/[[route]]";
import type { searchDataResponseSchema } from "functions/api/[[route]]";
import { hc } from "hono/client";
import { HistoryIcon, SearchIcon } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
// import { isLocal } from "src/lib/env";
import type { z } from "zod";
import { SSE } from "sse.js";
import { RightColumn, RightColumnSkeleton } from "./rightColumn";
import { SearchResults, SearchResultsSkeleton } from "./searchResults";

const SearchBar = ({
	searchQuery,
	setSearchQuery,
	handleType,
	autocompleteData,
	handleSearch,
	isFocused,
	setIsFocused,
}: {
	searchQuery: string;
	setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
	handleType: (query: string) => void;
	autocompleteData: { type: string; data: string[] };
	handleSearch: (query: string) => void;
	isFocused: boolean;
	setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" && searchQuery === "") {
				inputRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [searchQuery]);

	return (
		<div className="bg-card/50 relative w-full mb-8">
			<Command shouldFilter={false} className="border border-primary/10">
				<CommandInput
					ref={inputRef}
					placeholder="Search..."
					value={searchQuery}
					onValueChange={(query) => handleType(query)}
					onFocus={() => setIsFocused(true)}
					onBlur={() => setIsFocused(false)}
					onKeyUp={(e) => {
						if (isFocused && e.key === "Enter" && searchQuery.length > 0) {
							handleSearch(searchQuery);
						}
					}}
				/>
				<CommandList>
					<CommandGroup
						heading={
							autocompleteData.type === "autocomplete"
								? "Suggestions"
								: "History"
						}
					>
						{autocompleteData?.data.map((suggestion, index) => (
							<CommandItem
								key={suggestion}
								onSelect={() => setSearchQuery(suggestion)}
								onClick={() => handleSearch(suggestion)}
							>
								{autocompleteData.type === "autocomplete" ? (
									<SearchIcon className="mr-2 h-4 w-4" />
								) : (
									<HistoryIcon className="mr-2 h-4 w-4" />
								)}
								<span>{suggestion}</span>
							</CommandItem>
						))}
					</CommandGroup>
				</CommandList>
			</Command>
		</div>
	);
};

const SearchComponent: React.FC = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const initialQuery = searchParams.get("q") || "";
	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [autocompleteData, setAutocompleteData] = useState<string[]>([]);
	const [isFocused, setIsFocused] = useState(false);
	const [summary, setSummary] = useState<string | null>(null);

	// const API_URL = isLocal ? "http://localhost:8787" : "/";
	const client = hc<AppType>("/");

	const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

	const debouncedSearch = useCallback(
		debounce((query) => setDebouncedQuery(query), 300),
		[],
	);

	useEffect(() => {
		debouncedSearch(searchQuery);
	}, [searchQuery, debouncedSearch]);

	const getSearchHistory = () => {
		const history = localStorage.getItem("searchHistory");
		return history ? JSON.parse(history) : [];
	};

	const updateSearchHistory = (query: string) => {
		const history = getSearchHistory();
		if (!history.includes(query)) {
			const updatedHistory = [query, ...history].slice(0, 8);
			localStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
		}
	};

	const streamSummary = async (
		data: z.infer<typeof searchDataResponseSchema>,
	) => {
		setSummary(null); // Clear the summary state

		try {
			const payload = {
				query: searchQuery,
				urls: data.results.map((result) => result.url),
			};
			const source = new SSE("/api/summary", {
				headers: {
					"Content-Type": "application/json",
				},
				payload: JSON.stringify(payload),
			});

			source.addEventListener("ai-response", (event: any) => {
				const data = JSON.parse(event.data);
				setSummary(data.content);
			});

			source.addEventListener("error", (event: any) => {
				console.error("Error streaming summary:", error);
				source.close();
			});

			source.stream();
		} catch (error) {
			console.error("Error initializing SSE:", error);
		}
	};

	const {
		data: searchData,
		isLoading,
		refetch,
		error,
		isSuccess,
	} = useQuery({
		queryKey: ["search", debouncedQuery],
		queryFn: async () => {
			const res = await client.api.search.$get({
				query: { q: debouncedQuery },
			});
			if (res.status !== 200) {
				throw new Error(`status_code ${res.status}`);
			}
			updateSearchHistory(debouncedQuery);
			const data = (await res.json()) as z.infer<
				typeof searchDataResponseSchema
			>;
			streamSummary(data);
			return data;
		},
		enabled: !!debouncedQuery,
		refetchOnWindowFocus: false,
	});

	const fetchAutocomplete = async (query: string) => {
		const res = await client.api.autocompleter.$get({ query: { q: query } });
		const data = (await res.json()) as [string, string[]];

		if (Array.isArray(data) && data.length === 2 && Array.isArray(data[1])) {
			setAutocompleteData(data[1]);
		} else {
			setAutocompleteData([]);
		}
	};

	const handleAutocomplete = (query: string) => {
		fetchAutocomplete(query);
	};

	const debouncedAutocomplete = useCallback(
		debounce(handleAutocomplete, 300),
		[],
	);

	const handleType = (query: string) => {
		setSearchQuery(query);
		debouncedAutocomplete(query);
	};

	useEffect(() => {
		setSearchParams({ q: searchQuery });
	}, [searchQuery, setSearchParams]);

	return (
		<div className="min-h-screen text-foreground flex flex-col">
			<main className="flex-grow flex flex-col items-start mx-2 sm:mx-24 py-12">
				<h1 className="text-4xl font-bold mb-2 text-center">Looq</h1>
				<p className="text-xs text-neutral-400/50 mb-8 text-center">
					powered by <span className="font-bold">SearXNG</span>
				</p>

				<SearchBar
					searchQuery={searchQuery}
					setSearchQuery={setSearchQuery}
					handleType={handleType}
					autocompleteData={
						autocompleteData.length > 0
							? { type: "autocomplete", data: autocompleteData }
							: { type: "history", data: getSearchHistory() }
					}
					handleSearch={(query) => {
						setSearchQuery(query);
						refetch();
					}}
					isFocused={isFocused}
					setIsFocused={setIsFocused}
				/>
				{isLoading ? (
					<div className="flex flex-col-reverse sm:flex-row w-full gap-8">
						<div className="w-full sm:w-2/3">
							<SearchResultsSkeleton count={5} />
						</div>

						<div className="w-full sm:w-1/3">
							<RightColumnSkeleton />
						</div>
					</div>
				) : searchQuery.length === 0 ? (
					<p className="mt-16 text-sm text-neutral-400/70">
						Press <kbd>Enter</kbd> to search
					</p>
				) : searchData ? (
					<div className="flex flex-col-reverse sm:flex-row w-full gap-8">
						<div className="w-full sm:w-2/3">
							<SearchResults searchData={searchData} />
						</div>

						<div className="w-full sm:w-1/3">
							<RightColumn data={searchData} summary={summary} />
						</div>
					</div>
				) : error ? (
					<div className="h-full w-full">
						<p className="font-bold text-sm text-neutral-400/70">
							An error occurred
						</p>
						<p className="text-sm text-neutral-400/70">
							{`Error: ${error.message}`}
						</p>
					</div>
				) : (
					<p className="mt-16 text-sm text-neutral-400/70">No results found</p>
				)}
			</main>
		</div>
	);
};

export default SearchComponent;
