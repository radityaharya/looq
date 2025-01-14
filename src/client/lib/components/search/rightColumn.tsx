import { Badge } from "src/client/lib/components/ui/badge";
import { CardContent, CardHeader, CardTitle } from "src/client/lib/components/ui/card";
import { Separator } from "src/client/lib/components/ui/separator";
import { Skeleton } from "src/client/lib/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "src/client/lib/components/ui/tooltip";
import type React from "react";
import { MarkdownRenderer } from "src/client/lib/components/ui/markdown";
import type { searchDataResponseSchema } from "src/common/schema";
import type { z } from "zod";
import { FlatCard } from "../ui/flat-card";
import { ShineBorder } from "../ui/shine-border";
import { Chat } from "./chat";

type Props = {
	data: z.infer<typeof searchDataResponseSchema>;
	summary: {
		content: string;
		sources: string[];
	} | null;
	handleSearch: (query: string) => void;
	isStreamingSummary: boolean;
	requestId: string;
	selectedModel: string;
	className?: string;
};

export const RightColumn: React.FC<Props> = ({
	data,
	summary,
	handleSearch,
	isStreamingSummary,
	requestId,
	selectedModel,
	className,
}) => {
	return (
		<FlatCard className={`bg-card w-full shadow-lg border-2 border-primary/10 ${className}`}>
			<ShineBorder
				active={isStreamingSummary}
				borderWidth={4}
				color={isStreamingSummary ? ["#27272a"] : "transparent"}
				className="w-full border-primary/10"
			>
				<CardHeader className="bg-accent/40 border-b border-primary/10 py-4">
					<CardTitle className="flex items-center text-lg font-bold">
						Insights
					</CardTitle>
				</CardHeader>
				<CardContent className="pt-6">
					{summary ? (
						<div className="text-sm">
							<MarkdownRenderer 
								content={Array.isArray(summary.content)
									? summary.content.join("\n\n")
									: summary.content
								} 
								onSearchClick={handleSearch}
							/>
							<div className="flex flex-wrap gap-2 mt-2">
								{summary.sources.map((source, index) => (
									<a
										key={source}
										href={source}
										target="_blank"
										rel="noopener noreferrer"
										className="text-xs text-primary hover:underline"
									>
										<Badge
											variant="secondary"
											className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px]"
										>
											{(() => {
												const urlPattern =
													/^(https?:\/\/)?([^\/?#]+)(?:[\/?#]|$)/i;
												const match = source.match(urlPattern);
												return match ? match[2] : source;
											})()}
										</Badge>
									</a>
								))}
							</div>
						</div>
					) : (
						<div className="flex flex-col gap-2">
							{Array.from({ length: 5 }).map((_, index) => (
								<Skeleton
									key={index}
									className="h-4"
									style={{ width: `${70 + Math.random() * 30}%` }}
									delay={index * 150}
								/>
							))}
							<div className="flex gap-2 mt-4">
								{Array.from({ length: 3 }).map((_, index) => (
									<Skeleton
										key={`source-${index}`}
										className="h-5 rounded-full"
										style={{ width: `${50 + Math.random() * 40}px` }}
										delay={800 + index * 100}
									/>
								))}
							</div>
						</div>
					)}
					<Separator className="my-4 w-full" />
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

					{data.suggestions && data.suggestions.length > 0 && (
						<>
							<h3 className="font-semibold mb-3 text-sm">Related Searches</h3>
							<div className="flex flex-wrap gap-2">
								{data.suggestions.map((suggestion, index) => (
									<Badge
										key={suggestion}
										variant="outline"
										className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-[10px]"
										onClick={() => handleSearch(suggestion)}
									>
										{suggestion}
									</Badge>
								))}
							</div>
						</>
					)}

					{summary && (
						<>
							<Separator className="my-4" />
							<Chat requestId={requestId} model={selectedModel} />
						</>
					)}
				</CardContent>
			</ShineBorder>
		</FlatCard>
	);
};

export const RightColumnSkeleton: React.FC<{ count?: number }> = ({
	count = 3,
}) => {
	const getRandomWidth = () => {
		// Generate widths between 70% and 100%
		return `${70 + Math.random() * 30}%`;
	};

	return (
		<FlatCard className="bg-card w-full shadow-lg border-2 border-primary/10 h-[min-content]">
			<CardHeader className="bg-accent/40 border-b border-primary/10 py-4">
				<CardTitle className="flex items-center text-lg font-bold">
					Insights
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="flex flex-col gap-2 mb-2">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton
							key={index}
							className="h-4"
							style={{ width: getRandomWidth() }}
							delay={index * 100} // Stagger the animations
						/>
					))}
				</div>
				<Separator className="my-4 w-full" />
				<h3 className="font-semibold mb-3 text-sm">Related Searches</h3>
				<div className="flex flex-wrap gap-2">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton
							key={index}
							className="h-4"
							style={{ width: `${40 + Math.random() * 60}px` }}
							delay={500 + index * 100} // Delayed start after the lines above
						/>
					))}
				</div>
			</CardContent>
		</FlatCard>
	);
};

export default RightColumn;
