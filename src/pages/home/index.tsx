import { Helmet } from "react-helmet";
import { useTranslation } from "react-i18next";
import SearchComponent from "src/components/search";

export default function Home() {
	const { t } = useTranslation("translation");
	return (
		<div>
			<Helmet>
				<title>{t("title")}</title>
			</Helmet>
			<SearchComponent />
		</div>
	);
}
