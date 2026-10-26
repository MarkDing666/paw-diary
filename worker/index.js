// 爪印日记 server (Cloudflare Worker + static assets + D1 bound as `DB`).
//
// A dog is the shared unit. Each dog has a unique name and at most two family members (phones),
// each with a distinct role (爸爸, 妈妈 …). One member is the "holder" — the person the dog is with
// right now. Only the holder's phone moves the dog on the map and records; the other phone sees
// where the dog is and reads the shared diary.
//
// Friends are dog-to-dog. A dog's live position is visible to friends only while the holder is on a
// walk with sharing on, and to its own family while the holder has the app open.

const ROLES = ['爸爸', '妈妈', '哥哥', '姐姐', '外公', '外婆', '爷爷', '奶奶'];
const MAX_MEMBERS = 2;
const LIVE_FRESH_MS = 3 * 60 * 1000;
const MEET_RADIUS_M = 45;
const MEET_COOLDOWN_MS = 30 * 60 * 1000;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const MAX_EVENT_BYTES = 150000;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS dogs (id TEXT PRIMARY KEY, name TEXT NOT NULL, name_key TEXT UNIQUE NOT NULL,
     code TEXT UNIQUE NOT NULL, fam_code TEXT UNIQUE NOT NULL, profile TEXT, avatar TEXT, photo TEXT, pv INTEGER DEFAULT 0,
     holder TEXT, holder_at INTEGER, hpos_lat REAL, hpos_lng REAL, hpos_acc REAL, hpos_at INTEGER,
     created INTEGER, last_walk INTEGER, last_walk_dist REAL, week_key TEXT, week_dist REAL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS members (id TEXT PRIMARY KEY, token_hash TEXT NOT NULL, dog_id TEXT NOT NULL, role TEXT NOT NULL,
     created INTEGER, seen INTEGER, meet_cur INTEGER DEFAULT 0, poke_cur INTEGER DEFAULT 0, UNIQUE (dog_id, role))`,
  `CREATE INDEX IF NOT EXISTS members_dog ON members (dog_id)`,
  `CREATE TABLE IF NOT EXISTS devents (id TEXT PRIMARY KEY, dog_id TEXT NOT NULL, data TEXT, t INTEGER, updated INTEGER,
     deleted INTEGER DEFAULT 0, by_role TEXT)`,
  `CREATE INDEX IF NOT EXISTS devents_sync ON devents (dog_id, updated)`,
  `CREATE TABLE IF NOT EXISTS dcells (dog_id TEXT NOT NULL, k TEXT NOT NULL, t INTEGER, PRIMARY KEY (dog_id, k))`,
  `CREATE INDEX IF NOT EXISTS dcells_sync ON dcells (dog_id, t)`,
  `CREATE TABLE IF NOT EXISTS dfriends (a TEXT NOT NULL, b TEXT NOT NULL, created INTEGER, PRIMARY KEY (a, b))`,
  `CREATE TABLE IF NOT EXISTS dlive (dog_id TEXT PRIMARY KEY, lat REAL, lng REAL, start INTEGER, dist REAL, updated INTEGER)`,
  `CREATE TABLE IF NOT EXISTS dmeets (id INTEGER PRIMARY KEY AUTOINCREMENT, a TEXT, b TEXT, t INTEGER, lat REAL, lng REAL)`,
  `CREATE INDEX IF NOT EXISTS dmeets_pair ON dmeets (a, b, t)`,
  `CREATE TABLE IF NOT EXISTS dpokes (id INTEGER PRIMARY KEY AUTOINCREMENT, from_dog TEXT, from_role TEXT, to_dog TEXT, t INTEGER)`,
  `CREATE INDEX IF NOT EXISTS dpokes_to ON dpokes (to_dog, t)`
];
let schemaReady = null;
function ensureSchema(db){
  if (!schemaReady) schemaReady = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { schemaReady = null; throw e; });
  return schemaReady;
}

/* ---------- helpers ---------- */
const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status, headers: {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'}
});
const fail = (status, error, extra) => json(Object.assign({error}, extra || {}), status);
function rand(n, alphabet){
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  if (!alphabet) return [...bytes].map(b => b.toString(16).padStart(2, '0')).join('');
  return [...bytes].map(b => alphabet[b % alphabet.length]).join('');
}
async function sha256(s){
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function haversine(aLat, aLng, bLat, bLng){
  const R = 6371008.8, r = Math.PI / 180, dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
const clean = (s, max) => String(s ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max);
const nameKey = s => clean(s, 40).toLowerCase().replace(/\s+/g, '');
function cleanImage(a, max){
  if (typeof a !== 'string' || !a) return null;
  if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(a)) return null;
  return a.length <= max ? a : null;
}
const okNum = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
function cleanProfile(p){
  p = p && typeof p === 'object' ? p : {};
  const date = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
  const weights = Array.isArray(p.weights) ? p.weights.filter(w => w && date(w.d) && okNum(w.kg, 0, 200)).slice(-200).map(w => ({d: w.d, kg: Math.round(w.kg * 10) / 10})) : [];
  return {
    breed: clean(p.breed, 20), birthday: date(p.birthday), sex: p.sex === 'f' || p.sex === 'm' ? p.sex : '',
    weight: okNum(p.weight, 0, 200) ? Math.round(p.weight * 10) / 10 : null, goal: okNum(p.goal, 5, 300) ? Math.round(p.goal) : 40,
    worm: date(p.worm), vax: date(p.vax), weights
  };
}
function validName(raw){
  const name = clean(raw, 16);
  if (!name) return {error: 'name_empty'};
  if (name.length < 1) return {error: 'name_empty'};
  return {name, key: nameKey(name)};
}
async function body(req){
  try { const j = await req.json(); return j && typeof j === 'object' ? j : {}; } catch (_) { return {}; }
}
async function uniqueCode(db, column){
  for (let i = 0; i < 8; i++){
    const c = rand(6, CODE_ALPHABET);
    const hit = await db.prepare(`SELECT 1 FROM dogs WHERE ${column} = ?`).bind(c).first();
    if (!hit) return c;
  }
  throw new Error('code_exhausted');
}
async function auth(req, db){
  const id = req.headers.get('x-paw-id'), token = req.headers.get('x-paw-token');
  if (!id || !token || id.length > 64 || token.length > 128) return null;
  const m = await db.prepare('SELECT * FROM members WHERE id = ?').bind(id).first();
  if (!m || m.token_hash !== await sha256(token)) return null;
  const dog = await db.prepare('SELECT * FROM dogs WHERE id = ?').bind(m.dog_id).first();
  if (!dog) return null;
  return {m, dog};
}
async function membersOf(db, dogId){
  const r = await db.prepare('SELECT id, role, seen FROM members WHERE dog_id = ? ORDER BY created').bind(dogId).all();
  return r.results || [];
}
function dogForFamily(dog, members, includePhoto){
  const holder = members.length < 2 ? (members[0] && members[0].id) : dog.holder;
  return {
    id: dog.id, name: dog.name, profile: JSON.parse(dog.profile || '{}'), pv: dog.pv || 0,
    photo: includePhoto ? (dog.photo || null) : undefined, hasAvatar: !!dog.avatar,
    members: members.map(m => ({id: m.id, role: m.role})), holder: holder || null, holderAt: dog.holder_at || null,
    holderPos: dog.hpos_at ? {lat: dog.hpos_lat, lng: dog.hpos_lng, acc: dog.hpos_acc, at: dog.hpos_at} : null,
    code: dog.code, famCode: members.length < MAX_MEMBERS ? dog.fam_code : null
  };
}
function publicDog(d){
  return {id: d.id, dog: d.name, pv: d.pv || 0, hasAvatar: !!d.avatar, lastWalk: d.last_walk || null, lastWalkDist: d.last_walk_dist || null};
}
async function newMember(db, dogId, role, now){
  const id = rand(16), token = rand(24);
  await db.prepare('INSERT INTO members (id, token_hash, dog_id, role, created, seen, meet_cur, poke_cur) VALUES (?,?,?,?,?,?,?,?)')
    .bind(id, await sha256(token), dogId, role, now, now, now, now).run();
  return {id, token};
}

/* ---------- API ---------- */
async function handleApi(req, env, url){
  const db = env.DB;
  if (!db) return fail(503, 'no_database');
  await ensureSchema(db);
  const path = url.pathname.replace(/\/+$/, '');
  const now = Date.now();

  if (path === '/api/health') return json({ok: true, v: 2});

  if (path === '/api/name-check' && req.method === 'GET'){
    const v = validName(url.searchParams.get('name'));
    if (v.error) return json({available: false, reason: v.error});
    const hit = await db.prepare('SELECT 1 FROM dogs WHERE name_key = ?').bind(v.key).first();
    return json({available: !hit, name: v.name});
  }

  const av = path.match(/^\/api\/avatar\/([a-f0-9]{8,64})$/);
  if (av && req.method === 'GET'){
    const d = await db.prepare('SELECT avatar FROM dogs WHERE id = ?').bind(av[1]).first();
    if (!d || !d.avatar) return new Response('not found', {status: 404});
    const m = d.avatar.match(/^data:(image\/[a-z]+);base64,(.*)$/);
    const bin = Uint8Array.from(atob(m[2]), c => c.charCodeAt(0));
    return new Response(bin, {headers: {'content-type': m[1], 'cache-control': 'public, max-age=31536000, immutable'}});
  }

  // what someone joining a family sees: the dog's name and which roles are taken
  const fam = path.match(/^\/api\/family\/([A-Za-z0-9]{6})$/);
  if (fam && req.method === 'GET'){
    const d = await db.prepare('SELECT * FROM dogs WHERE fam_code = ?').bind(fam[1].toUpperCase()).first();
    if (!d) return fail(404, 'no_such_code');
    const ms = await membersOf(db, d.id);
    return json({dogId: d.id, name: d.name, pv: d.pv || 0, hasAvatar: !!d.avatar, taken: ms.map(m => m.role), full: ms.length >= MAX_MEMBERS, roles: ROLES});
  }

  if (req.method !== 'POST') return fail(405, 'method');

  if (path === '/api/dog/create'){
    const b = await body(req);
    const v = validName(b.name);
    if (v.error) return fail(400, v.error);
    if (!ROLES.includes(b.role)) return fail(400, 'bad_role');
    const id = rand(16);
    try {
      await db.prepare(`INSERT INTO dogs (id, name, name_key, code, fam_code, profile, avatar, photo, pv, created) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .bind(id, v.name, v.key, await uniqueCode(db, 'code'), await uniqueCode(db, 'fam_code'), JSON.stringify(cleanProfile(b.profile)),
          cleanImage(b.avatar, 40000), cleanImage(b.photo, 90000), now, now).run();
    } catch (e){
      if (/UNIQUE/i.test(String(e && e.message))) return fail(409, 'name_taken');
      throw e;
    }
    const mem = await newMember(db, id, b.role, now);
    await db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(mem.id, now, id).run();
    const dog = await db.prepare('SELECT * FROM dogs WHERE id = ?').bind(id).first();
    return json({member: Object.assign(mem, {dogId: id, role: b.role}), dog: dogForFamily(dog, await membersOf(db, id), true)});
  }

  if (path === '/api/dog/join'){
    const b = await body(req);
    const code = clean(b.code, 12).toUpperCase();
    const d = await db.prepare('SELECT * FROM dogs WHERE fam_code = ?').bind(code).first();
    if (!d) return fail(404, 'no_such_code');
    if (!ROLES.includes(b.role)) return fail(400, 'bad_role');
    const ms = await membersOf(db, d.id);
    if (ms.length >= MAX_MEMBERS) return fail(409, 'family_full');
    if (ms.some(m => m.role === b.role)) return fail(409, 'role_taken');
    let mem;
    try { mem = await newMember(db, d.id, b.role, now); }
    catch (e){ if (/UNIQUE/i.test(String(e && e.message))) return fail(409, 'role_taken'); throw e; }
    const after = await membersOf(db, d.id);
    if (after.length > MAX_MEMBERS){ // two joins raced; undo ours
      await db.prepare('DELETE FROM members WHERE id = ?').bind(mem.id).run();
      return fail(409, 'family_full');
    }
    const dog = await db.prepare('SELECT * FROM dogs WHERE id = ?').bind(d.id).first();
    return json({member: Object.assign(mem, {dogId: d.id, role: b.role}), dog: dogForFamily(dog, after, true)});
  }

  const a = await auth(req, db);
  if (!a) return fail(401, 'auth');
  const me = a.m, dog = a.dog;

  if (path === '/api/dog/update'){
    const b = await body(req);
    const sets = [], vals = [];
    if (b.name !== undefined){
      const v = validName(b.name);
      if (v.error) return fail(400, v.error);
      if (v.key !== dog.name_key){
        const hit = await db.prepare('SELECT 1 FROM dogs WHERE name_key = ? AND id != ?').bind(v.key, dog.id).first();
        if (hit) return fail(409, 'name_taken');
      }
      sets.push('name = ?', 'name_key = ?'); vals.push(v.name, v.key);
    }
    if (b.profile !== undefined){ sets.push('profile = ?'); vals.push(JSON.stringify(cleanProfile(b.profile))); }
    if (b.avatar !== undefined){ sets.push('avatar = ?'); vals.push(cleanImage(b.avatar, 40000)); }
    if (b.photo !== undefined){ sets.push('photo = ?'); vals.push(cleanImage(b.photo, 90000)); }
    if (!sets.length) return json({ok: true});
    sets.push('pv = ?'); vals.push(now);
    try { await db.prepare(`UPDATE dogs SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, dog.id).run(); }
    catch (e){ if (/UNIQUE/i.test(String(e && e.message))) return fail(409, 'name_taken'); throw e; }
    return json({ok: true, pv: now});
  }

  if (path === '/api/dog/hold'){
    await db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(me.id, now, dog.id).run();
    // a walk the other person was on is now over
    if (dog.holder && dog.holder !== me.id) await db.prepare('DELETE FROM dlive WHERE dog_id = ?').bind(dog.id).run();
    return json({ok: true, holder: me.id, holderAt: now});
  }

  // "年糕不在我身边": if I was marked as having the dog, it's with the other person
  if (path === '/api/dog/release'){
    const ms = await membersOf(db, dog.id);
    const other = ms.find(m => m.id !== me.id);
    if (other && dog.holder === me.id){
      await db.batch([
        db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(other.id, now, dog.id),
        db.prepare('DELETE FROM dlive WHERE dog_id = ?').bind(dog.id)
      ]);
      return json({ok: true, holder: other.id, holderAt: now});
    }
    return json({ok: true, holder: dog.holder, holderAt: dog.holder_at});
  }

  if (path === '/api/dog/remove-member'){
    const b = await body(req);
    const target = clean(b.id, 64);
    if (target === me.id) return fail(400, 'use_leave');
    await db.prepare('DELETE FROM members WHERE id = ? AND dog_id = ?').bind(target, dog.id).run();
    if (dog.holder === target) await db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(me.id, now, dog.id).run();
    return json({ok: true});
  }

  if (path === '/api/dog/leave'){
    const ms = await membersOf(db, dog.id);
    if (ms.length <= 1){
      // last person out: the dog and everything recorded for it go, and the name becomes free again
      await db.batch([
        db.prepare('DELETE FROM members WHERE dog_id = ?').bind(dog.id),
        db.prepare('DELETE FROM devents WHERE dog_id = ?').bind(dog.id),
        db.prepare('DELETE FROM dcells WHERE dog_id = ?').bind(dog.id),
        db.prepare('DELETE FROM dfriends WHERE a = ? OR b = ?').bind(dog.id, dog.id),
        db.prepare('DELETE FROM dlive WHERE dog_id = ?').bind(dog.id),
        db.prepare('DELETE FROM dogs WHERE id = ?').bind(dog.id)
      ]);
      return json({ok: true, dogDeleted: true});
    }
    await db.prepare('DELETE FROM members WHERE id = ?').bind(me.id).run();
    const other = ms.find(m => m.id !== me.id);
    if (dog.holder === me.id && other) await db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(other.id, now, dog.id).run();
    return json({ok: true, dogDeleted: false});
  }

  if (path === '/api/reset-code' || path === '/api/reset-fam-code'){
    const col = path === '/api/reset-code' ? 'code' : 'fam_code';
    const c = await uniqueCode(db, col);
    await db.prepare(`UPDATE dogs SET ${col} = ? WHERE id = ?`).bind(c, dog.id).run();
    return json({code: c});
  }

  if (path === '/api/friends/add'){
    const b = await body(req);
    const code = clean(b.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const other = await db.prepare('SELECT * FROM dogs WHERE code = ?').bind(code).first();
    if (!other) return fail(404, 'no_such_code');
    if (other.id === dog.id) return fail(400, 'self');
    await db.batch([
      db.prepare('INSERT OR IGNORE INTO dfriends (a, b, created) VALUES (?,?,?)').bind(dog.id, other.id, now),
      db.prepare('INSERT OR IGNORE INTO dfriends (a, b, created) VALUES (?,?,?)').bind(other.id, dog.id, now)
    ]);
    return json({friend: publicDog(other)});
  }

  if (path === '/api/friends/remove'){
    const b = await body(req);
    const fid = clean(b.id, 64);
    await db.batch([
      db.prepare('DELETE FROM dfriends WHERE a = ? AND b = ?').bind(dog.id, fid),
      db.prepare('DELETE FROM dfriends WHERE a = ? AND b = ?').bind(fid, dog.id)
    ]);
    return json({ok: true});
  }

  if (path === '/api/poke'){
    const b = await body(req);
    const to = clean(b.to, 64);
    const isFriend = await db.prepare('SELECT 1 FROM dfriends WHERE a = ? AND b = ?').bind(dog.id, to).first();
    if (!isFriend) return fail(403, 'not_friend');
    const recent = await db.prepare('SELECT COUNT(*) AS n FROM dpokes WHERE from_dog = ? AND to_dog = ? AND t > ?').bind(dog.id, to, now - 60000).first();
    if (recent && recent.n >= 3) return fail(429, 'slow_down');
    await db.prepare('INSERT INTO dpokes (from_dog, from_role, to_dog, t) VALUES (?,?,?,?)').bind(dog.id, me.role, to, now).run();
    return json({ok: true});
  }

  if (path === '/api/sync') return sync(req, db, me, dog, now);

  return fail(404, 'unknown');
}

/* The periodic call. Sends my pending diary changes, footprints and position; receives everything new. */
async function sync(req, db, me, dog, now){
  const b = await body(req);
  let members = await membersOf(db, dog.id);
  const holderId = members.length < 2 ? me.id : dog.holder;
  const isHolder = holderId === me.id;
  const writes = [db.prepare('UPDATE members SET seen = ? WHERE id = ?').bind(now, me.id)];
  if (members.length < 2 && dog.holder !== me.id){ writes.push(db.prepare('UPDATE dogs SET holder = ?, holder_at = ? WHERE id = ?').bind(me.id, now, dog.id)); dog.holder = me.id; }

  // 1. diary changes from this phone (last write wins)
  const out = Array.isArray(b.outbox) ? b.outbox.slice(0, 60) : [];
  const accepted = [];
  for (const e of out){
    if (!e || typeof e.id !== 'string' || e.id.length > 40 || !/^[A-Za-z0-9_-]+$/.test(e.id)) continue;
    const existing = await db.prepare('SELECT dog_id FROM devents WHERE id = ?').bind(e.id).first();
    if (existing && existing.dog_id !== dog.id) continue;
    if (e.deleted){
      writes.push(db.prepare(`INSERT INTO devents (id, dog_id, data, t, updated, deleted, by_role) VALUES (?,?,NULL,?,?,1,?)
        ON CONFLICT(id) DO UPDATE SET data = NULL, deleted = 1, updated = excluded.updated`).bind(e.id, dog.id, okNum(e.t, 0, 9e15) ? e.t : now, now, me.role));
    } else {
      const data = JSON.stringify(e.data || {});
      if (data.length > MAX_EVENT_BYTES || !okNum(e.t, 0, 9e15)) continue;
      writes.push(db.prepare(`INSERT INTO devents (id, dog_id, data, t, updated, deleted, by_role) VALUES (?,?,?,?,?,0,?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, t = excluded.t, updated = excluded.updated, deleted = 0`).bind(e.id, dog.id, data, e.t, now, me.role));
    }
    accepted.push(e.id);
  }

  // 2. footprints (only the holder's phone can add them)
  const cells = isHolder && Array.isArray(b.cells) ? b.cells.filter(k => typeof k === 'string' && /^-?\d{1,8},-?\d{1,8}$/.test(k)).slice(0, 3000) : [];
  for (const k of cells) writes.push(db.prepare('INSERT OR IGNORE INTO dcells (dog_id, k, t) VALUES (?,?,?)').bind(dog.id, k, now));

  // 3. position: family sees the holder whenever their app is open; friends only during a walk
  const p = b.pos;
  if (isHolder && p && okNum(p.lat, -90, 90) && okNum(p.lng, -180, 180)){
    writes.push(db.prepare('UPDATE dogs SET hpos_lat = ?, hpos_lng = ?, hpos_acc = ?, hpos_at = ? WHERE id = ?')
      .bind(p.lat, p.lng, okNum(p.acc, 0, 1e5) ? p.acc : null, now, dog.id));
  }
  const w = b.walk;
  const walking = isHolder && w && okNum(w.lat, -90, 90) && okNum(w.lng, -180, 180) && b.share !== false;
  if (walking){
    writes.push(db.prepare(`INSERT INTO dlive (dog_id, lat, lng, start, dist, updated) VALUES (?,?,?,?,?,?)
      ON CONFLICT(dog_id) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, start = excluded.start, dist = excluded.dist, updated = excluded.updated`)
      .bind(dog.id, w.lat, w.lng, okNum(w.start, 0, now + 60000) ? w.start : now, okNum(w.dist, 0, 1e6) ? w.dist : 0, now));
  } else if (isHolder){
    writes.push(db.prepare('DELETE FROM dlive WHERE dog_id = ?').bind(dog.id));
  }
  const week = typeof b.week === 'string' && /^\d{4}-W\d{2}$/.test(b.week) ? b.week : null;
  if (isHolder && b.walkEnded && okNum(b.walkEnded.dist, 0, 1e6)){
    const d = b.walkEnded.dist;
    writes.push(week
      ? db.prepare(`UPDATE dogs SET last_walk = ?, last_walk_dist = ?, week_dist = CASE WHEN week_key = ? THEN COALESCE(week_dist, 0) + ? ELSE ? END, week_key = ? WHERE id = ?`).bind(now, d, week, d, d, week, dog.id)
      : db.prepare('UPDATE dogs SET last_walk = ?, last_walk_dist = ? WHERE id = ?').bind(now, d, dog.id));
  }
  await db.batch(writes);

  if (walking){
    const near = await db.prepare('SELECT l.* FROM dlive l JOIN dfriends f ON f.b = l.dog_id WHERE f.a = ? AND l.updated > ?').bind(dog.id, now - 60000).all();
    for (const o of near.results || []){
      if (haversine(w.lat, w.lng, o.lat, o.lng) > MEET_RADIUS_M) continue;
      const [x, y] = dog.id < o.dog_id ? [dog.id, o.dog_id] : [o.dog_id, dog.id];
      const prev = await db.prepare('SELECT id FROM dmeets WHERE a = ? AND b = ? AND t > ?').bind(x, y, now - MEET_COOLDOWN_MS).first();
      if (!prev) await db.prepare('INSERT INTO dmeets (a, b, t, lat, lng) VALUES (?,?,?,?,?)').bind(x, y, now, (w.lat + o.lat) / 2, (w.lng + o.lng) / 2).run();
    }
  }

  // 4. what's new for this phone
  const fresh = await db.prepare('SELECT * FROM dogs WHERE id = ?').bind(dog.id).first();
  members = await membersOf(db, dog.id);
  const evSince = okNum(b.evCursor, 0, 9e15) ? b.evCursor : 0;
  const ev = await db.prepare('SELECT id, data, t, updated, deleted, by_role FROM devents WHERE dog_id = ? AND updated > ? ORDER BY updated LIMIT 400')
    .bind(dog.id, Math.max(0, evSince - 5000)).all();
  const events = (ev.results || []).map(r => ({id: r.id, t: r.t, deleted: !!r.deleted, by: r.by_role, data: r.deleted ? null : JSON.parse(r.data || '{}'), updated: r.updated}));
  const evCursor = events.length ? events[events.length - 1].updated : evSince;
  const cSince = okNum(b.cellCursor, 0, 9e15) ? b.cellCursor : 0;
  const cr = await db.prepare('SELECT k, t FROM dcells WHERE dog_id = ? AND t > ? ORDER BY t LIMIT 20000').bind(dog.id, Math.max(0, cSince - 5000)).all();
  const cellRows = cr.results || [];
  const cellCursor = cellRows.length ? cellRows[cellRows.length - 1].t : cSince;

  const fr = await db.prepare(`SELECT d.*, l.lat AS l_lat, l.lng AS l_lng, l.start AS l_start, l.dist AS l_dist, l.updated AS l_updated,
      (SELECT COUNT(*) FROM dmeets e WHERE (e.a = d.id AND e.b = ?1) OR (e.b = d.id AND e.a = ?1)) AS together
    FROM dfriends f JOIN dogs d ON d.id = f.b LEFT JOIN dlive l ON l.dog_id = d.id AND l.updated > ?2
    WHERE f.a = ?1 ORDER BY d.name`).bind(dog.id, now - LIVE_FRESH_MS).all();
  const friends = (fr.results || []).map(r => Object.assign(publicDog(r), {
    together: r.together || 0,
    weekDist: week && r.week_key === week ? (r.week_dist || 0) : 0,
    walking: r.l_updated ? {lat: r.l_lat, lng: r.l_lng, start: r.l_start, dist: r.l_dist, updated: r.l_updated} : null
  }));
  const meets = ((await db.prepare('SELECT * FROM dmeets WHERE (a = ?1 OR b = ?1) AND t > ?2 ORDER BY t LIMIT 20').bind(dog.id, me.meet_cur || 0).all()).results || [])
    .map(e => ({id: e.id, friend: e.a === dog.id ? e.b : e.a, t: e.t, lat: e.lat, lng: e.lng}));
  const pokes = ((await db.prepare('SELECT * FROM dpokes WHERE to_dog = ? AND t > ? ORDER BY t LIMIT 20').bind(dog.id, me.poke_cur || 0).all()).results || [])
    .map(x => ({id: x.id, from: x.from_dog, role: x.from_role, t: x.t}));
  if (meets.length || pokes.length){
    await db.prepare('UPDATE members SET meet_cur = ?, poke_cur = ? WHERE id = ?')
      .bind(meets.length ? meets[meets.length - 1].t : (me.meet_cur || 0), pokes.length ? pokes[pokes.length - 1].t : (me.poke_cur || 0), me.id).run();
  }

  return json({
    dog: dogForFamily(fresh, members, b.pv !== fresh.pv), you: me.id, accepted,
    events, evCursor, more: events.length === 400,
    cells: cellRows.map(r => r.k), cellCursor,
    friends, meets, pokes, myWeek: week && fresh.week_key === week ? (fresh.week_dist || 0) : 0, now
  });
}

export default {
  async fetch(req, env){
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')){
      try { return await handleApi(req, env, url); }
      catch (e) { return fail(500, 'server'); }
    }
    return env.ASSETS.fetch(req);
  }
};
