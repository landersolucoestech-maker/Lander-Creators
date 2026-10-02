import { listCreatorPayables } from "@/server/finance/service";
import { renderCreatorPage } from "../creator-page";
import { PaymentsPanel } from "./payments-panel";

export default async function PaymentsPage() {
  return renderCreatorPage(async ({ client, userId }) => (
    <PaymentsPanel payments={(await listCreatorPayables(client, userId)) as never} />
  ));
}
