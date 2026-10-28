/**
 * Phúc Nguyên Library API — Cloudflare Workers + D1 + GitHub OAuth.
 * Secrets must be configured with `wrangler secret put`; never commit secrets.
 */
const COOKIE = "__Host-pnlib_session";
const SESSION_SECONDS = 8 * 60 * 60;
const COURSES = new Set([
  "luat-dan-su","to-tung-dan-su","luat-hinh-su","to-tung-hinh-su",
  "luat-hanh-chinh","to-tung-hanh-chinh","luat-doanh-nghiep","so-huu-tri-tue",
  "luat-dat-dai","cong-chung-chung-thuc","ky-nang-tu-van","luat-dau-tu",
  "luat-thuong-mai","dam-phan-hop-dong"
]);

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra }
  });
}
function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = env.SITE_ORIGIN;
  const h = { "Vary": "Origin" };
  if (origin && allowed && origin === allowed) {
    h["Access-Control-Allow-Origin"] = allowed;
    h["Access-Control-Allow-Credentials"] = "true";
    h["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
    h["Access-Control-Allow-Headers"] = "Content-Type, X-PNLIB-CSRF";
    h["Access-Control-Max-Age"] = "86400";
  }
  return h;
}
function withCors(response, request, env) {
  const h = new Headers(response.headers);
  for (const [k,v] of Object.entries(corsHeaders(request, env))) h.set(k,v);
  return new Response(response.body, { status: response.status, headers: h });
}
function redirect(url, headers = {}) {
  return new Response(null, { status: 302, headers: { Location: url, ...headers } });
}
function cookieValue(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const item = raw.split(";").map(x => x.trim()).find(x => x.startsWith(name + "="));
  return item ? item.slice(name.length + 1) : "";
}
function randomHex(n = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return [...bytes].map(x => x.toString(16).padStart(2,"0")).join("");
}
async function sha256(s) {
  const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("");
}
function siteUrl(env, path = "") { return env.SITE_ORIGIN.replace(/\/$/, "") + path; }
function adminAllowed(login, env) {
  const allowed = (env.ADMIN_GITHUB_USERS || "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(String(login || "").toLowerCase());
}
async function getSession(request, env) {
  const sid = cookieValue(request, COOKIE);
  if (!sid) return null;
  const row = await env.DB.prepare("SELECT s.id, s.expires_at, u.github_login FROM sessions s JOIN admins u ON u.id=s.admin_id WHERE s.id=? AND s.expires_at>?")
    .bind(await sha256(sid), Math.floor(Date.now()/1000)).first();
  return row || null;
}
async function requireAdmin(request, env) {
  const session = await getSession(request, env);
  if (!session) return { error: json({ok:false, error:"unauthorized"}, 401) };
  if (request.method !== "GET" && request.headers.get("X-PNLIB-CSRF") !== session.id.slice(0, 24)) {
    return { error: json({ok:false, error:"csrf"}, 403) };
  }
  return { session };
}
function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
async function handle(request, env) {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return new Response(null, { status:204, headers:corsHeaders(request,env) });
  if (url.pathname === "/health") return json({ok:true, service:"pnlib-worker", database:!!env.DB});
  if (url.pathname === "/auth/login") {
    if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_SECRET || !env.ADMIN_GITHUB_USERS) return json({ok:false,error:"oauth_not_configured"},503);
    const state = randomHex(24);
    await env.DB.prepare("INSERT INTO oauth_states (state_hash, expires_at) VALUES (?,?)")
      .bind(await sha256(state), Math.floor(Date.now()/1000)+600).run();
    const callback = encodeURIComponent(new URL("/auth/callback", request.url).toString());
    const target = "https://github.com/login/oauth/authorize?client_id=" + encodeURIComponent(env.GITHUB_CLIENT_ID) + "&redirect_uri=" + callback + "&scope=read:user&state=" + state;
    return redirect(target, { "Set-Cookie": `pnlib_oauth_state=${state}; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`, "Cache-Control":"no-store" });
  }
  if (url.pathname === "/auth/callback") {
    const state = url.searchParams.get("state") || "";
    const cookieState = cookieValue(request, "pnlib_oauth_state");
    if (!state || !cookieState || state !== cookieState) return json({ok:false,error:"invalid_oauth_state"},400);
    const stateHash = await sha256(state);
    const stored = await env.DB.prepare("SELECT state_hash FROM oauth_states WHERE state_hash=? AND expires_at>?")
      .bind(stateHash, Math.floor(Date.now()/1000)).first();
    await env.DB.prepare("DELETE FROM oauth_states WHERE state_hash=?").bind(stateHash).run();
    if (!stored) return json({ok:false,error:"expired_oauth_state"},400);
    const code = url.searchParams.get("code");
    if (!code) return redirect(siteUrl(env, "/?admin=oauth_failed"));
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method:"POST", headers:{ "Accept":"application/json", "Content-Type":"application/json" },
      body:JSON.stringify({client_id:env.GITHUB_CLIENT_ID, client_secret:env.GITHUB_CLIENT_SECRET, code})
    });
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) return redirect(siteUrl(env, "/?admin=oauth_failed"));
    const userRes = await fetch("https://api.github.com/user", { headers:{Authorization:`Bearer ${tokenData.access_token}`, Accept:"application/vnd.github+json", "User-Agent":"Phuc-Nguyen-Library"} });
    if (!userRes.ok) return redirect(siteUrl(env, "/?admin=oauth_failed"));
    const ghUser = await userRes.json();
    if (!adminAllowed(ghUser.login, env)) return redirect(siteUrl(env, "/?admin=not_allowed"));
    await env.DB.prepare("INSERT INTO admins (github_id, github_login) VALUES (?,?) ON CONFLICT(github_id) DO UPDATE SET github_login=excluded.github_login")
      .bind(String(ghUser.id), ghUser.login).run();
    const admin = await env.DB.prepare("SELECT id FROM admins WHERE github_id=?").bind(String(ghUser.id)).first();
    const rawSid = randomHex(32);
    const sidHash = await sha256(rawSid);
    const csrf = randomHex(12);
    await env.DB.prepare("INSERT INTO sessions (id, admin_id, csrf_token, expires_at, created_at) VALUES (?,?,?,?,?)")
      .bind(sidHash, admin.id, csrf, Math.floor(Date.now()/1000)+SESSION_SECONDS, Math.floor(Date.now()/1000)).run();
    return redirect(siteUrl(env, "/?admin=authenticated"), {
      "Set-Cookie": cookieHeader(rawSid, SESSION_SECONDS) + ", " + `pnlib_oauth_state=; Path=/auth; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
      "Cache-Control":"no-store"
    });
  }
  if (url.pathname === "/auth/logout" && request.method === "POST") {
    const session = await getSession(request, env);
    if (session) await env.DB.prepare("DELETE FROM sessions WHERE id=?").bind(session.id).run();
    return withCors(new Response(JSON.stringify({ok:true}), {headers:{"Content-Type":"application/json","Set-Cookie":cookieHeader("",0)}}), request, env);
  }
  if (url.pathname === "/api/me") {
    const session = await getSession(request, env);
    if (!session) return withCors(json({ok:true, authenticated:false}),request,env);
    const full = await env.DB.prepare("SELECT s.csrf_token, u.github_login FROM sessions s JOIN admins u ON u.id=s.admin_id WHERE s.id=?").bind(session.id).first();
    return withCors(json({ok:true,authenticated:true,login:full.github_login,csrf:full.csrf_token}),request,env);
  }
  if (url.pathname === "/api/check" && request.method === "GET") {
    const code = (url.searchParams.get("code") || "").trim();
    const course = (url.searchParams.get("course") || "").trim();
    const device = (url.searchParams.get("device") || "").trim().slice(0,128);
    if (!code || !course || !device || !COURSES.has(course)) return withCors(json({ok:false,why:"input"}),request,env);
    const now = Math.floor(Date.now()/1000);
    const row = await env.DB.prepare("SELECT id, expires_at, max_uses, revoked FROM access_codes WHERE code=?").bind(code).first();
    if (!row || row.revoked) return withCors(json({ok:false,why:"code"}),request,env);
    if (row.expires_at && row.expires_at < now) return withCors(json({ok:false,why:"expired"}),request,env);
    const scope = await env.DB.prepare("SELECT course_slug FROM code_courses WHERE code_id=?").bind(row.id).all();
    if (scope.results.length && !scope.results.some(x=>x.course_slug===course)) return withCors(json({ok:false,why:"scope"}),request,env);
    const seen = await env.DB.prepare("SELECT id FROM code_devices WHERE code_id=? AND device_hash=?").bind(row.id,await sha256(device)).first();
    if (!seen) {
      const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM code_devices WHERE code_id=?").bind(row.id).first();
      if (count.n >= row.max_uses) return withCors(json({ok:false,why:"limit"}),request,env);
      await env.DB.prepare("INSERT INTO code_devices (code_id,device_hash,first_seen_at) VALUES (?,?,?)").bind(row.id,await sha256(device),now).run();
    }
    await env.DB.prepare("INSERT INTO usage_events (code_id, course_slug, device_hash, used_at) VALUES (?,?,?,?)")
      .bind(row.id,course,await sha256(device),now).run();
    return withCors(json({ok:true,course}),request,env);
  }
  if (url.pathname.startsWith("/api/admin/")) {
    const auth = await requireAdmin(request,env);
    if (auth.error) return withCors(auth.error,request,env);
    if (url.pathname === "/api/admin/codes" && request.method === "GET") {
      const rows = await env.DB.prepare("SELECT c.id,c.code,c.note,c.expires_at,c.max_uses,c.created_at,c.revoked, GROUP_CONCAT(cc.course_slug) AS courses, (SELECT COUNT(*) FROM code_devices d WHERE d.code_id=c.id) AS used FROM access_codes c LEFT JOIN code_courses cc ON cc.code_id=c.id GROUP BY c.id ORDER BY c.created_at DESC LIMIT 500").all();
      return withCors(json({ok:true,codes:rows.results}),request,env);
    }
    if (url.pathname === "/api/admin/codes" && request.method === "POST") {
      let body; try { body=await request.json(); } catch { return withCors(json({ok:false,error:"invalid_json"},400),request,env); }
      const count = Math.max(1,Math.min(200,Number(body.count||1)));
      const prefix = String(body.prefix||"PN_").trim();
      const maxUses = Math.max(1,Math.min(10000,Number(body.maxUses||20)));
      const note = String(body.note||"").slice(0,250);
      const expiresAt = body.expiresAt ? Math.floor(new Date(body.expiresAt+"T23:59:59Z").getTime()/1000) : null;
      const courses = Array.isArray(body.courses) ? [...new Set(body.courses.map(String))] : [];
      if (!/^[A-Za-z0-9_-]{1,32}$/.test(prefix) || courses.some(c=>!COURSES.has(c)) || !courses.length || (body.expiresAt && !Number.isFinite(expiresAt))) return withCors(json({ok:false,error:"invalid_fields"},400),request,env);
      const codes = [];
      for (let i=1;i<=count;i++) {
        let code = count===1 && body.code ? String(body.code).trim() : prefix+i;
        if (!/^[A-Za-z0-9_-]{4,64}$/.test(code)) return withCors(json({ok:false,error:"invalid_code"},400),request,env);
        codes.push(code);
      }
      if (new Set(codes).size!==codes.length) return withCors(json({ok:false,error:"duplicate_codes"},400),request,env);
      for (const code of codes) {
        const exists = await env.DB.prepare("SELECT id FROM access_codes WHERE code=?").bind(code).first();
        if (exists) return withCors(json({ok:false,error:"code_exists",code},409),request,env);
      }
      const now = Math.floor(Date.now()/1000);
      const batch = [];
      for (const code of codes) {
        batch.push(env.DB.prepare("INSERT INTO access_codes (code,note,expires_at,max_uses,created_at,created_by) VALUES (?,?,?,?,?,?)").bind(code,note,expiresAt,maxUses,now,auth.session.github_login));
      }
      const results = await env.DB.batch(batch);
      const ids = [];
      for (let i=0;i<codes.length;i++) {
        const row = await env.DB.prepare("SELECT id FROM access_codes WHERE code=?").bind(codes[i]).first();
        ids.push(row.id);
      }
      for (const id of ids) for (const course of courses) await env.DB.prepare("INSERT INTO code_courses (code_id,course_slug) VALUES (?,?)").bind(id,course).run();
      return withCors(json({ok:true,created:codes.length,codes}),request,env);
    }
    const revoke = url.pathname.match(/^\/api\/admin\/codes\/(\d+)\/revoke$/);
    if (revoke && request.method === "POST") {
      await env.DB.prepare("UPDATE access_codes SET revoked=1 WHERE id=?").bind(Number(revoke[1])).run();
      return withCors(json({ok:true}),request,env);
    }
    return withCors(json({ok:false,error:"not_found"},404),request,env);
  }
  return withCors(json({ok:false,error:"not_found"},404),request,env);
}
export default {
  async fetch(request, env) {
    try { return await handle(request,env); }
    catch (e) { console.error("pnlib-worker-error", e?.name || "Error"); return withCors(json({ok:false,error:"internal_error"},500),request,env); }
  }
};
