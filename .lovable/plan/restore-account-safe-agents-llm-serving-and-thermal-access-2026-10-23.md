# Restore account-safe Agents, LLM Serving, and Thermal access

## Confirmed issue
- Signed-in non-admin checks returned empty Agents, Thermal, and LLM deployment results, while the database contains 8 agents, 4 thermal zones, and 4 deployments.
- Current read policies allow admins only. These operational records have no account ownership field, so simply restoring access for all signed-in users would expose shared records.
- Regular-user deployment inserts are also blocked. The reported “saved deployment disappears” explanation is not accurate for the current policies.
- The main Dashboard already uses the account-specific runtime gateway; it no longer reads the shared operational counts cited in the finding.

## Proposed fix
1. **Isolate account records.** Add ownership to agents, inference tasks, deployments, and thermal zones. Keep existing records admin-only when their owner cannot be proven; do not assign them to an arbitrary customer. Deployment logs inherit access from their parent deployment; unlinked legacy logs remain admin-only.
2. **Restore customer views.** Let signed-in users read only their own records and logs. Update Agents, LLM Serving, Thermal, and their shared readers to distinguish unavailable data from a genuine empty account. Preserve existing administrator access.
3. **Use verified runtime results.** Associate measured agent/thermal data and supported deployment results with the caller’s own runtime connection. Never turn a database insert or fan-setting update into a claim that hardware changed. Where the gateway lacks an operation, show it as unavailable rather than claim success.
4. **Preserve plan restrictions.** Keep Free monitoring limited to one GPU with execution denied; preserve Pro access for LLM Serving. Enforce limits at the server boundary, not just the page.
5. **Verify before closing the finding.** Test two non-admin accounts plus an admin: own-record reads succeed, cross-account reads and changes fail, logs follow deployment ownership, legacy records stay private, and Free limits remain enforced. Verify customer creation/read-back for supported actions and clear unavailable states for unsupported actions. Mark the finding fixed only after these checks pass.

## Technical implementation
- Use an additive migration, explicit grants, and owner-scoped RLS; do not rewrite the earlier security migrations or reopen shared SELECT access.
- Store user IDs as UUID ownership fields, without new foreign keys to managed auth tables. Index ownership and deployment-log lookups.
- Keep server-reported operational status and measurements writable only through trusted server paths; validate the caller, ownership, entitlement, and runtime connection before executing supported actions.
- Reuse the existing authenticated runtime gateway and account-bound connection mechanism. Cover table readers, realtime refreshes, metrics, and linked logs together.
- Add focused authorization and entitlement regression tests, run them, and perform signed-in browser checks. Do not seed fabricated hardware readings.

## Verification dependencies
- Successful real hardware/deployment read-back requires a running account-connected GPU gateway with the relevant operation supported. Account isolation and unavailable states can be verified without claiming hardware execution.
- Changes to published frontend/MCP behavior require a later authorized publish; this plan does not publish automatically.