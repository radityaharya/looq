import {
	Command,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { HistoryIcon, SearchIcon } from "lucide-react";
import type React from "react";
import { useEffect, useRef } from "react";
import { FlatCard } from "../ui/flat-card";
import { Button } from "../ui/button";
import useLocalStorageState from "src/hooks/use-localstorage-state";

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
			<FlatCard>
				<Command
					shouldFilter={false}
					className="border border-primary/10 rounded-none"
				>
					<CommandInput
						ref={inputRef}
						placeholder="Search..."
						className="rounded-none"
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
					</CommandList>
				</Command>
			</FlatCard>
		</div>
	);
};
