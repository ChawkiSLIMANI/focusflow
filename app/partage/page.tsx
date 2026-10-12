import AppFooter from "../_components/AppFooter";
import ShareView from "./ShareView";

export const metadata = {
  title: "Coup de pouce — FocusFlow",
  description: "Quelqu'un t'a envoyé un coup de pouce via FocusFlow.",
};

export default function Page() {
  // Outside ShareView on purpose: ShareView renders nothing on the server.
  return (
    <>
      <ShareView />
      <AppFooter />
    </>
  );
}
