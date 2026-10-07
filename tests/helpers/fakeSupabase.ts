// Minimal in-memory stand-in for the parts of supabase-js used by the server code under test.
// Supports: select/insert/update/upsert, eq/neq/in/is/not/lt/lte/or filters, order/limit,
// maybeSingle/single, unique constraints, and the "*, order_items (*)" / "orders(order_number)" embeds.
import { randomUUID } from "crypto";

type Row = Record<string, any>;
type Filter = (r: Row) => boolean;

const UNIQUE: Record<string, string[]> = {
  orders: ["order_number", "shiprocket_order_id", "shiprocket_shipment_id", "shiprocket_awb"],
  email_events: ["event_key"],
  shipping_webhook_events: ["dedupe_key"],
  shipment_tracking_events: ["dedupe_key"],
  payments: ["razorpay_payment_id"],
  store_settings: ["key"],
};

const DEFAULTS: Record<string, () => Row> = {
  email_events: () => ({ status: "pending", attempts: 0, locked_until: null, next_retry_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
  shipping_webhook_events: () => ({ status: "received", attempts: 0, received_at: new Date().toISOString() }),
  orders: () => ({ fulfillment_attempts: 0, fulfillment_locked_until: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }),
};

function parseValue(v: string): any {
  if (v === "null") return null;
  if (v === "true") return true;
  if (v === "false") return false;
  return v;
}

const cmp = (a: any, b: any) => {
  const na = Number(a), nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && typeof a !== "string") return na - nb;
  return String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0;
};

function splitTopLevel(s: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}

function condition(expr: string): Filter {
  if (expr.startsWith("and(")) {
    const parts = splitTopLevel(expr.slice(4, -1)).map(condition);
    return (r) => parts.every((p) => p(r));
  }
  const [col, op, ...rest] = expr.split(".");
  const raw = rest.join(".");
  const val = parseValue(raw);
  switch (op) {
    case "eq": return (r) => String(r[col]) === String(val);
    case "is": return (r) => (val === null ? r[col] === null || r[col] === undefined : r[col] === val);
    case "lt": return (r) => r[col] !== null && r[col] !== undefined && cmp(r[col], val) < 0;
    case "lte": return (r) => r[col] !== null && r[col] !== undefined && cmp(r[col], val) <= 0;
    default: throw new Error(`fake: unsupported or() op ${op}`);
  }
}

export class FakeDb {
  tables: Record<string, Row[]> = {};
  table(name: string) {
    return (this.tables[name] ||= []);
  }
  from(name: string) {
    return new Query(this, name);
  }
  // supabase.auth is not used by the code under test through the admin client
}

class Query implements PromiseLike<any> {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "update" | "upsert" | "delete" = "select";
  private payload: any;
  private opts: any = {};
  private selectCols: string | null = null;
  private countMode = false;
  private head = false;
  private orderBy: { col: string; asc: boolean }[] = [];
  private lim: number | null = null;
  private single: "maybe" | "one" | null = null;

  constructor(private db: FakeDb, private name: string) {}

  select(cols = "*", opts: any = {}) {
    if (this.op === "select") this.op = "select";
    this.selectCols = cols;
    this.countMode = opts.count === "exact";
    this.head = Boolean(opts.head);
    return this;
  }
  insert(rows: any) { this.op = "insert"; this.payload = rows; return this; }
  update(vals: any) { this.op = "update"; this.payload = vals; return this; }
  upsert(rows: any, opts: any = {}) { this.op = "upsert"; this.payload = rows; this.opts = opts; return this; }
  delete() { this.op = "delete"; return this; }
  eq(c: string, v: any) { this.filters.push((r) => String(r[c]) === String(v)); return this; }
  neq(c: string, v: any) { this.filters.push((r) => String(r[c]) !== String(v)); return this; }
  in(c: string, vs: any[]) { this.filters.push((r) => vs.map(String).includes(String(r[c]))); return this; }
  is(c: string, v: any) { this.filters.push((r) => (v === null ? r[c] === null || r[c] === undefined : r[c] === v)); return this; }
  lt(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) < 0); return this; }
  lte(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) <= 0); return this; }
  gte(c: string, v: any) { this.filters.push((r) => r[c] != null && cmp(r[c], v) >= 0); return this; }
  not(c: string, op: string, v: any) {
    if (op === "is") this.filters.push((r) => !(r[c] === null || r[c] === undefined));
    else if (op === "in") {
      const list = String(v).replace(/[()]/g, "").split(",");
      this.filters.push((r) => !list.includes(String(r[c])));
    } else throw new Error(`fake: not ${op}`);
    return this;
  }
  or(expr: string) {
    const parts = splitTopLevel(expr).map(condition);
    this.filters.push((r) => parts.some((p) => p(r)));
    return this;
  }
  order(col: string, o: any = {}) { this.orderBy.push({ col, asc: o.ascending !== false }); return this; }
  limit(n: number) { this.lim = n; return this; }
  maybeSingle() { this.single = "maybe"; return this; }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<T1 = any, T2 = never>(res?: ((v: any) => T1 | PromiseLike<T1>) | null, rej?: ((e: any) => T2 | PromiseLike<T2>) | null) {
    return Promise.resolve().then(() => this.run()).then(res, rej);
  }

  private match(rows: Row[]) {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private embed(row: Row): Row {
    const out = { ...row };
    const cols = this.selectCols || "*";
    if (/order_items\s*\(\*\)/.test(cols)) out.order_items = this.db.table("order_items").filter((i) => i.order_id === row.id).map((i) => ({ ...i }));
    if (/orders\s*\(order_number\)/.test(cols)) {
      const o = this.db.table("orders").find((x) => x.id === row.order_id);
      out.orders = o ? { order_number: o.order_number } : null;
    }
    return out;
  }

  private violates(row: Row, ignoreId?: string) {
    for (const col of UNIQUE[this.name] || []) {
      if (row[col] === null || row[col] === undefined) continue;
      if (this.db.table(this.name).some((r) => r.id !== ignoreId && r !== row && String(r[col]) === String(row[col]))) return col;
    }
    return null;
  }

  private finish(rows: Row[]) {
    let out = rows.map((r) => this.embed(r));
    for (const o of this.orderBy) out.sort((a, b) => (o.asc ? 1 : -1) * cmp(a[o.col] ?? "", b[o.col] ?? ""));
    if (this.lim !== null) out = out.slice(0, this.lim);
    if (this.single) {
      if (out.length > 1 && this.single === "maybe") return { data: null, error: { message: "multiple rows" } };
      return { data: out[0] ?? null, error: null };
    }
    if (this.head) return { data: null, error: null, count: rows.length };
    return { data: this.selectCols || this.op === "select" ? out : null, error: null, count: this.countMode ? rows.length : null };
  }

  private run(): any {
    const table = this.db.table(this.name);
    if (this.op === "select") return this.finish(this.match(table));

    if (this.op === "insert" || this.op === "upsert") {
      const rows: Row[] = (Array.isArray(this.payload) ? this.payload : [this.payload]).map((r: Row): Row => ({ id: randomUUID(), ...(DEFAULTS[this.name]?.() || {}), ...r }));
      const written: Row[] = [];
      for (const row of rows) {
        const conflictCol = this.op === "upsert" ? this.opts.onConflict : null;
        const existing = conflictCol ? table.find((r) => String(r[conflictCol]) === String(row[conflictCol])) : null;
        if (existing) {
          if (this.opts.ignoreDuplicates) continue;
          Object.assign(existing, row, { id: existing.id });
          written.push(existing);
          continue;
        }
        const bad = this.violates(row);
        if (bad) return { data: null, error: { code: "23505", message: `duplicate key value violates unique constraint (${bad})` } };
        table.push(row);
        written.push(row);
      }
      const saved = this.selectCols;
      this.filters = [];
      return saved ? this.finish(written) : { data: null, error: null };
    }

    if (this.op === "update") {
      const rows = this.match(table);
      for (const r of rows) {
        const next = { ...r, ...this.payload };
        const bad = this.violates(next, r.id);
        if (bad) return { data: null, error: { code: "23505", message: `duplicate key (${bad})` } };
      }
      for (const r of rows) Object.assign(r, this.payload);
      return this.selectCols ? this.finish(rows) : { data: null, error: null };
    }

    if (this.op === "delete") {
      const rows = this.match(table);
      this.db.tables[this.name] = table.filter((r) => !rows.includes(r));
      return { data: null, error: null };
    }
  }
}
