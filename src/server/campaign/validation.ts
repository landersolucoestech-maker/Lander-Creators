import { DomainError } from "@/server/shared/domain-error";

export function assertSafeUrl(
  value: string | null | undefined,
  code = "CAMPAIGN_URL_INVALID"
) {
  if (!value) return;
  try {
    const url = new URL(value, "https://internal.invalid");
    if (value.startsWith("/") && !value.startsWith("//")) return;
    if (url.protocol !== "https:") throw new Error();
  } catch {
    throw new DomainError(code, "Unsafe or invalid URL", 400);
  }
}

export function assertRange(
  min: number | null | undefined,
  max: number | null | undefined
) {
  if (
    (min != null && min < 0) ||
    (max != null && max < 0) ||
    (min != null && max != null && min > max)
  ) {
    throw new DomainError(
      "CAMPAIGN_TARGETING_RANGE_INVALID",
      "Invalid targeting range",
      400
    );
  }
}

export function assertSchedule(input: {
  mode: "FIXED" | "EVERGREEN";
  startsAt: string | null;
  endsAt: string | null;
  recruitmentOpensAt?: string | null;
  recruitmentClosesAt?: string | null;
}) {
  const startsAt = input.startsAt ? new Date(input.startsAt) : null;
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  const recruitmentOpensAt = input.recruitmentOpensAt
    ? new Date(input.recruitmentOpensAt)
    : null;
  const recruitmentClosesAt = input.recruitmentClosesAt
    ? new Date(input.recruitmentClosesAt)
    : null;

  if (input.mode === "FIXED" && (!startsAt || !endsAt)) {
    throw new DomainError(
      "CAMPAIGN_SCHEDULE_INVALID",
      "Fixed campaign requires start and end",
      400
    );
  }
  if (startsAt && endsAt && endsAt <= startsAt) {
    throw new DomainError(
      "CAMPAIGN_SCHEDULE_INVALID",
      "Campaign end must be after start",
      400
    );
  }
  if (
    recruitmentOpensAt &&
    recruitmentClosesAt &&
    recruitmentClosesAt < recruitmentOpensAt
  ) {
    throw new DomainError(
      "CAMPAIGN_SCHEDULE_INVALID",
      "Recruitment window is invalid",
      400
    );
  }
  if (
    (startsAt && recruitmentOpensAt && recruitmentOpensAt < startsAt) ||
    (endsAt && recruitmentClosesAt && recruitmentClosesAt > endsAt)
  ) {
    throw new DomainError(
      "CAMPAIGN_SCHEDULE_INVALID",
      "Recruitment window must fit campaign window",
      400
    );
  }
}
