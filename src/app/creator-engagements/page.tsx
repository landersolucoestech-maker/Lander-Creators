import { listCreatorEngagements } from "@/server/engagement/service";
import { renderCreatorPage } from "../creator-page";
import { CreatorEngagementsPanel } from "./creator-engagements-panel";

export default async function CreatorEngagementsPage() {
  return renderCreatorPage(async ({ client, userId }) => (
    <CreatorEngagementsPanel engagements={await listCreatorEngagements(client, userId)} />
  ));
}
