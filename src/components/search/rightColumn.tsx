import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { searchDataResponseSchema } from "@/lib/search";
import type React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { z } from "zod";
import { FlatCard } from "../ui/flat-card";
import { ShineBorder } from "../ui/shine-border";
export const RightColumn: React.FC<{
	data: z.infer<typeof searchDataResponseSchema>;
	summary: {
		content: string;
		sources: string[];
	} | null;
	queryHandler: (query: string) => void;
	isStreamingSummary: boolean;
}> = ({ data, summary, queryHandler, isStreamingSummary }) => {
	return (
		<FlatCard className="bg-card w-full shadow-lg border-2 border-primary/10 h-[min-content]">
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
							<Markdown
								remarkPlugins={[remarkGfm]}
								components={{
									p: ({ children }) => <p className="mb-2">{children}</p>,
									ul: ({ children }) => (
										<ul className="list-disc pl-4 mb-2">{children}</ul>
									),
									ol: ({ children }) => (
										<ol className="list-decimal pl-4 mb-2">{children}</ol>
									),
									li: ({ children }) => <li className="mb-1">{children}</li>,
								}}
							>
								{summary.content}
							</Markdown>
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
						<div className="flex flex-col gap-1">
							{Array.from({ length: 5 }).map((_, urlIndex) => (
								<Skeleton key={urlIndex} className="h-4 w-full" />
							))}
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
										onClick={() => queryHandler(suggestion)}
									>
										{suggestion}
									</Badge>
								))}
							</div>
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
	return (
		<FlatCard className="bg-card w-full shadow-lg border-2 border-primary/10 h-[min-content]">
			{" "}
			<CardHeader className="bg-accent/40 border-b border-primary/10 py-4">
				<CardTitle className="flex items-center text-lg font-bold">
					Insights
				</CardTitle>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="flex flex-col gap-1 mb-2">
					{Array.from({ length: 5 }).map((_, urlIndex) => (
						<Skeleton key={urlIndex} className="h-4 w-full" />
					))}
				</div>
				<Separator className="my-4 w-full" />
				<h3 className="font-semibold mb-3 text-sm">Related Searches</h3>
				<div className="flex flex-wrap gap-2">
					{Array.from({ length: 5 }).map((_, index) => (
						<Skeleton key={index} className="h-4 w-1/4" />
					))}
				</div>
			</CardContent>
		</FlatCard>
	);
};
