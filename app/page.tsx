import AppFooter from "./_components/AppFooter";
import FocusFlowApp from "./_components/FocusFlowApp";
import { getAppVersionLabel } from "./_lib/appVersion";

export default function Home() {
  // Read on the server and handed over as props: package.json stays out of the client bundle.
  return <FocusFlowApp versionLabel={getAppVersionLabel()} footer={<AppFooter />} />;
}
