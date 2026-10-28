// Server-side tests for the admin Hero Banners feature: the upload route (real image processing with sharp) and the
// edit / reorder / delete actions, run against a small in-memory stand-in for the homepage_banners table, its storage
// bucket and the save_homepage_banner_order() database function.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";
import sharp from "sharp";

type Row = Record<string, any>;

class Store {
  rows: Row[] = [];
  objects = new Map<string, Buffer>();
  missingTable = false;
  forceInsertConflict = false;
  audits: any[] = [];

  from(table: string) {
    return new Query(this, table);
  }

  storage = {
    from: (bucket: string) => ({
      upload: async (path: string, data: Buffer) => {
        this.objects.set(path, data);
        return { error: null };
      },
      getPublicUrl: (path: string) => ({ data: { publicUrl: `https://abcd.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      remove: async (paths: string[]) => {
        paths.forEach((p) => this.objects.delete(p));
        return { error: null };
      },
    }),
  };

  // Mirrors public.save_homepage_banner_order(): listed ids first, then the rest in their old order, renumbered 1..n
  async rpc(name: string, args: { p_ids: string[] }) {
    if (name !== "save_homepage_banner_order") return { data: null, error: { code: "42883", message: "function does not exist" } };
    const given = Array.from(new Set(args.p_ids)).map((id) => this.rows.find((r) => r.id === id)).filter(Boolean) as Row[];
    const rest = this.rows.filter((r) => !given.includes(r)).sort((a, b) => a.position - b.position);
    [...given, ...rest].forEach((r, i) => (r.position = i + 1));
    return { data: null, error: null };
  }
}

class Query {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row = {};
  private filters: Array<[string, any]> = [];
  private orderCol: string | null = null;
  private mode: "many" | "single" | "maybe" = "many";
  constructor(private store: Store, private table: string) {}

  select() {
    return this;
  }
  insert(p: Row) {
    this.op = "insert";
    this.payload = p;
    return this;
  }
  update(p: Row) {
    this.op = "update";
    this.payload = p;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: any) {
    this.filters.push([c, v]);
    return this;
  }
  order(c: string) {
    this.orderCol = c;
    return this;
  }
  single() {
    this.mode = "single";
    return this;
  }
  maybeSingle() {
    this.mode = "maybe";
    return this;
  }
  then(resolve: any, reject: any) {
    return Promise.resolve(this.exec()).then(resolve, reject);
  }

  private exec(): { data: any; error: any } {
    const s = this.store;
    if (this.table !== "homepage_banners") return { data: null, error: null };
    if (s.missingTable) return { data: null, error: { code: "42P01", message: 'relation "homepage_banners" does not exist' } };

    const match = (r: Row) => this.filters.every(([c, v]) => r[c] === v);
    let data: Row[] | null = null;

    if (this.op === "select") {
      data = s.rows.filter(match).map((r) => ({ ...r }));
      if (this.orderCol) data.sort((a, b) => a[this.orderCol!] - b[this.orderCol!]);
    } else if (this.op === "insert") {
      const p = this.payload;
      if (s.forceInsertConflict || s.rows.some((r) => r.position === p.position)) {
        return { data: null, error: { code: "23505", message: "duplicate key value violates unique constraint" } };
      }
      if (p.position < 1 || p.position > 5) return { data: null, error: { code: "23514", message: "check constraint" } };
      const row = { id: randomUUID(), is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), ...p };
      s.rows.push(row);
      data = [{ ...row }];
    } else if (this.op === "update") {
      const hit = s.rows.filter(match);
      hit.forEach((r) => Object.assign(r, this.payload, { updated_at: new Date().toISOString() }));
      data = hit.map((r) => ({ ...r }));
    } else {
      s.rows = s.rows.filter((r) => !match(r));
      return { data: null, error: null };
    }

    if (this.mode === "single") return data[0] ? { data: data[0], error: null } : { data: null, error: { code: "PGRST116", message: "no rows" } };
    if (this.mode === "maybe") return { data: data[0] ?? null, error: null };
    return { data, error: null };
  }
}

let store: Store;
let session: any;

const ADMIN = { ok: true, userId: "22222222-2222-4222-8222-222222222222", email: "admin@example.com", role: "admin" };

vi.mock("next/cache", () => ({ revalidatePath: () => {}, revalidateTag: () => {}, unstable_cache: (fn: any) => fn }));
vi.mock("@/lib/supabase", () => ({ createAdminClient: () => store, createServerClient: async () => ({}) }));
vi.mock("@/lib/auth/admin", () => ({
  requireAdmin: async (opts: { adminOnly?: boolean } = {}) =>
    session.ok && opts.adminOnly && session.role !== "admin" ? { ok: false, status: 403, error: "Only an administrator can perform this action." } : session,
}));
vi.mock("@/lib/security/audit", () => ({ audit: async (e: any) => store.audits.push(e) }));

import { __resetMemoryLimiter } from "@/lib/security/rate-limit";
import { deleteHeroBannerAction, getHeroBannersAdminAction, moveHeroBannerAction, updateHeroBannerAction } from "@/app/actions/hero-banners";
import { mapHeroRow } from "@/lib/hero/mapper";

const png = (w: number, h: number) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 180, g: 60, b: 80 } } }).png().toBuffer();

async function upload(
  fields: Record<string, string>,
  file: { data: Buffer | Uint8Array; name?: string; type?: string } | null,
  headers: Record<string, string> = {}
) {
  const form = new FormData();
  if (file) form.append("file", new File([file.data as BlobPart], file.name ?? "banner.png", { type: file.type ?? "image/png" }));
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  const { POST } = await import("@/app/api/admin/hero-banners/route");
  const res = await POST(new Request("http://shop.test/api/admin/hero-banners", { method: "POST", body: form, headers }) as any);
  return { status: res.status, body: await res.json() };
}

const good = async () => ({ data: await png(1920, 800) });
const addBanner = async (extra: Record<string, string> = {}) => upload({ altText: "Festive edit", linkUrl: "/shop", ...extra }, await good());

beforeEach(() => {
  store = new Store();
  session = ADMIN;
  __resetMemoryLimiter();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
});

describe("hero banner upload route", () => {
  it("is closed to visitors, staff and cross-origin requests", async () => {
    session = { ok: false, status: 401, error: "Please sign in to continue." };
    expect((await addBanner()).status).toBe(401);
    session = { ok: false, status: 403, error: "You do not have permission to perform this action." };
    expect((await addBanner()).status).toBe(403);
    session = { ...ADMIN, role: "staff" };
    expect((await addBanner()).status).toBe(403);
    session = ADMIN;
    expect((await upload({}, await good(), { origin: "https://evil.example", host: "shop.test" })).status).toBe(403);
    expect(store.rows).toHaveLength(0);
    expect(store.objects.size).toBe(0);
  });

  it("publishes a valid banner as an optimised WebP on the first position", async () => {
    const { status, body } = await addBanner({ buttonText: "Shop now" });
    expect(status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.banner).toMatchObject({ position: 1, isActive: true, alt: "Festive edit", linkUrl: "/shop", buttonText: "Shop now" });
    expect(body.banner.imageUrl).toMatch(/^https:\/\/abcd\.supabase\.co\/storage\/v1\/object\/public\/hero-banners\/.+\.webp$/);

    // What is stored is a real WebP, not the uploaded PNG
    const [path] = Array.from(store.objects.keys());
    expect((await sharp(store.objects.get(path)!).metadata()).format).toBe("webp");

    // And the storefront accepts it
    expect(mapHeroRow({ ...store.rows[0] })).toMatchObject({ imageUrl: body.banner.imageUrl, linkUrl: "/shop" });
    expect(store.audits.map((a) => a.action)).toContain("settings.hero_banners");
  });

  it("keeps the order of uploads and refuses a sixth banner", async () => {
    for (let i = 1; i <= 5; i++) {
      const r = await addBanner({ altText: `Banner ${i}` });
      expect(r.status, `banner ${i}`).toBe(200);
      expect(r.body.banner.position).toBe(i);
    }
    const sixth = await addBanner({ altText: "Banner 6" });
    expect(sixth.status).toBe(400);
    expect(sixth.body.error).toMatch(/at most 5/);
    expect(store.rows).toHaveLength(5);
    expect(store.objects.size).toBe(5); // the refused upload left nothing behind
  });

  it("shrinks very large pictures to the stored width", async () => {
    const r = await upload({ altText: "Big" }, { data: await png(4000, 1666) });
    expect(r.status).toBe(200);
    expect(r.body.banner.width).toBe(2400);
  });

  it("rejects bad files with a clear message and stores nothing", async () => {
    const cases: Array<[string, Parameters<typeof upload>[1], number, RegExp]> = [
      ["no file", null, 400, /No image/],
      ["empty file", { data: Buffer.alloc(0) }, 400, /empty/],
      ["a GIF", { data: Buffer.from("GIF89a"), name: "a.gif", type: "image/gif" }, 415, /JPG, PNG or WebP/],
      ["text pretending to be a PNG", { data: Buffer.from("<script>alert(1)</script>") }, 422, /could not be processed/],
      ["too small", { data: await png(800, 333) }, 422, /too small/],
      ["a square image", { data: await png(1500, 1500) }, 422, /not suitable/],
      ["a tall phone photo", { data: await png(1200, 2400) }, 422, /not suitable/],
    ];
    for (const [name, file, status, message] of cases) {
      const r = await upload({ altText: "x" }, file);
      expect(r.status, name).toBe(status);
      expect(r.body.error, name).toMatch(message);
    }
    expect(store.rows).toHaveLength(0);
    expect(store.objects.size).toBe(0);
  });

  it("rejects unsafe links and over-long text before touching storage", async () => {
    for (const linkUrl of ["//evil.com", "https://evil.com", "javascript:alert(1)", "/admin", "/api/x"]) {
      const r = await addBanner({ linkUrl });
      expect(r.status, linkUrl).toBe(400);
    }
    expect((await addBanner({ altText: "a".repeat(201) })).status).toBe(400);
    expect((await addBanner({ buttonText: "b".repeat(41) })).status).toBe(400);
    expect(store.rows).toHaveLength(0);
    expect(store.objects.size).toBe(0);
  });

  it("falls back to a default description and the shop link", async () => {
    const r = await upload({}, await good());
    expect(r.status).toBe(200);
    expect(r.body.banner).toMatchObject({ alt: "Raveena Sarees collection", linkUrl: "/shop", buttonText: null });
  });

  it("replaces a picture in place and deletes the old file", async () => {
    const first = await addBanner();
    const oldPath = store.rows[0].storage_path;
    const r = await upload({ replaceId: first.body.banner.id }, { data: await png(2000, 833) });
    expect(r.status).toBe(200);
    expect(store.rows).toHaveLength(1);
    expect(store.rows[0]).toMatchObject({ id: first.body.banner.id, position: 1, alt_text: "Festive edit" });
    expect(store.rows[0].storage_path).not.toBe(oldPath);
    expect(store.objects.has(oldPath)).toBe(false);
    expect(store.objects.size).toBe(1);
  });

  it("reports a missing banner on replace, and a clean setup message when the migration has not been run", async () => {
    expect((await upload({ replaceId: randomUUID() }, await good())).status).toBe(404);
    expect((await upload({ replaceId: "not-a-uuid" }, await good())).status).toBe(400);
    store.missingTable = true;
    const r = await addBanner();
    expect(r.status).toBe(503);
    expect(r.body.error).toMatch(/migration 010/);
    expect(store.objects.size).toBe(0);
  });

  it("cleans up the stored file when two uploads collide on the same position", async () => {
    store.forceInsertConflict = true;
    const r = await addBanner();
    expect(r.status).toBe(409);
    expect(store.rows).toHaveLength(0);
    expect(store.objects.size).toBe(0);
  });

  it("closes a gap in the order before adding the next banner", async () => {
    store.rows.push({ id: randomUUID(), position: 1, storage_path: "a.webp", public_url: "https://abcd.supabase.co/a.webp" });
    store.rows.push({ id: randomUUID(), position: 3, storage_path: "b.webp", public_url: "https://abcd.supabase.co/b.webp" });
    const r = await addBanner();
    expect(r.status).toBe(200);
    expect(store.rows.map((x) => x.position).sort()).toEqual([1, 2, 3]);
    expect(r.body.banner.position).toBe(3);
  });
});

describe("hero banner actions", () => {
  const seed = async (n: number) => {
    const ids: string[] = [];
    for (let i = 1; i <= n; i++) ids.push((await addBanner({ altText: `Banner ${i}` })).body.banner.id);
    return ids;
  };

  it("require an administrator", async () => {
    const [id] = await seed(1);
    session = { ...ADMIN, role: "staff" };
    expect((await getHeroBannersAdminAction()).success).toBe(false);
    expect((await updateHeroBannerAction(id, { altText: "x", linkUrl: "/shop", buttonText: "", isActive: true })).success).toBe(false);
    expect((await moveHeroBannerAction(id, "down")).success).toBe(false);
    expect((await deleteHeroBannerAction(id)).success).toBe(false);
    expect(store.rows).toHaveLength(1);
  });

  it("lists banners in display order, hidden ones included", async () => {
    const ids = await seed(3);
    await moveHeroBannerAction(ids[2], "up");
    await updateHeroBannerAction(ids[0], { altText: "Banner 1", linkUrl: "/shop", buttonText: "", isActive: false });
    const res = await getHeroBannersAdminAction();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.banners.map((b) => b.alt)).toEqual(["Banner 1", "Banner 3", "Banner 2"]);
      expect(res.banners.map((b) => b.position)).toEqual([1, 2, 3]);
      expect(res.banners[0].isActive).toBe(false);
    }
  });

  it("edits text, link and visibility with the same validation as the upload", async () => {
    const [id] = await seed(1);
    const ok = await updateHeroBannerAction(id, { altText: "  New   text ", linkUrl: "/category/silk-sarees", buttonText: "Browse", isActive: false });
    expect(ok.success).toBe(true);
    expect(store.rows[0]).toMatchObject({ alt_text: "New text", link_url: "/category/silk-sarees", button_text: "Browse", is_active: false });

    for (const linkUrl of ["//evil.com", "https://evil.com", "/admin"]) {
      expect((await updateHeroBannerAction(id, { altText: "x", linkUrl, buttonText: "", isActive: true })).success, linkUrl).toBe(false);
    }
    expect(store.rows[0].link_url).toBe("/category/silk-sarees");
    expect((await updateHeroBannerAction("nope", { altText: "x", linkUrl: "/shop", buttonText: "", isActive: true })).success).toBe(false);
    expect((await updateHeroBannerAction(randomUUID(), { altText: "x", linkUrl: "/shop", buttonText: "", isActive: true })).success).toBe(false);
  });

  it("moves banners earlier and later, and ignores moves past either end", async () => {
    const ids = await seed(3);
    const order = () => [...store.rows].sort((a, b) => a.position - b.position).map((r) => r.id);

    expect((await moveHeroBannerAction(ids[0], "up")).success).toBe(true); // already first
    expect(order()).toEqual(ids);
    expect((await moveHeroBannerAction(ids[2], "down")).success).toBe(true); // already last
    expect(order()).toEqual(ids);

    await moveHeroBannerAction(ids[0], "down");
    expect(order()).toEqual([ids[1], ids[0], ids[2]]);
    await moveHeroBannerAction(ids[2], "up");
    expect(order()).toEqual([ids[1], ids[2], ids[0]]);
    expect(store.rows.map((r) => r.position).sort()).toEqual([1, 2, 3]);

    expect((await moveHeroBannerAction(ids[0], "sideways" as any)).success).toBe(false);
    expect((await moveHeroBannerAction(randomUUID(), "up")).success).toBe(false);
  });

  it("deletes a banner and its file, then closes the gap so the next upload still fits", async () => {
    const ids = await seed(3);
    const gonePath = store.rows.find((r) => r.id === ids[1])!.storage_path;
    expect((await deleteHeroBannerAction(ids[1])).success).toBe(true);
    expect(store.rows).toHaveLength(2);
    expect(store.objects.has(gonePath)).toBe(false);
    expect(store.rows.map((r) => r.position).sort()).toEqual([1, 2]);

    // deleting again is harmless
    expect((await deleteHeroBannerAction(ids[1])).success).toBe(true);

    // a full set of five can be rebuilt after deletions
    for (let i = 0; i < 3; i++) expect((await addBanner()).status).toBe(200);
    expect(store.rows).toHaveLength(5);
    expect(new Set(store.rows.map((r) => r.position)).size).toBe(5);
  });
});
