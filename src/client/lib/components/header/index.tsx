import { Bell, Menu } from "lucide-react";
import type React from "react";
import { Button } from "../ui/button";

interface IProps {
	leftNode?: React.ReactNode;
}

export function Header(props: IProps) {
	return (
		<header className="flex justify-between items-center p-4 sticky top-0 z-10">
			<div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
				<span className="text-xl">••</span>
			</div>
			<div className="flex items-center space-x-4">
				<Button
					variant="secondary"
					className="text-foreground hover:text-white"
				>
					Feedback
				</Button>
				<Button
					variant="secondary"
					size="icon"
					className="text-foreground hover:text-white"
				>
					<Bell className="h-5 w-5" />
				</Button>
				<Button
					variant="secondary"
					size="icon"
					className="text-foreground hover:text-white"
				>
					<Menu className="h-5 w-5" />
				</Button>
			</div>
		</header>
	);
}
