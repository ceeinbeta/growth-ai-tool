# Invite-only signup and shared profiling safeguard

- Allow only invited emails to create new accounts; start with exactly `mcileneveloria@gmail.com`. Keep existing users and workspace creation unchanged.
- Show the requested invite-only message for blocked signup errors without exposing invited addresses.
- Stop profiling before calling AI once 100 runs have been reserved across all products in the previous 24 hours; preserve the five-per-product limit.
- Run every existing test plus database checks for invitations, existing-user access, private allow-list permissions, and atomic rolling limits. Remove all temporary test data.
- Leave Growloop unpublished and explain how to invite another email.

## Technical details
- Private `allowed_emails` table: lowercase check, service-role privileges only, RLS without policies. Seed the single invitation through the privileged database query tool.
- App-owned BEFORE INSERT lifecycle trigger on `auth.users`, independent of the existing AFTER INSERT workspace trigger.
- Serialize all profile reservations with one transaction advisory lock before the existing product lock and both rolling count checks.
- Integration checks use actual database operations with transaction rollback and/or explicit cleanup; no real sign-in emails or AI calls are sent during tests.