import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { searchDataResponseSchema } from "functions/api/[[route]]";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type React from "react";
import type { z } from "zod";

export const RightColumn: React.FC<{
	data: z.infer<typeof searchDataResponseSchema>;
	summary: string | null;
	queryHandler: (query: string) => void;
}> = ({ data, summary, queryHandler }) => {
	return (
		<Card className="bg-card w-full shadow-lg border-primary/10">
			<CardHeader className="bg-primary/5 border-b border-primary/10">
				<CardTitle className="flex items-center text-lg font-bold">
					Looq Summary
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
							{summary.replace(/\n/g, "\n\n")}
						</Markdown>
					</div>
				) : (
					<p className="text-sm text-neutral-400/70">Loading summary...</p>
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
		</Card>
	);
};

export const RightColumnSkeleton: React.FC<{ count?: number }> = ({
	count = 3,
}) => {
	return (
		<Card className="bg-card w-full shadow-lg border-primary/10">
			<CardHeader className="bg-primary/5 border-b border-primary/10">
				<CardTitle className="flex items-center text-lg font-bold">
					Insights
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
