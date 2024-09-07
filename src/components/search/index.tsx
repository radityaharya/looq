import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { debounce } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppType } from "functions/api/[[route]]";
import {
	autoCompleteResponseSchema,
	autocompleteSchema,
	type searchDataResponseSchema,
	searchResultSchema,
	searchSchema,
} from "functions/api/[[route]]";
import { InferRequestType, InferResponseType, hc } from "hono/client";
import { ExternalLink, HistoryIcon, SearchIcon, Star } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { isLocal } from "src/lib/env";
import type { z } from "zod";

const RightColumn: React.FC<{
	data: z.infer<typeof searchDataResponseSchema>;
}> = ({ data }) => {
	return (
		<Card className="bg-card shadow-lg border-primary/10">
			<CardHeader className="bg-primary/5 border-b border-primary/10">
				<CardTitle className="flex items-center text-lg font-bold">
					Looq Summary
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				{data.infoboxes?.map((infobox, index) => (
					<div key={infobox.infobox} className="mb-6">
						<h3 className="font-semibold mb-2 text-sm">{infobox.infobox}</h3>
						<p className="text-sm mb-4">{infobox.content}</p>
						<div className="flex flex-wrap gap-2">
							{infobox.urls.map((url, urlIndex) => (
								<a
									key={url.url}
									href={url.url}
									target="_blank"
									rel="noopener noreferrer"
									className="text-xs text-primary hover:underline"
								>
									{url.title}
								</a>
							))}
						</div>
					</div>
				))}
				<h3 className="font-semibold mb-3 text-sm">Related Searches</h3>
				<div className="flex flex-wrap gap-2">
					{data.suggestions?.map((suggestion, index) => (
						<Badge
							key={suggestion}
							variant="outline"
							className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px]"
						>
							{suggestion}
						</Badge>
					))}
				</div>
			</CardContent>
		</Card>
	);
};

const RightColumnSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
	return (
		<Card className="bg-card shadow-lg border-primary/10">
			<CardHeader className="bg-primary/5 border-b border-primary/10">
				<CardTitle className="flex items-center text-lg font-bold">
					Looq Summary
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				{Array.from({ length: count }).map((_, index) => (
					<div key={index} className="mb-6">
						<Skeleton className="h-5 w-1/2 mb-2" />
						<Skeleton className="h-4 w-3/4 mb-4" />
						<div className="flex flex-wrap gap-2">
							{Array.from({ length: 3 }).map((_, urlIndex) => (
								<Skeleton key={urlIndex} className="h-4 w-1/4" />
							))}
						</div>
					</div>
				))}
				<h3 className="font-semibold mb-3 text-sm">
					<Skeleton className="h-5 w-1/4" />
				</h3>
				<div className="flex flex-wrap gap-2">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton key={index} className="h-4 w-1/4" />
					))}
				</div>
			</CardContent>
		</Card>
	);
};

const SearchResults: React.FC<{
	searchData: z.infer<typeof searchDataResponseSchema>;
}> = ({ searchData }) => {
	return (
		<>
			<p className="text-sm text-neutral-400 mb-6">
				About {searchData.number_of_results} results
			</p>
			{searchData.results.map((result, index) => (
				<div key={result.url.replace(/\W/g, "")} className="mb-6">
					<a
						href={result.url}
						className="text-xl text-white hover:underline flex items-center gap-2"
					>
						{result.title}
						<ExternalLink className="h-4 w-4" />
					</a>
					<div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
						<span>{result.url}</span>
						<Separator orientation="vertical" className="h-3 bg-neutral-700" />
						<TooltipProvider>
							<Tooltip>
								<TooltipTrigger>
									<Badge
										variant="secondary"
										className="text-[10px] bg-neutral-700 text-neutral-300"
									>
										{result.engine}
									</Badge>
								</TooltipTrigger>
								<TooltipContent>
									<p>Found by: {result.engines.join(", ")}</p>
								</TooltipContent>
							</Tooltip>
						</TooltipProvider>
						<Separator orientation="vertical" className="h-3 bg-neutral-700" />
						<span className="flex items-center">
							<Star className="h-3 w-3 mr-1 fill-yellow-500 text-yellow-500" />
							{result.score.toFixed(2)}
						</span>
						<Separator orientation="vertical" className="h-3 bg-neutral-700" />
						<Badge
							variant="outline"
							className="text-[10px] border-neutral-700 text-neutral-300"
						>
							{result.category}
						</Badge>
					</div>
					<p className="mt-2 text-sm text-neutral-300">{result.content}</p>
				</div>
			))}
		</>
	);
};

const SearchResultsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
	return (
		<>
			{Array.from({ length: count }).map((_, index) => (
				<div key={index} className="mb-6 w-full">
					<Skeleton className="h-6 w-3/4 mb-2" />
					<div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
						<Skeleton className="h-4 w-1/4" />
						<Skeleton className="h-4 w-1/12" />
						<Skeleton className="h-4 w-1/6" />
						<Skeleton className="h-4 w-1/12" />
						<Skeleton className="h-4 w-1/6" />
					</div>
					<Skeleton className="h-4 w-full mt-2" />
					<Skeleton className="h-4 w-5/6 mt-1" />
				</div>
			))}
		</>
	);
};

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
			<Command
				shouldFilter={false}
				className="border border-primary/10"
			>
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

	const API_URL = isLocal ? "http://localhost:8787" : "/";
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

	const {
		data: searchData,
		isLoading,
		refetch,
		error,
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
			return res.json();
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
							<RightColumn data={searchData} />
						</div>
					</div>
				) : error ? (
					<div className="h-full w-full">
            <p className="font-bold text-sm text-neutral-400/70">An error occurred</p>
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
