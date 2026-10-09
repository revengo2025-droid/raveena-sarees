"use client";

import React, { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Home, Briefcase, MapPin, Loader2, Star, Phone, X } from "lucide-react";
import { useApp } from "@/lib/store";
import type { SavedAddress } from "@/lib/types";
import { normaliseIndianMobile } from "@/lib/geo/india";
import { AddressForm, EMPTY_ADDRESS, validateAddress, type AddressErrors, type AddressFormValue } from "@/components/AddressForm";
import { AccountShell } from "@/components/account/AccountShell";
import { ConfirmDialog } from "@/components/account/ConfirmDialog";
import { Sk } from "@/components/ui/Skeletons";

export default function AddressesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SavedAddress | null>(null);

  // /account/addresses?new=1 (from the dashboard checklist) opens the form straight away
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") setFormOpen(true);
  }, []);

  const openNew = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <AccountShell
      title="Saved addresses"
      description="Save delivery addresses once and choose them at checkout."
      signInRedirect="/account/addresses"
      actions={
        !formOpen && (
          <button type="button" onClick={openNew} className="btn-primary px-5 min-h-[48px] text-xs rounded-full inline-flex items-center gap-1.5 shadow-md font-poppins font-semibold">
            <Plus className="w-4 h-4" aria-hidden="true" /> Add new address
          </button>
        )
      }
    >
      <AddressesContent
        formOpen={formOpen}
        editing={editing}
        onEdit={(a) => {
          setEditing(a);
          setFormOpen(true);
        }}
        onAdd={openNew}
        onCloseForm={() => {
          setFormOpen(false);
          setEditing(null);
        }}
      />
    </AccountShell>
  );
}

interface ContentProps {
  formOpen: boolean;
  editing: SavedAddress | null;
  onEdit: (a: SavedAddress) => void;
  onAdd: () => void;
  onCloseForm: () => void;
}

