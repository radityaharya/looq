import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "src/client/lib/components/ui/command";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "src/client/lib/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "src/client/lib/components/ui/popover";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { ArrowUp, ChevronsUpDown } from "lucide-react";
import React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useLocalStorageState from "src/client/hooks/use-localstorage-state";
import { useSearchHistory } from "src/client/hooks/use-search-history";
import { client } from "src/client/lib/api";
import type { searchDataResponseSchema } from "src/common/schema";
import { getUserId, setUserId } from "src/client/lib/user";
import { debounce } from "src/client/lib/utils";
import { SSE } from "sse.js";
import type { z } from "zod";
import { Button } from "../ui/button";
import Eyeball from "../ui/eyeball";
import { Spinner } from "../ui/spinner";
import { RightColumn, RightColumnSkeleton } from "./rightColumn";
import { SearchBar } from "./searchBar";
import { SearchResults, SearchResultsSkeleton } from "./searchResults";

const ModelsDropdown = ({
	models,
	selectedModel,
	setSelectedModel,
}: {
	models: string[];
	selectedModel: string;
	setSelectedModel: (model: string) => void;
}) => {
	const [open, setOpen] = useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: <explanation>
					role="combobox"
					aria-expanded={open}
					size={"sm"}
					className="w-56 justify-between border-2 border-primary/10 flex gap-1 text-xs"
				>
					<span className="truncate">
						{selectedModel.includes("/")
							? selectedModel.split("/")[1]
							: selectedModel}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-0">
				<Command className="w-full">
					<CommandInput placeholder="Search model..." />
					<CommandList>
						<CommandEmpty>No model found.</CommandEmpty>
						<CommandGroup>
							{models.map((model) => (
								<CommandItem
									key={model}
									value={model}
									onSelect={(currentValue) => {
										setSelectedModel(currentValue);
									}}
								>
									{model}
								</CommandItem>
							))}
						</CommandGroup>
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
};

