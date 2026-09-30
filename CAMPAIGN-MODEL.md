# Campaign Model

Campaign Core is the Workspace-scoped orchestration layer for exactly one primary Promoted Object. It is one generic engine for MUSIC_TRACK, MUSIC_RELEASE, ARTIST, COMPANY, BRAND, PRODUCT, SERVICE, PLATFORM, EVENT, PROJECT and INSTITUTIONAL_INITIATIVE.

## Lifecycle
DRAFT → SCHEDULED or ACTIVE; SCHEDULED → ACTIVE; ACTIVE → PAUSED, CANCELLATION_PENDING or COMPLETED; PAUSED → ACTIVE, CANCELLATION_PENDING or COMPLETED; CANCELLATION_PENDING → CANCELLED; COMPLETED/CANCELLED → ARCHIVED. Completion is explicit. No background scheduler is claimed.

Recruitment (NOT_OPEN/OPEN/CLOSED) and visibility (OPEN/PRIVATE) are independent of lifecycle. Duration is FIXED or EVERGREEN.

## Promoted Object and snapshot
Selection always resolves through the Promoted Object Registry and its authorization/readiness adapters. Campaign persists type, source entity UUID and a historical display/parent/assets snapshot. The owning domain remains source of truth before snapshot; the snapshot never mutates it. Revoked source access blocks later activation but never deletes history.

## Readiness
Readiness is READY, READY_WITH_WARNINGS or BLOCKED with structured reasons. Activation is explicit and requires Campaign permission, current Workspace membership, promoted-object access and no blockers.

## Material edit policy
ACTIVE, CANCELLATION_PENDING, COMPLETED, CANCELLED and ARCHIVED Campaigns reject material builder updates. Promoted object cannot be changed after activation.

## Boundaries
Campaign planning budget is not Finance. Rights requirements are not Engagement Terms. Content requirements are not Deliverables or Publications. Tracking configuration is not Analytics metrics. Participation, Engagement, Proposal, Finance, Content, Publication, Reporting, Matching and AI remain downstream.
