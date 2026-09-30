# Shared Media Model

Shared Media owns technical file identity, metadata, validation, storage reference and access metadata. It does not own Creator, Artist, Release, Track, Campaign, Content or Publication meaning. Future domains reference MediaAsset.id.

## Current technical foundation
- media kinds: IMAGE, AUDIO, DOCUMENT;
- lifecycle: READY, ARCHIVED;
- visibility: PRIVATE, WORKSPACE_AVAILABLE;
- SHA-256 checksum;
- opaque storage key;
- Workspace ownership;
- uploader identity;
- authorized application-mediated reads;
- short-lived HMAC media-access token bound to user, Workspace, MediaAsset and expiration.

Current accepted signatures:
- PNG;
- JPEG;
- PDF;
- WAV;
- MP3 with ID3 header.

SVG and archives are rejected. No transcoding, malware scanning or AI analysis is implemented.

Default technical file-size limit: 10 MiB. Future domain-specific limits belong to their own policies.

## Storage
MediaStorageAdapter is provider-neutral. LocalEphemeralStorageAdapter is non-production and can be used by runtime code only when `MEDIA_STORAGE_MODE=ephemeral` is explicitly configured. GitHub visual inspection sets that mode intentionally.

External storage provider: NONE.
Production persistent object storage: NOT IMPLEMENTED.

Raw storage keys and filesystem paths are never public API fields. Private media content requires authentication, current Workspace permission and a short-lived application-issued access token.

Malware scanning remains deferred because no repository-local scanner is present and no external scanning service is authorized.