function AddressesContent({ formOpen, editing, onEdit, onAdd, onCloseForm }: ContentProps) {
  const { savedAddresses, addressesLoaded, updateAddress, deleteAddress } = useApp();
  const listHeadingRef = useRef<HTMLHeadingElement>(null);

  const [toDelete, setToDelete] = useState<SavedAddress | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [defaultBusyId, setDefaultBusyId] = useState<string | null>(null);

  const confirmDelete = async () => {
    if (!toDelete || deleting) return;
    setDeleting(true);
    const ok = await deleteAddress(toDelete.id);
    setDeleting(false);
    if (ok) {
      setToDelete(null);
      // The card (and its button) is gone: put focus somewhere sensible instead of losing it
      setTimeout(() => listHeadingRef.current?.focus(), 60);
    }
  };

  const makeDefault = async (a: SavedAddress) => {
    if (defaultBusyId) return;
    setDefaultBusyId(a.id);
    await updateAddress(a.id, { isDefault: true });
    setDefaultBusyId(null);
  };

  return (
    <>
      {formOpen && <AddressEditor key={editing?.id || "new"} editing={editing} isFirst={savedAddresses.length === 0} onDone={onCloseForm} />}

      <section aria-labelledby="addr-list-h">
        <h2 id="addr-list-h" ref={listHeadingRef} tabIndex={-1} className="text-lg font-serif mb-3 outline-none">
          Your addresses {addressesLoaded && <span className="text-sm text-neutral-500 font-sans">({savedAddresses.length})</span>}
        </h2>

        {!addressesLoaded ? (
          <div className="grid sm:grid-cols-2 gap-4" aria-busy="true" aria-label="Loading addresses">
            <Sk className="h-48 rounded-3xl" />
            <Sk className="h-48 rounded-3xl" />
          </div>
        ) : savedAddresses.length === 0 ? (
          !formOpen && (
            <div className="bg-white border-2 border-dashed border-brand-border rounded-3xl p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-brand-goldPale flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-brand-maroon" aria-hidden="true" />
              </div>
              <p className="text-base font-serif">No saved addresses yet</p>
              <p className="text-sm text-neutral-600 mt-1">Add one now and checkout takes seconds next time.</p>
              <button type="button" onClick={onAdd} className="btn-primary mt-5 px-6 min-h-[48px] text-xs rounded-full inline-flex items-center gap-1.5 shadow-md font-poppins font-semibold">
                <Plus className="w-4 h-4" aria-hidden="true" /> Add your first address
              </button>
            </div>
          )
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {savedAddresses.map((a) => {
              const TypeIcon = a.type === "Office" ? Briefcase : a.type === "Other" ? MapPin : Home;
              const label = `${a.type || "Home"} address for ${a.name}`;
              return (
                <li
                  key={a.id}
                  className={`relative bg-white rounded-3xl p-5 flex flex-col shadow-card transition-all border ${
                    a.isDefault ? "border-brand-gold ring-2 ring-brand-gold/25" : "border-brand-border hover:border-brand-gold/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-9 h-9 shrink-0 rounded-full bg-brand-goldPale flex items-center justify-center text-brand-maroon">
                        <TypeIcon className="w-4 h-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold truncate">{a.name}</h3>
                        <p className="text-[11px] uppercase tracking-wider text-neutral-500">{a.type || "Home"}</p>
                      </div>
                    </div>
                    {a.isDefault && (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-brand-maroon text-white rounded-full">
                        <Star className="w-3 h-3 fill-current" aria-hidden="true" /> Default
                      </span>
                    )}
                  </div>

                  <address className="not-italic text-sm text-neutral-700 mt-3 space-y-0.5 flex-1">
                    <p>{[a.houseNumber, a.street, a.locality].filter(Boolean).join(", ")}</p>
                    {a.landmark && <p className="text-neutral-500">Near {a.landmark}</p>}
                    <p>
                      {a.city}, {a.state} – <strong className="text-brand-text">{a.pincode}</strong>
                    </p>
                    <p className="flex items-center gap-1.5 text-neutral-600 pt-1">
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" /> <span className="sr-only">Phone:</span> {a.phone}
                    </p>
                  </address>

                  <div className="flex flex-wrap items-center gap-1 pt-3 mt-4 border-t border-brand-border">
                    <button
                      type="button"
                      onClick={() => onEdit(a)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-medium text-neutral-700 hover:text-brand-maroon hover:bg-brand-ivory"
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" /> Edit<span className="sr-only"> {label}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setToDelete(a)}
                      className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-medium text-neutral-700 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" /> Remove<span className="sr-only"> {label}</span>
                    </button>
                    {!a.isDefault && (
                      <button
                        type="button"
                        onClick={() => makeDefault(a)}
                        disabled={Boolean(defaultBusyId)}
                        className="ml-auto inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-full text-sm font-semibold text-brand-maroon hover:bg-brand-goldPale disabled:opacity-60"
                      >
                        {defaultBusyId === a.id && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} Set as default<span className="sr-only"> for {label}</span>
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove this address?"
        confirmLabel={deleting ? "Removing…" : "Remove address"}
        cancelLabel="Keep it"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setToDelete(null)}
      >
        {toDelete && (
          <>
            <strong className="text-brand-text">{toDelete.name}</strong>, {[toDelete.houseNumber, toDelete.street].filter(Boolean).join(", ")}, {toDelete.city} – {toDelete.pincode}
            {toDelete.isDefault && <span className="block mt-1">This is your default address. You can choose a new default afterwards.</span>}
            <span className="block mt-1">Past orders sent here are not affected.</span>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}

function AddressEditor({ editing, isFirst, onDone }: { editing: SavedAddress | null; isFirst: boolean; onDone: () => void }) {
  const { user, addAddress, updateAddress } = useApp();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [form, setForm] = useState<AddressFormValue>(() =>
    editing
      ? {
          name: editing.name,
          phone: editing.phone,
          houseNumber: editing.houseNumber || "",
          street: editing.street,
          locality: editing.locality || "",
          landmark: editing.landmark || "",
          city: editing.city,
          state: editing.state,
          pincode: editing.pincode,
          type: editing.type || "Home",
          isDefault: Boolean(editing.isDefault),
        }
      : { ...EMPTY_ADDRESS, name: user?.fullName || "", phone: user?.phone || "", isDefault: isFirst }
  );
  const [errors, setErrors] = useState<AddressErrors>({});
  const [saving, setSaving] = useState(false);

  // Move focus to the form heading when it opens, so keyboard and screen-reader users land in the right place
  useEffect(() => {
    headingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, []);

  const patch = (p: Partial<AddressFormValue>) => {
    setForm((f) => ({ ...f, ...p }));
    setErrors((e) => {
      const next = { ...e };
      Object.keys(p).forEach((k) => delete next[k as keyof AddressFormValue]);
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const found = validateAddress(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      // Take the person straight to the first field that needs fixing
      setTimeout(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    setSaving(true);
    const payload = { ...form, phone: normaliseIndianMobile(form.phone) };
    // Only close the form when the save worked, so nothing typed is ever lost
    const ok = editing ? await updateAddress(editing.id, payload) : Boolean(await addAddress(payload));
    setSaving(false);
    if (ok) onDone();
  };

  return (
    <section aria-labelledby="addr-form-h" className="bg-white border border-brand-gold/50 rounded-3xl p-5 sm:p-7 shadow-cardHover">
      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h2 id="addr-form-h" ref={headingRef} tabIndex={-1} className="text-lg font-serif outline-none scroll-mt-24">
            {editing ? "Edit address" : "Add a new address"}
          </h2>
          <p className="text-sm text-neutral-600 mt-0.5">Fields marked * are required.</p>
        </div>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          aria-label="Close the address form"
          className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-neutral-500 hover:text-brand-text hover:bg-brand-ivory disabled:opacity-40"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} noValidate aria-busy={saving} className="space-y-5">
        <AddressForm value={form} onChange={patch} errors={errors} showContact idPrefix="acc" />
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-brand-border">
          <button type="button" onClick={onDone} disabled={saving} className="min-h-[48px] px-6 rounded-full border border-brand-border text-sm font-semibold hover:border-brand-gold disabled:opacity-50 mt-3 sm:mt-4">
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="btn-primary min-h-[48px] px-8 text-xs font-bold uppercase tracking-widest rounded-full shadow-md inline-flex items-center justify-center gap-2 disabled:opacity-70 mt-3 sm:mt-4"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />} {saving ? "Saving…" : editing ? "Save changes" : "Save address"}
          </button>
        </div>
      </form>
    </section>
  );
}
