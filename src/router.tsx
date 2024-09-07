import { type RouteObject, createHashRouter } from "react-router-dom";
import ErrorPage from "./components/error-page";
import { getDefaultLayout } from "./components/layout";
import HomePage from "./pages/home";

export const routerObjects: RouteObject[] = [
	{
		path: "/",
		Component: HomePage,
	},
];

export function createRouter(): ReturnType<typeof createHashRouter> {
	const routeWrappers = routerObjects.map((router) => {
		const getLayout = getDefaultLayout;
		const Component = router.Component as React.ComponentType;
		const page = getLayout(<Component />);
		return {
			...router,
			element: page,
			Component: null,
			ErrorBoundary: ErrorPage,
		};
	});
	return createHashRouter(routeWrappers);
}