const TimeRangeDropdown = ({
	timeRange,
	setTimeRange,
}: {
	timeRange: string;
	setTimeRange: (timeRange: string) => void;
}) => {
	const timeRangeMap: { [key: string]: string } = {
		"All time": "",
		"Past 24 hours": "day",
		"Past month": "month",
		"Past year": "year",
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="outline"
					// biome-ignore lint/a11y/useSemanticElements: <explanation>
					role="combobox"
					size={"sm"}
					className="w-32 justify-between border-2 border-primary/10 flex gap-1 text-xs"
				>
					<span className="truncate font-base">
						{Object.entries(timeRangeMap).find(
							([_, value]) => value === timeRange,
						)?.[0] || "All time"}
					</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-32 p-0">
				{Object.entries(timeRangeMap).map(([label, value]) => (
					<DropdownMenuItem key={value} onSelect={() => setTimeRange(value)}>
						{label}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

const Header = () => (
	<div className="w-full flex gap-2 items-center mb-8">
		<div className="w-full">
			<div className="flex flex-row gap-1 items-center">
				<Eyeball size={40} />
				<h1 className="text-4xl font-bold mb-2 text-start">Looq</h1>
			</div>
			<p className="text-xs text-neutral-400/50 text-start">
				powered by <span className="font-bold">SearXNG</span>
			</p>
		</div>
	</div>
);

const ScrollToTopButton = () => {
	const [isVisible, setIsVisible] = useState(false);

	const handleScroll = () => {
		if (window.scrollY > window.innerHeight) {
			setIsVisible(true);
		} else {
			setIsVisible(false);
		}
	};

	const handleClick = () => {
		window.scrollTo({ top: 0, behavior: "smooth" });
	};

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		window.addEventListener("scroll", handleScroll);
		return () => {
			window.removeEventListener("scroll", handleScroll);
		};
	}, []);

	return (
		isVisible && (
			<Button
				variant="outline"
				size="sm"
				className="fixed bottom-20 right-4"
				onClick={handleClick}
			>
				<ArrowUp className="h-4 w-4" />
			</Button>
		)
	);
};

const useAutocomplete = (client: any) => {
	const [autocompleteData, setAutocompleteData] = useState<string[]>([]);

	const fetchAutocomplete = async (query: string) => {
		const res = await client.api.autocompleter.$get({ query: { q: query } });
		const data = (await res.json()) as [string, string[]];

		if (Array.isArray(data) && data.length === 2 && Array.isArray(data[1])) {
			setAutocompleteData(data[1]);
		} else {
			setAutocompleteData([]);
		}
	};

	const handleAutocomplete = useCallback(
		debounce((query: string) => fetchAutocomplete(query), 300),
		[],
	);

	return { autocompleteData, handleAutocomplete };
};

type TSummary = {
	content: string;
	sources: string[];
};

const SearchComponent: React.FC = () => {
	const [searchParams, setSearchParams] = useSearchParams();
	const initialQuery = searchParams.get("q") || "";
	const [searchQuery, setSearchQuery] = useState(initialQuery);
	const [timeRange, setTimeRange] = useState("");
	const [isFocused, setIsFocused] = useState(false);
	const [summary, setSummary] = useState<TSummary | null>({
		content: "",
		sources: [],
	});
	const [isStreamingSummary, setStreamingSummary] = useState(false);
	const { history, addToHistory, clearHistory } = useSearchHistory();
	const [selectedModel, setSelectedModel] = useLocalStorageState<string>(
		"selectedModel",
		"llama-3.3-70b-instruct",
	);
	const { autocompleteData, handleAutocomplete } = useAutocomplete(client);
	const bottomRef = useRef<HTMLDivElement>(null);
	const sseRef = useRef<SSE | null>(null);

	const abortStreaming = useCallback(() => {
		if (sseRef.current) {
			sseRef.current.close();
			sseRef.current = null;
			setStreamingSummary(false);
		}
	}, []);

	const { data: models, isLoading: isModelsLoading } = useQuery({
		queryKey: ["models"],
		initialData: [],
		queryFn: async () => {
			const res = await client.api.models.$get();
			if (res.status !== 200) {
				throw new Error(`status_code ${res.status}`);
			}
			const responseData = await res.json();
			return responseData.data
				.map((model: any) => model.id)
				.sort((a: string, b: string) => a.localeCompare(b));
		},
		refetchOnWindowFocus: false,
	});

	const {
		data: searchData,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		isLoading: isSearchLoading,
		refetch,
		error,
	} = useInfiniteQuery({
		queryKey: ["search", searchQuery, timeRange],
		initialPageParam: "1",
		queryFn: async ({ pageParam = "1" }) => {
			const searchParams = {
				q: searchQuery,
				time_range: timeRange,
				pageno: pageParam.toString(),
			};

			const res = await client.api.search.$get(
				{
					query: searchParams,
				},
				{
					headers: {
						"X-User-Id": getUserId(),
					},
				},
			);

			if (res.status !== 200) {
				throw new Error(`status_code ${res.status}`);
			}

			const data = await res.json();

			const userId = res.headers.get("X-User-Id");
			if (userId) {
				setUserId(userId);
			}

			if (pageParam === "1") {
				addToHistory(searchQuery, data.requestId);
			}

			return data;
		},
		getNextPageParam: (lastPage) => String(Number(lastPage.pageno) + 1),
		enabled: false,
		refetchOnWindowFocus: false,
	});

	const streamSummary = useCallback(
		async (data: z.infer<typeof searchDataResponseSchema>) => {
			abortStreaming();

			setSummary(null);
			setStreamingSummary(true);
			try {
				const payload = {
					requestId: data.requestId,
					model: selectedModel,
				};
				const source = new SSE("/api/summary", {
					headers: {
						"Content-Type": "application/json",
					},
					payload: JSON.stringify(payload),
				});

				sseRef.current = source;

				source.addEventListener("ai-response", (event: any) => {
					const data = JSON.parse(event.data);
					setSummary({
						content: data.content,
						sources: [],
					});
				});

				source.addEventListener("ERROR", (event: any) => {
					console.error("Error streaming summary:", event);
					const object = JSON.parse(event.data);
					setSummary({
						content: `An error occurred while fetching the summary\n${object.error}`,
						sources: [],
					});
					setStreamingSummary(false);
					source.close();
					sseRef.current = null;
				});

				source.addEventListener("DONE", (event: any) => {
					const data = JSON.parse(event.data);
					setSummary((prev) => {
						if (prev) {
							return {
								...prev,
								sources: data.sources,
							};
						}
						return prev;
					});
					setStreamingSummary(false);
					source.close();
					sseRef.current = null;
				});

				source.stream();
			} catch (error) {
				console.error("Error initializing SSE:", error);
			}
		},
		[selectedModel, abortStreaming],
	);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (searchData?.pages[0]) {
			streamSummary(searchData.pages[0]);
		}
	}, [selectedModel, searchData?.pages[0], streamSummary]);

	useEffect(() => {
		setSearchParams({ q: searchQuery });
	}, [searchQuery, setSearchParams]);

	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
					fetchNextPage();
				}
			},
			{ rootMargin: "800px" },
		);

		if (bottomRef.current) {
			observer.observe(bottomRef.current);
		}

		return () => observer.disconnect();
	}, [fetchNextPage, hasNextPage, isFetchingNextPage]);

	const handleType = useCallback(
		(query: string) => {
			setSearchQuery(query);
			if (query.trim()) {
				handleAutocomplete(query);
			}
		},
		[handleAutocomplete],
	);

	const handleModelChange = useCallback((model: string) => {
		abortStreaming();
		setSelectedModel(model);
	}, [abortStreaming, setSelectedModel]);

	const handleSearch = useCallback((query?: string) => {
		abortStreaming();
		if (query) {
			setSearchQuery(query);
			handleAutocomplete(query);
			setTimeout(() => refetch(), 0);
		} else if (searchQuery.trim()) {
			refetch();
		}
	}, [searchQuery, refetch, handleAutocomplete, abortStreaming]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (initialQuery) {
			refetch();
		}
	}, []);

	return (
		<div className="min-h-screen text-foreground flex flex-col">
			<main className="flex-grow flex flex-col items-start mx-4 sm:mx-24 py-12">
				<Header />
				<ScrollToTopButton />
				{isFetchingNextPage && (
					<div className="fixed top-4 right-4">
						<Spinner />
					</div>
				)}
				<div className="flex flex-col sm:flex-row w-full">
					<div
						className={`w-full transition-all ${
							searchQuery.length === 0 ||
							isSearchLoading ||
							!searchData ||
							searchData.pages[0].results.length === 0
								? "w-full"
								: "sm:w-2/3 mr-8"
						}`}
					>
						<SearchBar
							searchQuery={searchQuery}
							setSearchQuery={setSearchQuery}
							handleType={handleType}
							autocompleteData={
								searchQuery.trim() && autocompleteData.length > 0
									? { type: "autocomplete", data: autocompleteData }
									: { type: "history", data: history.map((h) => h.query) }
							}
							handleSearch={handleSearch}
							isFocused={isFocused}
							setIsFocused={setIsFocused}
						/>
						<div className="flex flex-row mt-2 gap-2 mb-4">
							<ModelsDropdown
								models={models}
								selectedModel={selectedModel}
								setSelectedModel={handleModelChange}
							/>
							<TimeRangeDropdown
								timeRange={timeRange}
								setTimeRange={setTimeRange}
							/>
						</div>
						<div className="flex sm:hidden mb-4">
							{isSearchLoading ? (
								<RightColumnSkeleton />
							) : searchData && searchData.pages[0].results.length > 0 ? (
								<RightColumn
									isStreamingSummary={isStreamingSummary}
									data={searchData.pages[0]}
									summary={summary}
									handleSearch={handleSearch}
									requestId={searchData.pages[0].requestId ?? ""}
									selectedModel={selectedModel}
								/>
							) : null}
						</div>

						{isSearchLoading ? (
							<SearchResultsSkeleton count={5} />
						) : searchData ? (
							searchData.pages.map((page, i) => (
								<React.Fragment key={i}>
									<SearchResults searchData={page} />
								</React.Fragment>
							))
						) : error ? (
							<div className="h-full w-full">
								<p className="font-bold text-sm text-neutral-400/70">
									An error occurred
								</p>
								<p className="text-sm text-neutral-400/70">{`Error: ${error.message}`}</p>
							</div>
						) : searchQuery.length <= 0 ? (
							<p className="mt-16 text-sm text-neutral-400/70">
								Press <span className="font-bold font-mono">Enter</span> to
								search
							</p>
						) : null}
						<div ref={bottomRef} />
					</div>

					<div
						className={`transition-all hidden sm:flex ${
							!searchData ||
							searchQuery.length === 0 ||
							isSearchLoading ||
							searchData.pages[0].results.length === 0
								? "w-0 opacity-0 invisible"
								: "sm:w-1/3 opacity-100 visible"
						}`}
					>
						{isSearchLoading ? (
							<RightColumnSkeleton />
						) : searchData && searchData.pages[0].results.length > 0 ? (
							<RightColumn
								isStreamingSummary={isStreamingSummary}
								data={searchData.pages[0]}
								summary={summary}
								handleSearch={handleSearch}
								requestId={searchData.pages[0].requestId ?? ""}
								selectedModel={selectedModel}
							/>
						) : null}
					</div>
				</div>
			</main>
		</div>
	);
};

export default SearchComponent;
