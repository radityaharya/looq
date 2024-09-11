import { Skeleton } from "@/components/ui/skeleton";
import type React from "react";
import type { searchDataResponseSchema } from "src/lib/search";
import type { z } from "zod";

export const SearchResults: React.FC<{
	searchData: z.infer<typeof searchDataResponseSchema>;
}> = ({ searchData }) => {
	return (
		<>
			{searchData.results.map((result, index) => (
				<div key={result.url.replace(/\W/g, "")} className="mb-6">
					<a
						href={result.url}
						className="text-xl text-white hover:underline flex items-center gap-2 line-clamp-2"
					>
						{result.title}
					</a>
					<div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
						<span className="max-w-xs truncate">
							{result.url.replace(/(^\w+:|^)\/\//, "")}
						</span>
					</div>
					<p className="mt-2 text-sm text-neutral-300 line-clamp-2">
						{result.content}
					</p>
				</div>
			))}
		</>
	);
};

export const SearchResultsSkeleton: React.FC<{ count?: number }> = ({
	count = 5,
}) => {
	return (
		<>
			{Array.from({ length: count }).map((_, index) => (
				<div key={index} className="mb-6 w-full">
					<Skeleton className="h-6 w-3/4 mb-2" />
					<div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
						<Skeleton className="h-4 w-1/4" />
					</div>
					<Skeleton className="h-4 w-full mt-2" />
					<Skeleton className="h-4 w-5/6 mt-1" />
				</div>
			))}
		</>
	);
};
