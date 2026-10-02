import { listCreatorContracts } from "@/server/engagement/service";
import { renderCreatorPage } from "../creator-page";
import { ContractsPanel } from "./contracts-panel";

export default async function ContractsPage() {
  return renderCreatorPage(async ({ client, userId }) => (
    <ContractsPanel contracts={(await listCreatorContracts(client, userId)) as never} />
  ));
}
