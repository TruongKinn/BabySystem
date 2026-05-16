# Authentication Service Permissions

## New Permissions Added (V14)

| API Name | Method | Path | Description | Roles |
|----------|--------|------|-------------|-------|
| API:DELETE:FAMILY_MEMBER_REMOVE | DELETE | `/account/families/{id}/members/{userId}` | Remove member from family | USER, ADMIN, OWNER |
| API:PUT:FAMILY_MEMBER_UPDATE | PUT | `/account/families/{id}/members/{userId}` | Update family member profile | USER, ADMIN, OWNER |

## Purpose
These permissions were added to resolve "403 Forbidden" errors when attempting to delete or update family members through the API Gateway.
