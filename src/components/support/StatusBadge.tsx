import { contactStatusLabel, ticketStatusLabel } from "@/lib/support/constants";

const TICKET_TONE: Record<string, string> = {
  open: "bg-amber-50 text-amber-800 border-amber-200",
  in_progress: "bg-sky-50 text-sky-800 border-sky-200",
  waiting_for_customer: "bg-violet-50 text-violet-800 border-violet-200",
  resolved: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-neutral-100 text-neutral-600 border-neutral-200",
};
const CONTACT_TONE: Record<string, string> = {
  new: "bg-amber-50 text-amber-800 border-amber-200",
  read: "bg-sky-50 text-sky-800 border-sky-200",
  replied: "bg-emerald-50 text-emerald-800 border-emerald-200",
  closed: "bg-neutral-100 text-neutral-600 border-neutral-200",
};

export function StatusBadge({ kind, status }: { kind: "ticket" | "contact"; status: string }) {
  const tone = (kind === "ticket" ? TICKET_TONE : CONTACT_TONE)[status] || "bg-neutral-100 text-neutral-600 border-neutral-200";
  const label = kind === "ticket" ? ticketStatusLabel(status) : contactStatusLabel(status);
  return <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider ${tone}`}>{label}</span>;
}
