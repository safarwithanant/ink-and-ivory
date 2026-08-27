import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, CreditCard, Heart, MapPin, Pencil, Plus, ShieldCheck, Trash2, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import "./ProfilePage.css";

type AddressForm = { label: string; fullName: string; line1: string; line2: string; city: string; state: string; postalCode: string; country: "IN"; phone: string; isDefault: boolean };
const blankAddress: AddressForm = { label: "Home", fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "IN", phone: "", isDefault: false };

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const { user, loading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const addresses = trpc.profile.addresses.useQuery(undefined, { enabled: isAuthenticated });
  const paymentMethods = trpc.profile.paymentMethods.useQuery(undefined, { enabled: isAuthenticated, retry: false });
  const addAddress = trpc.profile.addAddress.useMutation({ onSuccess: () => utils.profile.addresses.invalidate() });
  const updateAddress = trpc.profile.updateAddress.useMutation({ onSuccess: () => utils.profile.addresses.invalidate() });
  const deleteAddress = trpc.profile.removeAddress.useMutation({ onSuccess: () => utils.profile.addresses.invalidate() });
  const setDefaultAddress = trpc.profile.setDefaultAddress.useMutation({ onSuccess: () => utils.profile.addresses.invalidate() });
  const setDefaultPayment = trpc.profile.setDefaultPaymentMethod.useMutation({ onSuccess: () => utils.profile.paymentMethods.invalidate() });
  const deletePayment = trpc.profile.removePaymentMethod.useMutation({ onSuccess: () => utils.profile.paymentMethods.invalidate() });
  const portal = trpc.profile.createPaymentPortal.useMutation();
  const [form, setForm] = useState<AddressForm>(blankAddress);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const addressCount = addresses.data?.length || 0;
  const safeMethods = paymentMethods.data || [];
  const profileInitial = useMemo(() => (user?.name || user?.email || "Reader").slice(0, 1).toUpperCase(), [user]);

  useEffect(() => { if (!formOpen) { setForm(blankAddress); setEditingId(null); } }, [formOpen]);

  if (loading) return <main className="profile-loading"><BookOpen size={28} />Opening your reading room…</main>;
  if (!isAuthenticated) return <main className="profile-gate"><div className="profile-gate__mark"><UserRound size={28} /></div><p className="detail-label">A private shelf</p><h1>Your reading<br /><em>room awaits.</em></h1><span>Sign in to manage saved shipping addresses and payment methods securely.</span><button className="button button--dark" onClick={() => startLogin()}>Sign in to continue</button><button className="text-link" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Return to the library</button></main>;

  const submitAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = { ...form, line2: form.line2 || null, phone: form.phone || null };
    try {
      if (editingId) await updateAddress.mutateAsync({ id: editingId, address: payload }); else await addAddress.mutateAsync(payload);
      toast.success(editingId ? "Address updated." : "Address saved to your profile.");
      setFormOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save this address."); }
  };
  const editAddress = (address: NonNullable<typeof addresses.data>[number]) => {
    setEditingId(address.id);
    setForm({ label: address.label, fullName: address.fullName, line1: address.line1, line2: address.line2 || "", city: address.city, state: address.state, postalCode: address.postalCode, country: "IN", phone: address.phone || "", isDefault: address.isDefault });
    setFormOpen(true);
  };
  const openPortal = async () => {
    try {
      const result = await portal.mutateAsync();
      toast.message("Opening Stripe’s secure payment manager in a new tab.");
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not open secure payment management."); }
  };
  const runProfileAction = async (action: () => Promise<unknown>, successMessage: string, errorMessage: string) => {
    try {
      await action();
      toast.success(successMessage);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : errorMessage);
    }
  };

  return <div className="profile-page"><header className="profile-header"><button className="brand" onClick={() => setLocation("/")} aria-label="Return to INK & IVORY home"><span className="brand__mark"><BookOpen size={17} /></span><span>INK <i>&</i> IVORY</span></button><button className="profile-header__return" onClick={() => setLocation("/")}><ArrowLeft size={16} /> Continue browsing</button></header><main><section className="profile-hero"><div className="profile-hero__monogram">{profileInitial}</div><p className="detail-label">Your account</p><h1>Welcome back,<br /><em>{user?.name || "reader"}.</em></h1><p>{user?.email || "Your personal INK & IVORY library."}</p><div><span><MapPin size={16} /> {addressCount} saved {addressCount === 1 ? "address" : "addresses"}</span><span><CreditCard size={16} /> {safeMethods.length} saved {safeMethods.length === 1 ? "method" : "methods"}</span></div></section><section className="profile-section"><div className="profile-section__heading"><div><p className="detail-label">Delivery address book</p><h2>Where should<br /><em>we send it?</em></h2></div><button className="button button--dark" onClick={() => setFormOpen(true)}><Plus size={16} /> Add address</button></div>{addresses.isLoading ? <p className="profile-state">Loading your saved addresses…</p> : addresses.isError ? <div className="profile-empty"><MapPin size={28} /><h3>Address book unavailable.</h3><p>{addresses.error.message || "Please try again in a moment."}</p><button className="text-link" onClick={() => addresses.refetch()}>Try again <ArrowLeft size={15} /></button></div> : addresses.data?.length ? <div className="address-grid">{addresses.data.map(address => <article className="address-card" key={address.id}>{address.isDefault && <span className="default-badge"><Check size={12} /> Default</span>}<MapPin size={20} /><h3>{address.label}</h3><p>{address.fullName}<br />{address.line1}{address.line2 && <><br />{address.line2}</>}<br />{address.city}, {address.state} {address.postalCode}<br />India{address.phone && <><br />{address.phone}</>}</p><div><button onClick={() => editAddress(address)}><Pencil size={14} /> Edit</button>{!address.isDefault && <button onClick={() => runProfileAction(() => setDefaultAddress.mutateAsync({ id: address.id }), "Default address updated.", "Could not update the default address.")}>Make default</button>}<button className="danger-button" onClick={() => runProfileAction(() => deleteAddress.mutateAsync({ id: address.id }), "Address removed from your profile.", "Could not remove this address.")} aria-label={`Delete ${address.label} address`}><Trash2 size={15} /></button></div></article>)}</div> : <div className="profile-empty"><MapPin size={28} /><h3>No saved addresses yet.</h3><p>Add a delivery address so checkout feels more like a bookmark than a form.</p><button className="text-link" onClick={() => setFormOpen(true)}>Add your first address <Plus size={15} /></button></div>}</section><section className="payment-section"><div><p className="detail-label">Secure payment methods</p><h2>Kept safely<br /><em>with Stripe.</em></h2><p>Card details are managed by Stripe. INK &amp; IVORY only sees the card brand, last four digits, and expiry date.</p><button className="button button--paper" onClick={openPortal} disabled={portal.isPending}>{portal.isPending ? "Opening secure manager…" : <><ShieldCheck size={17} /> Manage payment methods</>}</button></div><div className="payment-methods">{paymentMethods.isLoading ? <p>Loading payment methods…</p> : paymentMethods.isError ? <div className="payment-methods__empty"><CreditCard size={24} /><h3>Secure manager unavailable.</h3><p>{paymentMethods.error.message || "Try again after your Stripe account is configured."}</p><button className="text-link text-link--light" onClick={() => paymentMethods.refetch()}>Try again <ArrowLeft size={15} /></button></div> : safeMethods.length ? safeMethods.map(method => <article key={method.id} className="payment-card"><CreditCard size={23} /><div><h3>{method.brand.toUpperCase()} ending in {method.last4}</h3><p>Expires {String(method.expMonth).padStart(2, "0")}/{method.expYear}</p></div>{method.isDefault && <span className="default-badge"><Check size={12} /> Default</span>}<div className="payment-card__actions">{!method.isDefault && <button onClick={() => runProfileAction(() => setDefaultPayment.mutateAsync({ paymentMethodId: method.id }), "Default payment method updated.", "Could not update the default payment method.")}>Make default</button>}<button className="danger-button" onClick={() => runProfileAction(() => deletePayment.mutateAsync({ paymentMethodId: method.id }), "Payment method removed.", "Could not remove this payment method.")} aria-label={`Remove ${method.brand} ending ${method.last4}`}><Trash2 size={15} /></button></div></article>) : <div className="payment-methods__empty"><CreditCard size={28} /><h3>No payment methods saved.</h3><p>Use Stripe’s secure manager to add and maintain your preferred method.</p></div>}</div></section></main>{formOpen && <div className="profile-form-backdrop" onMouseDown={() => setFormOpen(false)}><section className="address-form-modal" onMouseDown={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label={editingId ? "Edit saved address" : "Add a saved address"}><div className="address-form-modal__head"><div><p className="detail-label">Delivery address</p><h2>{editingId ? "Edit address" : "Add an address"}</h2></div><button className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close address form"><X /></button></div><form onSubmit={submitAddress}><label>Label<input value={form.label} onChange={event => setForm({ ...form, label: event.target.value })} placeholder="Home, Office, Gift" required /></label><label>Full name<input value={form.fullName} onChange={event => setForm({ ...form, fullName: event.target.value })} required /></label><label>Address line 1<input value={form.line1} onChange={event => setForm({ ...form, line1: event.target.value })} required /></label><label>Address line 2 <span>Optional</span><input value={form.line2} onChange={event => setForm({ ...form, line2: event.target.value })} /></label><div className="address-form-modal__two"><label>City<input value={form.city} onChange={event => setForm({ ...form, city: event.target.value })} required /></label><label>State<input value={form.state} onChange={event => setForm({ ...form, state: event.target.value })} required /></label></div><div className="address-form-modal__two"><label>PIN code<input value={form.postalCode} onChange={event => setForm({ ...form, postalCode: event.target.value })} inputMode="numeric" required /></label><label>Phone <span>Optional</span><input value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} inputMode="tel" /></label></div><label className="address-default"><input type="checkbox" checked={form.isDefault} onChange={event => setForm({ ...form, isDefault: event.target.checked })} /> Make this my default delivery address</label><button className="button button--dark button--full" type="submit" disabled={addAddress.isPending || updateAddress.isPending}>{editingId ? "Save changes" : "Save address"}</button></form></section></div>}</div>;
}
