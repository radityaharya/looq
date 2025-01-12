import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { HistoryIcon, SearchIcon, Search } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { FlatCard } from "../ui/flat-card";
import { Button } from "../ui/button";
import useLocalStorageState from "src/hooks/use-localstorage-state";
import { Skeleton } from "@/components/ui/skeleton";

// delete search history from local storage
const clearHistoryButton = () => {
	const [searchHistory, setSearchHistory] = useLocalStorageState<string[]>(
		"searchHistory",
		[],
	);
	const clearHistory = () => {
		setSearchHistory([]);
	};

	return (
		<Button onClick={clearHistory} size={"sm"} variant={"outline"} className="">
			Clear
		</Button>
	);
};

export const SearchBar = ({
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

	autocompleteData.data = autocompleteData.data
		.filter((suggestion) => suggestion !== "")
		.slice(0, 5);

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
		<div className="bg-card/50 relative w-full rounded-none">
			<FlatCard className="w-full">
				<Command
					shouldFilter={false}
					className="border border-primary/10 rounded-none w-full"
				>
					<div className="flex w-full">
						<CommandInput
							ref={inputRef}
							placeholder="Search..."
							className="rounded-none flex-1"
							value={searchQuery}
							onValueChange={(query) => handleType(query)}
							onFocus={() => setIsFocused(true)}
							onBlur={() => setIsFocused(false)}
							onKeyDown={(e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									if (searchQuery.length > 0) {
										handleSearch(searchQuery);
									}
								}
							}}
						/>
						<Button 
							variant="ghost"
							size="icon"
							onClick={() => handleSearch(searchQuery)}
							className="mr-2"
						>
							<Search className="h-4 w-4" />
						</Button>
					</div>
					<CommandList>
						<div className="flex justify-between items-center px-3 py-2">
							<span className="text-muted-foreground text-xs">
								{autocompleteData.type === "autocomplete"
									? "Suggestions"
									: "History"}
							</span>
							{clearHistoryButton()}
						</div>
						{autocompleteData?.data.map((suggestion) => (
							<CommandItem
								key={suggestion}
								value={suggestion}
								onSelect={() => {
									setSearchQuery(suggestion);
								}}
							>
								{autocompleteData.type === "autocomplete" ? (
									<SearchIcon className="mr-2 h-4 w-4" />
								) : (
									<HistoryIcon className="mr-2 h-4 w-4" />
								)}
								<span>{suggestion}</span>
							</CommandItem>
						))}
					</CommandList>
				</Command>
			</FlatCard>
		</div>
	);
};

export const SearchBarSkeleton: React.FC = () => {
	return (
		<div className="bg-card/50 relative w-full rounded-none">
			<FlatCard>
				<Skeleton className="h-12 w-full rounded-none" />
			</FlatCard>
		</div>
	);
};

export default SearchBar;
