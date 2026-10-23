// Run explicitly with SUPABASE_DB_URL; fixtures never commit.
import postgres from "postgres";
import { describe, expect, it } from "vitest";

const connection = process.env.SUPABASE_DB_URL;
describe.skipIf(!connection)("live operational account isolation", () => {
  it("two customers see only their rows; admins retain access; writes and unlinked logs stay private", async () => {
    if (!connection) throw new Error("Database test connection required");
    const sql = postgres(connection, { max: 1, connect_timeout: 10 });
    const a = crypto.randomUUID(), b = crypto.randomUUID(), admin = crypto.randomUUID();
    const marker = `isolation-${crypto.randomUUID()}`;
    let verified = false;
    const rollback = new Error("ROLLBACK_TEST_FIXTURES");
    try {
      await sql.begin(async tx => {
        // Existing auth identity is used only for an uncommitted admin-role fixture.
        const users = await tx`select id from auth.users limit 1`;
        const adminId = users[0]?.id;
        if (!adminId) throw new Error("An auth identity is required to verify admin policies");
        await tx`insert into public.user_roles(user_id,role) values (${adminId},'admin') on conflict do nothing`;
        for (const owner of [a, b, null]) {
          await tx`insert into public.agents(agent_id,name,type,user_id) values (${marker},${marker},'test',${owner})`;
          await tx`insert into public.inference_tasks(task_id,model,user_id) values (${marker},'test',${owner})`;
          await tx`insert into public.thermal_zones(zone_id,name,user_id) values (${marker},${marker},${owner})`;
          const deps = await tx`insert into public.llm_deployments(name,user_id) values (${marker},${owner}) returning id`;
          await tx`insert into public.llm_deployment_logs(deployment_id,message) values (${deps[0].id},${marker})`;
        }
        await tx`insert into public.llm_deployment_logs(message) values (${marker})`;
        await tx`set local role authenticated`;
        for (const actor of [a, b, adminId]) {
          await tx`select set_config('request.jwt.claim.sub',${actor},true)`;
          const expected = actor === adminId ? 3 : 1;
          for (const [table, field] of [['agents','agent_id'],['inference_tasks','task_id'],['thermal_zones','zone_id'],['llm_deployments','name']]) {
            const rows = await tx`select user_id from public.${tx(table)} where ${tx(field)} = ${marker}`;
            expect(rows).toHaveLength(expected);
            if (actor !== adminId) expect(rows[0].user_id).toBe(actor);
          }
          const logs = await tx`select id from public.llm_deployment_logs where message=${marker}`;
          expect(logs).toHaveLength(actor === adminId ? 4 : 1);
          if (actor !== adminId) {
            const changed = await tx`update public.llm_deployments set status='running' where name=${marker} returning id`;
            expect(changed).toHaveLength(0);
            await tx.savepoint(async sp => {
              await expect(sp`insert into public.llm_deployments(name,user_id) values (${marker},${actor})`).rejects.toMatchObject({ code: '42501' });
              // Recover the failed statement's transaction state via rollback to savepoint.
              throw rollback;
            }).catch(error => { if (error !== rollback) throw error; });
          }
        }
        await tx`select set_config('request.jwt.claim.sub',${admin},true)`;
        expect(await tx`select id from public.llm_deployment_logs where message=${marker}`).toHaveLength(0);
        verified = true;
        throw rollback;
      });
    } catch (error) { if (error !== rollback) throw error; }
    finally { await sql.end({ timeout: 1 }); }
    expect(verified).toBe(true);
  }, 30000);
});