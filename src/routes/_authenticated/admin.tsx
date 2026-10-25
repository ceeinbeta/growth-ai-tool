import { createFileRoute } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Copy, Trash2, UserMinus, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { getPublicOrigin } from '@/lib/public-origin.functions';
import {
  adminErrorMessage, adminInvitesQuery, adminSummaryQuery, adminWaitlistQuery,
  inviteMessage, isAdminQuery, relativeTime, stageText,
  type InviteRow, type WaitlistRow,
} from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { BlockSkeleton } from '@/components/States';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const Route = createFileRoute('/_authenticated/admin')({
  head: () => ({
    meta: [
      { title: 'Admin — Growloop' },
      { name: 'description', content: 'Beta invitations and waitlist for the Growloop founder.' },
      { property: 'og:title', content: 'Admin — Growloop' },
      { property: 'og:description', content: 'Manage beta seats and invitations.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'robots', content: 'noindex' },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading } = useQuery(isAdminQuery);
  if (isLoading) return <BlockSkeleton rows={4} />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-extrabold">Admin</h1>
        <p className="mt-6">This page is only for the Growloop founder.</p>
      </div>
    );
  }
  return <AdminContent />;
}

function AdminContent() {
  const qc = useQueryClient();
  const summary = useQuery(adminSummaryQuery);
  const waitlist = useQuery(adminWaitlistQuery);
  const invites = useQuery(adminInvitesQuery);
  const [error, setError] = useState('');
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [deleteRow, setDeleteRow] = useState<WaitlistRow | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['admin-summary'] });
    void qc.invalidateQueries({ queryKey: ['admin-waitlist'] });
    void qc.invalidateQueries({ queryKey: ['admin-invites'] });
  };

  async function run(action: () => PromiseLike<unknown>) {
    setError('');
    try {
      await action();
      refresh();
    } catch (e) {
      setError(adminErrorMessage(e, summary.data?.beta_seat_limit));
    }
  }

  const invite = (addr: string, note?: string) => run(() => supabase.rpc('admin_invite_email', { addr, note: note ?? "" }).then(r => { if (r.error) throw r.error; }));
  const uninvite = (addr: string) => run(() => supabase.rpc('admin_uninvite_email', { addr }).then(r => { if (r.error) throw r.error; }));

  const s = summary.data;
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-extrabold">Admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">Invite people into the beta and keep an eye on limits. Growloop never sends emails for you.</p>
      {error && <p role="alert" className="mt-4 rounded-sm bg-danger-soft p-3 text-sm text-destructive">{error}</p>}

      {!s ? <BlockSkeleton rows={4} /> : (
        <>
          <section aria-label="Summary" className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-5">
              <p className="text-sm text-muted-foreground">On the waitlist</p>
              <p className="mt-1 text-3xl font-extrabold">{s.waitlist_count}</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <p className="text-sm text-muted-foreground">Beta seats used</p>
              <p className="mt-1 text-3xl font-extrabold">{s.invited_count} of {s.beta_seat_limit}</p>
              <SettingEditor label="Seat limit" settingKey="beta_seat_limit" value={s.beta_seat_limit} onSaved={refresh} onError={setError} />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">AI runs in the last 24 hours</p>
                {s.ai_runs_last_24h >= s.platform_ai_runs_per_day * 0.8 && <Badge variant="outline">Near the cap</Badge>}
              </div>
              <p className="mt-1 text-3xl font-extrabold">{s.ai_runs_last_24h} of {s.platform_ai_runs_per_day}</p>
              <SettingEditor label="Daily AI run cap" settingKey="platform_ai_runs_per_day" value={s.platform_ai_runs_per_day} onSaved={refresh} onError={setError} />
              <p className="mt-2 text-xs text-muted-foreground">Each AI run uses Lovable credits. A higher cap can raise your costs.</p>
            </div>
            <div className="rounded-lg border bg-card p-5">
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">AI search visibility spend this month</p>
                {s.visibility_spend_this_month >= s.visibility_monthly_budget_usd * 0.8 && <Badge variant="outline">Near the cap</Badge>}
              </div>
              <p className="mt-1 text-3xl font-extrabold">${s.visibility_spend_this_month.toFixed(2)} of ${s.visibility_monthly_budget_usd}</p>
              <SettingEditor label="Monthly visibility budget ($)" settingKey="visibility_monthly_budget_usd" value={s.visibility_monthly_budget_usd} onSaved={refresh} onError={setError} />
              <p className="mt-2 text-xs text-muted-foreground"><span className="status-chip status-estimated">Estimated</span> from published engine prices, not exact bills. Visibility checks stop when this budget is reached.</p>
              <p className="mt-2 text-xs text-muted-foreground">AI visibility reading calls in the last 24 hours: {s.visibility_reading_calls_24h}</p>
            </div>
          </section>

          <section aria-label="Waitlist" className="mt-10">
            <h2 className="text-xl font-bold">Waitlist</h2>
            {!waitlist.data?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Nobody on the waitlist yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead><TableHead>Website</TableHead><TableHead>Stage</TableHead>
                      <TableHead>Source</TableHead><TableHead>Joined</TableHead><TableHead>Status</TableHead><TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {waitlist.data.map(row => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>{row.website ?? '—'}</TableCell>
                        <TableCell>{stageText(row.stage)}</TableCell>
                        <TableCell>{row.utm_source ?? 'Direct / unknown'}</TableCell>
                        <TableCell>{relativeTime(row.created_at)}</TableCell>
                        <TableCell><StatusPill row={row} /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {!row.on_allow_list && !row.has_account && (
                              <Button size="sm" variant="outline" onClick={() => invite(row.email)}><UserPlus className="h-4 w-4" /> Invite</Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => setInviteFor(row.email)}><Copy className="h-4 w-4" /> Copy invite message</Button>
                            <Button size="sm" variant="outline" onClick={() => setDeleteRow(row)}><Trash2 className="h-4 w-4" /> Delete entry</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <section aria-label="Invited people" className="mt-10">
            <h2 className="text-xl font-bold">Invited people</h2>
            {!invites.data?.length ? (
              <p className="mt-4 text-sm text-muted-foreground">Nobody invited yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow><TableHead>Email</TableHead><TableHead>Note</TableHead><TableHead>Status</TableHead><TableHead /></TableRow>
                  </TableHeader>
                  <TableBody>
                    {invites.data.map(row => (
                      <TableRow key={row.email}>
                        <TableCell className="font-medium">{row.email}</TableCell>
                        <TableCell>{row.note ?? '—'}</TableCell>
                        <TableCell>{row.has_account ? `Signed in ${row.last_sign_in_at ? new Date(row.last_sign_in_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : 'recently'}` : 'Invited, not signed in yet'}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setInviteFor(row.email)}><Copy className="h-4 w-4" /> Copy invite message</Button>
                            {row.has_account ? (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span><Button size="sm" variant="outline" disabled><UserMinus className="h-4 w-4" /> Remove</Button></span>
                                  </TooltipTrigger>
                                  <TooltipContent>This person already has an account, so they can't be removed.</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => uninvite(row.email)}><UserMinus className="h-4 w-4" /> Remove</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </section>

          <DirectInvite invites={invites.data ?? []} onInvite={invite} />
        </>
      )}

      <InviteDialog email={inviteFor} onClose={() => setInviteFor(null)} />
      <AlertDialog open={!!deleteRow} onOpenChange={open => { if (!open) setDeleteRow(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this waitlist entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes the waitlist entry for {deleteRow?.email}. They will no longer appear on the waitlist. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction className="border-destructive bg-transparent text-destructive hover:bg-danger-soft" onClick={() => {
              const row = deleteRow;
              setDeleteRow(null);
              if (row) void run(() => supabase.rpc('admin_delete_waitlist_entry', { entry_id: row.id }).then(r => { if (r.error) throw r.error; }));
            }}>Delete entry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusPill({ row }: { row: WaitlistRow }) {
  if (row.has_account) return <Badge className="bg-selected text-foreground selected-state">Has account</Badge>;
  if (row.on_allow_list || row.invited_at) return <Badge variant="outline">Invited</Badge>;
  return <Badge variant="secondary">Not invited</Badge>;
}

function SettingEditor({ label, settingKey, value, onSaved, onError }: {
  label: string; settingKey: string; value: number; onSaved: () => void; onError: (msg: string) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const save = async () => {
    const val = Number(draft);
    if (!Number.isInteger(val)) { onError('Enter a whole number.'); return; }
    setBusy(true);
    onError('');
    try {
      const { error } = await supabase.rpc('admin_set_setting', { setting_key: settingKey, val });
      if (error) throw error;
      onSaved();
    } catch (e) {
      onError(adminErrorMessage(e));
      setDraft(String(value));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-3 flex items-center gap-2">
      <Label htmlFor={`setting-${settingKey}`} className="sr-only">{label}</Label>
      <Input id={`setting-${settingKey}`} type="number" value={draft} onChange={e => setDraft(e.target.value)} className="h-8 w-24" />
      <Button size="sm" variant="outline" disabled={busy || draft === String(value)} onClick={save}>Save</Button>
    </div>
  );
}

function DirectInvite({ invites, onInvite }: { invites: InviteRow[]; onInvite: (addr: string, note?: string) => PromiseLike<unknown> }) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const addr = email.trim().toLowerCase();
    if (invites.some(i => i.email === addr)) { setError('That email is already invited.'); return; }
    setError('');
    setBusy(true);
    await onInvite(addr, note || undefined);
    setBusy(false);
    setEmail('');
    setNote('');
  };
  return (
    <section aria-label="Invite someone who is not on the waitlist" className="mt-10 rounded-lg border bg-card p-5">
      <h2 className="text-xl font-bold">Invite someone who is not on the waitlist</h2>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1">
          <Label htmlFor="direct-invite-email">Email</Label>
          <Input id="direct-invite-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="mt-1" placeholder="founder@theirapp.com" />
        </div>
        <div className="min-w-56 flex-1">
          <Label htmlFor="direct-invite-note">Note <span className="text-muted-foreground">(optional, only you see this)</span></Label>
          <Input id="direct-invite-note" value={note} onChange={e => setNote(e.target.value)} className="mt-1" placeholder="Met at…" />
        </div>
        <Button type="submit" disabled={busy}><UserPlus className="h-4 w-4" /> Invite</Button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </section>
  );
}

function InviteDialog({ email, onClose }: { email: string | null; onClose: () => void }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);

  const open = async (addr: string) => {
    const origin = await getPublicOrigin();
    const msg = inviteMessage(origin, addr);
    setSubject(msg.subject);
    setBody(msg.body);
    setCopied(false);
  };

  return (
    <Dialog open={!!email} onOpenChange={isOpen => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-xl" onOpenAutoFocus={() => { if (email) void open(email); }}>
        <DialogHeader>
          <DialogTitle>Invite message for {email}</DialogTitle>
          <DialogDescription>Growloop does not send this for you. Paste it into your own email.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="invite-subject">Subject</Label>
            <Input id="invite-subject" value={subject} onChange={e => setSubject(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="invite-body">Message</Label>
            <Textarea id="invite-body" value={body} onChange={e => setBody(e.target.value)} rows={14} className="mt-1 font-mono text-sm" />
          </div>
          <Button onClick={() => {
            void navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}><Copy className="h-4 w-4" /> {copied ? 'Copied' : 'Copy to clipboard'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
