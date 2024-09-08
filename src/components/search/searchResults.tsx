import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import type { searchDataResponseSchema } from "functions/api/[[route]]";
import { ExternalLink, Star } from "lucide-react";
import type React from "react";
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
						className="text-xl text-white hover:underline flex items-center gap-2"
					>
						{result.title}
					</a>
					<div className="flex items-center gap-2 text-xs text-neutral-400 mt-1 flex-wrap">
						<span className="max-w-xs truncate">
							{result.url.replace(/(^\w+:|^)\/\//, "")}
						</span>
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
					<p className="mt-2 text-sm text-neutral-300 overflow-hidden truncate">
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
