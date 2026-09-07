import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route } from "../../src/routes/auth";
import { useLogout } from "../../src/components/auth/useLogout";
const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
(window as any).__authFixture.client = client;
client.setQueryData(["private-record"], { name: "Fictício" });
function LogoutHarness() {
  const exit = useLogout();
  return (
    <>
      <button disabled={exit.busy} onClick={exit.logout}>
        Sair
      </button>
      {exit.error && <p role="alert">{exit.error}</p>}
    </>
  );
}
const Page =
  (window as any).__authFixture.mode === "logout" ? LogoutHarness : Route.options.component;
const root = createRoot(document.getElementById("root")!);
(window as any).__authFixture.unmount = () => root.unmount();
root.render(
  <QueryClientProvider client={client}>
    <Page />
  </QueryClientProvider>,
);
