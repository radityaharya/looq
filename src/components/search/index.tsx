import { debounce } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import type { searchDataResponseSchema } from "@/lib/search";
import type React from "react";
import { useCallback, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { SSE } from "sse.js";
import type { z } from "zod";
import Eyeball from "../ui/eyeball";
import { RightColumn, RightColumnSkeleton } from "./rightColumn";
import { SearchResults, SearchResultsSkeleton } from "./searchResults";
import { SearchBar } from "./searchBar";
import useLocalStorageState from "src/hooks/use-localstorage-state";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "../ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown } from "lucide-react";
import { client } from "src/api";

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
					role="combobox"
					aria-expanded={open}
					size={"sm"}
					className="w-56 justify-between border-2 border-primary/10 flex gap-1 text-xs"
				>
					<span className="truncate">{selectedModel.split("/")[1]}</span>
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

const useDebouncedSearch = (searchQuery: string, delay: number) => {
	const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

	const debouncedSearch = useMemo(
		() => debounce((query) => setDebouncedQuery(query), delay),
		[delay],
	);

	useEffect(() => {
		debouncedSearch(searchQuery);
	}, [searchQuery, debouncedSearch]);

	return debouncedQuery;
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
	const [isManualLoading, setIsManualLoading] = useState(false);
	const [isStreamingSummary, setStreamingSummary] = useState(false);
	const [models, setModels] = useState<string[]>([]);

	const [searchHistory, setSearchHistory] = useLocalStorageState<string[]>(
		"searchHistory",
		[],
	);
	const [selectedModel, setSelectedModel] = useLocalStorageState<string>(
		"selectedModel",
		"groq/llama-3.1-70b-versatile",
	);
	const debouncedQuery = useDebouncedSearch(searchQuery, 1000);
	const { autocompleteData, handleAutocomplete } = useAutocomplete(client);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const fetchModels = async () => {
			const res = await client.api.models.$get();
			const data = await res.json();
			setModels(
				data.data
					.map((model: any) => model.id)
					.sort((a: string, b: string) => b.localeCompare(a)),
			);
			setSelectedModel(selectedModel);
		};
		fetchModels();
	}, []);

	const streamSummary = useCallback(
		async (data: z.infer<typeof searchDataResponseSchema>) => {
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
				});

				source.stream();
			} catch (error) {
				console.error("Error initializing SSE:", error);
			}
		},
		[selectedModel],
	);

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
				query: { q: debouncedQuery, time_range: timeRange },
			});
			if (res.status !== 200) {
				throw new Error(`status_code ${res.status}`);
			}
			setSearchHistory((prev) => {
				const newHistory = prev.filter((item) => item !== debouncedQuery);
				if (!newHistory.includes(debouncedQuery)) {
					newHistory.unshift(debouncedQuery);
				}
				return newHistory.slice(0, 5);
			});
			const data = (await res.json()) as z.infer<
				typeof searchDataResponseSchema
			>;
			streamSummary(data);
			setIsManualLoading(false);
			return data;
		},
		enabled: !!debouncedQuery && debouncedQuery.length > 0,
		refetchOnWindowFocus: false,
	});

	useEffect(() => {
		if (isLoading) {
			setIsManualLoading(true);
		}
	}, [isLoading]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		const fetchData = async () => {
			if (debouncedQuery.length > 0) {
				setIsManualLoading(true);
				await refetch();
				setIsManualLoading(false);
			}
		};

		fetchData();
	}, [timeRange, debouncedQuery]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
	useEffect(() => {
		if (searchData && searchData.results.length > 0) {
			streamSummary(searchData);
		}
	}, [selectedModel]);

	const handleType = useCallback(
		(query: string) => {
			setSearchQuery(query);
			handleAutocomplete(query);
		},
		[handleAutocomplete],
	);

	useEffect(() => {
		setSearchParams({ q: searchQuery });
	}, [searchQuery, setSearchParams]);

	return (
		<div className="min-h-screen text-foreground flex flex-col">
			<main className="flex-grow flex flex-col items-start mx-4 sm:mx-24 py-12">
				<Header />
				<div className="flex flex-col sm:flex-row w-full">
					<div
						className={`w-full transition-all ${
							searchQuery.length === 0 ||
							isLoading ||
							!searchData ||
							searchData.results.length === 0
								? "w-full"
								: "sm:w-2/3 mr-8"
						}`}
					>
						<SearchBar
							searchQuery={searchQuery}
							setSearchQuery={setSearchQuery}
							handleType={handleType}
							autocompleteData={
								autocompleteData.length > 0
									? { type: "autocomplete", data: autocompleteData }
									: { type: "history", data: searchHistory }
							}
							handleSearch={(query) => {
								if (query.length > 0) {
									setSearchQuery(query);
									refetch();
								}
							}}
							isFocused={isFocused}
							setIsFocused={setIsFocused}
						/>
						<div className="flex flex-row mt-2 gap-2 mb-4">
							<ModelsDropdown
								models={models}
								selectedModel={selectedModel}
								setSelectedModel={setSelectedModel}
							/>
							<TimeRangeDropdown
								timeRange={timeRange}
								setTimeRange={setTimeRange}
							/>
						</div>
						<div className="flex sm:hidden mb-4">
							{isManualLoading ? (
								<RightColumnSkeleton />
							) : searchData && searchData.results.length > 0 ? (
								<RightColumn
									isStreamingSummary={isStreamingSummary}
									data={searchData}
									summary={summary}
									queryHandler={handleType}
								/>
							) : null}
						</div>

						{isManualLoading ? (
							<SearchResultsSkeleton count={5} />
						) : searchData && searchData.results.length > 0 ? (
							<SearchResults searchData={searchData} />
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
						) : (
							<p className="mt-16 text-sm text-neutral-400/70">
								No results found
							</p>
						)}
					</div>

					<div
						className={`transition-all hidden sm:flex ${
							!searchData ||
							searchQuery.length === 0 ||
							isLoading ||
							searchData.results.length === 0
								? "w-0 opacity-0 invisible"
								: "sm:w-1/3 opacity-100 visible"
						}`}
					>
						{isManualLoading ? (
							<RightColumnSkeleton />
						) : searchData && searchData.results.length > 0 ? (
							<RightColumn
								isStreamingSummary={isStreamingSummary}
								data={searchData}
								summary={summary}
								queryHandler={handleType}
							/>
						) : null}
					</div>
				</div>
			</main>
		</div>
	);
};

export default SearchComponent;
