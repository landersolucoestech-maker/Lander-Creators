import { listCreatorDeliverables } from "@/server/deliverable/service";
import { listCreatorPublications } from "@/server/publication/service";
import { renderCreatorPage } from "../creator-page";
import { DeliverablesPanel } from "./deliverables-panel";

export default async function DeliverablesPage() {
  return renderCreatorPage(async ({ client, userId }) => {
    const [deliverables, publications] = await Promise.all([
      listCreatorDeliverables(client, userId),
      listCreatorPublications(client, userId)
    ]);
    return <DeliverablesPanel deliverables={deliverables as never} publications={publications as never} />;
  });
}
