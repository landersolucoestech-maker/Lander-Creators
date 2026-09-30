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
- authorized application-mediated reads.

Current accepted signatures:
- PNG;
- JPEG;
- PDF;
- WAV;
- MP3 with ID3 header.

SVG and archives are rejected. No transcoding or AI analysis is implemented.

Default technical file-size limit: 10 MiB. Future domain-specific limits belong to their own policies.

## Storage
MediaStorageAdapter is provider-neutral. LocalEphemeralStorageAdapter is used only for CI/test and GitHub visual inspection. It is not production persistence.

External storage provider: NONE.

Raw storage keys and filesystem paths are never public API fields. Private media content is served only after authentication, active Workspace Membership and media.view authorization.

Malware scanning is not implemented. No external scanning service is authorized in Etapa 4.
