import { listCreatorProposals } from "@/server/proposal/service";
import { renderCreatorPage } from "../creator-page";
import { ProposalsPanel } from "./proposals-panel";

export default async function ProposalsPage() {
  return renderCreatorPage(async ({ client, userId }) => (
    <ProposalsPanel proposals={(await listCreatorProposals(client, userId)) as never} />
  ));
}
