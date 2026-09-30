# Music Catalog Model

## Purpose
LANDER CREATORS Music Catalog is a Creator Marketing catalog. Its canonical graph is:

Artist → Release → Track.

It is not a copyright, publishing, royalty or distribution system.

## Artist
Artist is a global first-class business entity distinct from User, CreatorProfile and Workspace.

V1 fields: artistic name, optional civil name, bio, country/language references, optional Shared Media avatar, DRAFT/ACTIVE/ARCHIVED lifecycle and timestamps.

Name similarity is only duplicate evidence. Artists are never auto-merged by name.

## Workspace access
Artist/catalog access is explicit through WorkspaceArtistAccess with VIEW or MANAGE.

Catalog authorization requires both:
1. active Workspace permission; and
2. Artist access relationship.

Workspace ADMIN or OWNER does not grant access to all Artists globally.

## Release
Release types are SINGLE, EP and ALBUM. Release owns title, primary Artist context, optional release date, language, MUSIC_GENRE/subgenre references, optional Shared Media artwork, optional UPC and informational HTTPS platform URLs.

Release status is DRAFT/ACTIVE/ARCHIVED. Distribution statuses do not exist.

## Track
Track belongs to Release and represents catalog music for marketing operations. It is not Work, Composition or Phonogram.

Track persists deterministic track number, release metadata, explicit-content nullable boolean, TrackVersion, integer duration_ms, optional normalized ISRC, informational HTTPS URLs, notes, optional private Shared Media audio and optional source_track_id lineage.

TrackVersion values: ORIGINAL, REMIX, ACOUSTIC, LIVE, SPED_UP, SLOWED, CLEAN, EXTENDED, RADIO_EDIT and OTHER.

## Artist credits
Only PRIMARY_ARTIST and FEATURED_ARTIST are modeled. Credit position is persisted and unique within role for deterministic display.

Composer, publisher, producer, songwriter, arranger and musician credits are intentionally outside this catalog.

## TrackSegment
TrackSegment stores start_ms, end_ms, optional label, recommended and authorized.

recommended and authorized are independent. Future recommendation systems must never imply authorization.

## Media
Artist avatars and Release artwork reuse Shared Media. Track audio references one AUDIO MediaAsset and is forced PRIVATE when attached.

Generic Shared Media reads detect Track-bound audio and additionally require current catalog authorization so a guessed MediaAsset ID cannot bypass Artist access.

## Future boundary
Stable Artist, Release and Track IDs may later be adapted into Promoted Objects. No Campaign adapter is implemented by Etapa 5B.

## Explicit exclusions
No Work, Phonogram, Publishing, Rights, Splits, Royalties, Distribution, DSP delivery or Music Intelligence exists in this module.
