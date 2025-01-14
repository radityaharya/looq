import type React from "react";
import { useEffect, useState } from "react";

interface EyeballProps {
	size: number;
}

const Eyeball: React.FC<EyeballProps> = ({ size }) => {
	const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
	const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });

	useEffect(() => {
		const handleMouseMove = (event: MouseEvent) => {
			setMousePosition({ x: event.clientX, y: event.clientY });
		};

		window.addEventListener("mousemove", handleMouseMove);

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
		};
	}, []);

	useEffect(() => {
		const circle = document.getElementById("circle");
		if (circle) {
			const rect = circle.getBoundingClientRect();
			const circleCenter = {
				x: rect.left + rect.width / 2,
				y: rect.top + rect.height / 2,
			};
			const distance = Math.sqrt(
				(mousePosition.x - circleCenter.x) ** 2 +
					(mousePosition.y - circleCenter.y) ** 2,
			);
			const maxDistance = size / 2;
			const radius = Math.min(size / 4, (size / 4) * (distance / maxDistance)); // Adjust the radius based on distance
			const angle = Math.atan2(
				mousePosition.y - circleCenter.y,
				mousePosition.x - circleCenter.x,
			);
			setDotPosition({
				x: radius * Math.cos(angle),
				y: radius * Math.sin(angle),
			});
		}
	}, [mousePosition, size]);

	const dotSize = size / 3;

	return (
		<div
			id="circle"
			style={{
				position: "relative",
				width: `${size}px`,
				height: `${size}px`,
				borderRadius: "25%",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
			}}
			className="bg-primary border-2 border-primary/5"
		>
			<div
				style={{
					position: "absolute",
					width: `${dotSize}px`,
					height: `${dotSize}px`,
					borderRadius: "50%",
					left: `calc(50% + ${dotPosition.x}px)`,
					top: `calc(50% + ${dotPosition.y}px)`,
					transform: "translate(-50%, -50%)",
				}}
				className="bg-card"
			/>
		</div>
	);
};

export default Eyeball;
