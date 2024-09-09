import {
	type RouteObject,
	createBrowserRouter,
	Navigate,
} from "react-router-dom";
import ErrorPage from "./components/error-page";
import { getDefaultLayout } from "./components/layout";
import HomePage from "./pages/home";

export const routerObjects: RouteObject[] = [
	{
		path: "/search",
		Component: HomePage,
	},
	{
		path: "/",
		element: <Navigate to="/search" replace />,
	},
];

export function createRouter(): ReturnType<typeof createBrowserRouter> {
	const routeWrappers = routerObjects.map((router) => {
		if (router.element) {
			return router;
		}
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
	return createBrowserRouter(routeWrappers);
}
