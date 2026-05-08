"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import CandidatesTable from "@/components/candidates-table";
import ColumnMapper, { ColumnMapping } from "@/components/column-mapper";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { Settings, Mail, Loader2, LogOut, User, UserPlus, Trash2, Shield, Columns3 } from "lucide-react";

interface Admin { email: string; name: string | null; }

export default function Home() {
  const router = useRouter();
  const [sheetUrl, setSheetUrl]         = useState("");
  const [gasUrl, setGasUrl]             = useState("");
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSec, setGoogleClientSec] = useState("");
  const [sessionSecret, setSessionSecret] = useState("");
  const [activeUrl, setActiveUrl]       = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [userName, setUserName]         = useState("");
  const [settingsTab, setSettingsTab]   = useState<"config" | "columns" | "admins">("config");

  // Column mapping
  const [sheetHeaders, setSheetHeaders]     = useState<string[]>([]);
  const [columnMapping, setColumnMapping]   = useState<ColumnMapping>({});
  const [activeMapping, setActiveMapping]   = useState<ColumnMapping>({});
  const [loadingHeaders, setLoadingHeaders] = useState(false);

  // Admin management
  const [admins, setAdmins]           = useState<Admin[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newEmail, setNewEmail]       = useState("");
  const [newName, setNewName]         = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.name) setUserName(d.name); })
      .catch(() => {});

    fetch("/api/config")
      .then((r) => r.json())
      .then((d) => {
        if (d.sheetUrl) { setSheetUrl(d.sheetUrl); setActiveUrl(d.sheetUrl); }
        if (d.gasUrl)         setGasUrl(d.gasUrl);
        if (d.googleClientId) setGoogleClientId(d.googleClientId);
        if (d.columnMapping) { setColumnMapping(d.columnMapping); setActiveMapping(d.columnMapping); }
        setConfigLoaded(true);
      })
      .catch(() => setConfigLoaded(true));
  }, []);

  function loadAdmins() {
    setAdminsLoading(true);
    fetch("/api/auth/admins")
      .then((r) => r.json())
      .then((d) => { if (d.admins) setAdmins(d.admins); })
      .catch(() => {})
      .finally(() => setAdminsLoading(false));
  }

  useEffect(() => {
    if (settingsOpen && settingsTab === "admins") loadAdmins();
  }, [settingsOpen, settingsTab]);

  useEffect(() => {
    if (!settingsOpen || !sheetUrl.trim() || settingsTab !== "columns") return;
    setLoadingHeaders(true);
    fetch(`/api/sheet?url=${encodeURIComponent(sheetUrl.trim())}`)
      .then((r) => r.json())
      .then((d) => { if (d.headers) setSheetHeaders(d.headers.filter((h: string) => h.trim())); })
      .catch(() => {})
      .finally(() => setLoadingHeaders(false));
  }, [settingsOpen, settingsTab, sheetUrl]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  async function addAdmin() {
    if (!newEmail.trim()) return;
    setAddingAdmin(true);
    try {
      const res  = await fetch("/api/auth/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail.trim(), name: newName.trim() || undefined }),
      });
      const data = await res.json();
      if (data.status === "added") {
        toast.success(`${newEmail} added`);
        setNewEmail(""); setNewName("");
        loadAdmins();
      } else {
        toast.error(data.message || "Failed to add");
      }
    } finally { setAddingAdmin(false); }
  }

  async function removeAdmin(email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    const res  = await fetch("/api/auth/admins", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (data.status === "removed") { toast.success(`${email} removed`); loadAdmins(); }
    else toast.error(data.message || "Failed to remove");
  }

  async function applySettings() {
    if (!sheetUrl.trim()) return;
    setSaving(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { sheetUrl: sheetUrl.trim(), columnMapping };
      if (gasUrl.trim())          body.gasUrl          = gasUrl.trim();
      if (googleClientId.trim())  body.googleClientId  = googleClientId.trim();
      if (googleClientSec.trim()) body.googleClientSec = googleClientSec.trim();
      if (sessionSecret.trim())   body.sessionSecret   = sessionSecret.trim();
      const res  = await fetch("/api/config", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.status === "saved") {
        setActiveUrl(sheetUrl.trim()); setActiveMapping(columnMapping); setSettingsOpen(false);
      } else alert("Save failed: " + (data.message || JSON.stringify(data)));
    } catch (err) { alert("Save failed: " + String(err)); }
    finally { setSaving(false); }
  }

  const mappedCount = Object.values(columnMapping).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shrink-0 shadow-md">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              FACEPrep HR Dashboard
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Candidate Email Management System</p>
          </div>

          {/* User + logout */}
          {userName && (
            <div className="flex items-center gap-2 pl-2 border-l">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <User className="h-3.5 w-3.5 text-slate-400" />
                <span className="font-medium">{userName}</span>
              </div>
              <Button
                variant="ghost" size="sm"
                className="h-8 px-2 text-slate-500 hover:text-red-600 hover:bg-red-50"
                onClick={handleLogout} title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Sheet open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (o) setSettingsTab("config"); }}>
            <SheetTrigger className="inline-flex items-center gap-2 rounded-lg border border-input bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50 transition-all">
              <Settings className="h-4 w-4" />
              Settings
              {mappedCount > 0 && (
                <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-semibold px-1.5 py-0.5 rounded">
                  {mappedCount} mapped
                </span>
              )}
            </SheetTrigger>
            <SheetContent side="right" className="w-[420px] sm:w-[480px] flex flex-col p-0">
              <div className="px-6 pt-6 pb-4 border-b">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-orange-600" />
                    Configuration
                  </SheetTitle>
                </SheetHeader>
                <div className="flex gap-1 mt-4 p-1 bg-slate-100 rounded-lg">
                  {(["config", "columns", "admins"] as const).map((tab) => (
                    <button key={tab} onClick={() => setSettingsTab(tab)}
                      className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${settingsTab === tab ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                      {tab === "config"   && <Settings className="h-3 w-3 inline mr-1" />}
                      {tab === "columns"  && <Columns3 className="h-3 w-3 inline mr-1" />}
                      {tab === "admins"   && <Shield className="h-3 w-3 inline mr-1" />}
                      {tab === "config" ? "Connection" : tab === "columns" ? "Columns" : "Admins"}
                      {tab === "columns" && mappedCount > 0 && (
                        <span className="ml-1 bg-orange-100 text-orange-600 text-xs px-1.5 rounded-full">{mappedCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-5">

                {/* ── Connection tab ── */}
                {settingsTab === "config" && (
                  <div className="space-y-5">
                    <div className="space-y-3 p-4 rounded-lg bg-slate-50 border">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <span className="h-6 w-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">1</span>
                        Google Sheet URL
                      </label>
                      <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl}
                        onChange={(e) => setSheetUrl(e.target.value)} className="font-mono text-xs" />
                      <p className="text-xs text-muted-foreground">
                        Required: <code className="bg-white px-1 rounded border text-orange-600">Email</code>{" "}
                        <code className="bg-white px-1 rounded border text-orange-600">Candidate Name</code>{" "}
                        <code className="bg-white px-1 rounded border text-orange-600">Result</code>
                      </p>
                    </div>
                    <div className="space-y-3 p-4 rounded-lg bg-slate-50 border">
                      <label className="text-sm font-semibold flex items-center gap-2">
                        <span className="h-6 w-6 rounded bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold">2</span>
                        GAS Web App URL
                      </label>
                      <Input placeholder="https://script.google.com/macros/s/..." value={gasUrl}
                        onChange={(e) => setGasUrl(e.target.value)} className="font-mono text-xs" />
                    </div>

                    {/* Advanced */}
                    <details className="group">
                      <summary className="text-xs font-semibold text-slate-500 cursor-pointer select-none list-none flex items-center gap-1 hover:text-slate-700">
                        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                        Advanced Settings
                      </summary>
                      <div className="mt-3 space-y-3 pl-3 border-l-2 border-slate-200">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600">Google Client ID</label>
                          <Input placeholder="1073636939203-..." value={googleClientId}
                            onChange={(e) => setGoogleClientId(e.target.value)} className="font-mono text-xs h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600">Google Client Secret</label>
                          <Input type="password" placeholder="GOCSPX-..." value={googleClientSec}
                            onChange={(e) => setGoogleClientSec(e.target.value)} className="font-mono text-xs h-8" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-600">Session Secret</label>
                          <Input type="password" placeholder="min 32 chars" value={sessionSecret}
                            onChange={(e) => setSessionSecret(e.target.value)} className="font-mono text-xs h-8" />
                          <p className="text-xs text-muted-foreground">Leave blank to keep existing value.</p>
                        </div>
                      </div>
                    </details>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-xs text-blue-900">
                        <strong>Note:</strong> Emails sent only to <strong>Selected</strong> or <strong>Rejected</strong> candidates.
                      </p>
                    </div>
                  </div>
                )}

                {/* ── Columns tab ── */}
                {settingsTab === "columns" && (
                  <div className="space-y-4">
                    {loadingHeaders ? (
                      <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">Loading sheet columns…</span>
                      </div>
                    ) : sheetHeaders.length === 0 ? (
                      <div className="text-center py-16 space-y-2">
                        <Columns3 className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-medium text-slate-500">No columns loaded</p>
                        <p className="text-xs text-muted-foreground">Go to Connection tab and enter a valid Sheet URL first.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-semibold text-slate-700">{sheetHeaders.length} columns</span> detected.
                          </p>
                          {mappedCount > 0 && (
                            <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full">
                              {mappedCount} mapped
                            </span>
                          )}
                        </div>
                        <ColumnMapper headers={sheetHeaders} mapping={columnMapping} onChange={setColumnMapping} />
                      </>
                    )}
                  </div>
                )}

                {/* ── Admins tab ── */}
                {settingsTab === "admins" && (                  <div className="space-y-4">
                    <p className="text-xs text-muted-foreground">
                      Only listed emails can sign in with Google. You cannot remove yourself.
                    </p>

                    {/* Add new admin */}
                    <div className="p-4 rounded-lg bg-slate-50 border space-y-3">
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <UserPlus className="h-3.5 w-3.5" />Add Admin
                      </p>
                      <Input placeholder="name@faceprep.in" value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)} className="text-xs h-8" />
                      <Input placeholder="Display name (optional)" value={newName}
                        onChange={(e) => setNewName(e.target.value)} className="text-xs h-8" />
                      <Button size="sm" className="w-full h-8 bg-orange-600 hover:bg-orange-700 text-xs"
                        onClick={addAdmin} disabled={!newEmail.trim() || addingAdmin}>
                        {addingAdmin ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <UserPlus className="h-3 w-3 mr-1" />}
                        Add Admin
                      </Button>
                    </div>

                    {/* Admin list */}
                    <div className="space-y-2">
                      {adminsLoading ? (
                        <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
                      ) : admins.length === 0 ? (
                        <p className="text-xs text-center text-muted-foreground py-6">No admins yet</p>
                      ) : admins.map((a) => (
                        <div key={a.email} className="flex items-center justify-between p-3 rounded-lg border bg-white">
                          <div>
                            <p className="text-xs font-medium text-slate-800">{a.name || a.email}</p>
                            {a.name && <p className="text-xs text-muted-foreground">{a.email}</p>}
                          </div>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeAdmin(a.email)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sticky save — only on config/columns tabs */}
              {settingsTab !== "admins" && (
                <div className="px-6 py-4 border-t bg-white">
                  <Button className="w-full bg-orange-600 hover:bg-orange-700 shadow-md"
                    onClick={applySettings} disabled={!sheetUrl.trim() || saving} size="lg">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</> : <><Mail className="h-4 w-4 mr-2" />Save & Load Sheet</>}
                  </Button>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {!configLoaded ? (
          <div className="flex items-center justify-center py-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeUrl ? (
          <CandidatesTable sheetUrl={activeUrl} columnMapping={activeMapping} />
        ) : (
          <div className="rounded-xl border-2 border-dashed bg-white p-24 text-center shadow-sm">
            <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
              <Settings className="h-8 w-8 text-orange-600" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Get Started</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Click <strong>Settings</strong> to configure your Google Sheet URL.
            </p>
          </div>
        )}
      </main>

      <Toaster richColors position="top-right" />
    </div>
  );
}
