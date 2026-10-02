import type { Sql } from "postgres";
import { resolvePromotedObject } from "@/server/promoted-entities/registry";
import type { PromotedObjectType } from "@/server/promoted-entities/types";
import type { CampaignReadiness } from "./types";

export async function evaluateCampaignReadiness(
  sql: Sql,
  input: { userId: string; workspaceId: string; campaignId: string }
): Promise<CampaignReadiness> {
  const rows = await sql.unsafe(
    "select * from campaigns where id=$1::uuid and workspace_id=$2::uuid",
    [input.campaignId, input.workspaceId]
  );
  if (!rows[0]) {
    return { status: "BLOCKED", blockers: ["CAMPAIGN_NOT_FOUND"], warnings: [] };
  }

  const campaign = rows[0] as Record<string, unknown>;
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!campaign.promoted_object_type || !campaign.promoted_object_id) {
    blockers.push("CAMPAIGN_PROMOTED_OBJECT_REQUIRED");
  } else {
    try {
      const object = await resolvePromotedObject(sql, {
        userId: input.userId,
        workspaceId: input.workspaceId,
        type: String(campaign.promoted_object_type) as PromotedObjectType,
        entityId: String(campaign.promoted_object_id)
      });
      if (object.readiness.status === "BLOCKED") {
        blockers.push("CAMPAIGN_PROMOTED_OBJECT_BLOCKED", ...object.readiness.blockers);
      }
      warnings.push(...object.readiness.warnings);
    } catch {
      blockers.push("CAMPAIGN_PROMOTED_OBJECT_ACCESS_REQUIRED");
    }
  }

  if (!campaign.goal_code) blockers.push("CAMPAIGN_GOAL_REQUIRED");
  if (campaign.goal_code && campaign.promoted_object_type) {
    const goal = await sql.unsafe(
      "select 1 from campaign_goal_object_types where goal_code=$1 and object_type=$2::promoted_object_type",
      [String(campaign.goal_code), String(campaign.promoted_object_type)]
    );
    if (!goal[0]) blockers.push("CAMPAIGN_GOAL_INCOMPATIBLE");
  }

  const requirements = await sql.unsafe(
    "select count(*)::int count from campaign_content_requirements where campaign_id=$1::uuid",
    [input.campaignId]
  );
  if (Number(requirements[0].count) < 1) {
    blockers.push("CAMPAIGN_CONTENT_REQUIREMENT_REQUIRED");
  }

  if (!campaign.brief || !String(campaign.brief).trim()) {
    blockers.push("CAMPAIGN_BRIEF_REQUIRED");
  }
  if (
    !campaign.mode ||
    !campaign.starts_at ||
    (campaign.mode === "FIXED" && !campaign.ends_at)
  ) {
    blockers.push("CAMPAIGN_SCHEDULE_INVALID");
  }
  if (campaign.budget_minor != null && Number(campaign.budget_minor) < 0) {
    blockers.push("CAMPAIGN_BUDGET_INVALID");
  }

  const invalidAssets = await sql.unsafe(
    "select count(*)::int count from campaign_assets ca left join media_assets m on m.id=ca.media_asset_id and m.workspace_id=$2::uuid and m.status='READY' where ca.campaign_id=$1::uuid and m.id is null",
    [input.campaignId, input.workspaceId]
  );
  if (Number(invalidAssets[0].count) > 0) {
    blockers.push("CAMPAIGN_ASSET_ACCESS_DENIED");
  }

  const tracking = await sql.unsafe(
    "select 1 from campaign_tracking_config where campaign_id=$1::uuid and target_url is not null",
    [input.campaignId]
  );
  if (!tracking[0]) warnings.push("CAMPAIGN_TRACKING_OPTIONAL");

  return {
    status: blockers.length
      ? "BLOCKED"
      : warnings.length
        ? "READY_WITH_WARNINGS"
        : "READY",
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)]
  };
}
