"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, RefreshCw, ChevronLeft, ChevronRight, Columns3, Mail, CheckSquare } from "lucide-react";
import { ColumnMapping } from "@/components/column-mapper";

type Candidate = Record<string, string | number> & { _rowIndex: number };

interface SheetResponse {
  status: string;
  headers: string[];
  data: Candidate[];
  message?: string;
}

// ── field helpers ──────────────────────────────────────────────────────────────
function findHeader(headers: string[], keys: string[]): string | undefined {
  for (const key of keys) {
    const match = headers.find((h) => h.toLowerCase() === key);
    if (match) return match;
  }
}

function getMapped(row: Candidate, mappedCol: string | undefined, fallbackKeys: string[], headers: string[]) {
  if (mappedCol) return String(row[mappedCol] ?? "");
  const h = findHeader(headers, fallbackKeys);
  return h ? String(row[h] ?? "") : "";
}

function getEmailField(row: Candidate, headers: string[], m: ColumnMapping) {
  return getMapped(row, m.email, ["to", "email", "recipient", "email address", "to email"], headers);
}
function getResultField(row: Candidate, headers: string[], m: ColumnMapping) {
  return getMapped(row, m.result, ["result", "status", "outcome", "decision"], headers);
}
function getNameField(row: Candidate, headers: string[], m: ColumnMapping) {
  return getMapped(row, m.name, ["candidate name", "name", "full name", "candidate"], headers);
}
function getCandidateIdField(row: Candidate, headers: string[], m: ColumnMapping): string {
  return getMapped(row, m.candidateId, ["candidate id", "candidateid", "id", "candidate_id"], headers);
}

function buildEmailTemplate(result: string, name: string, candidateId: string): { subject: string; body: string; candidateId: string } | null {
  const FEEDBACK_URL = "https://forms.gle/Q8jMWuSXBRWjeHWQ8";
  const r = result.toLowerCase().trim();
  if (r === "selected") return {
    subject: "Congratulations! You've Been Selected - FACE Prep",
    candidateId,
    body: `Dear ${name},

Thank you for taking the time to attend the interview at FACE Prep.

We are pleased to inform you that, based on your profile and performance in the interview, you have been selected to move forward with us. Congratulations!

We were impressed with your skills and potential, and we believe you will be a valuable addition to our team. Our team will be sharing further details regarding the next steps, including offer formalities and onboarding process, shortly.

We truly appreciate your interest in FACE Prep and the effort you put into the selection process.

We would truly value your feedback regarding your recent interview experience with us. Your input helps us enhance our process and provide a better experience for all candidates.

We kindly request you to take a few moments to share your thoughts using the link below. Your feedback is highly appreciated.

${FEEDBACK_URL}

We look forward to welcoming you to the team and wish you great success in your journey with FACE Prep`,
  };
  if (r === "rejected") return {
    subject: "Update on Your Application - FACE Prep",
    candidateId,
    body: `Dear ${name},

Thank you for taking the time to attend the interview at FACE Prep.

After careful evaluation of your profile and performance in the interview, we regret to inform you that we will not be proceeding with your application at this moment. Please know that this decision does not reflect your abilities or potential, but rather the alignment of current role requirements.

We truly appreciate your interest in FACE Prep and the effort you put into the selection process. We encourage you to apply again in the future as new opportunities arise.

We would truly value your feedback regarding your recent interview experience with us. Your input helps us enhance our process and provide a better experience for all candidates.

We kindly request you to take a few moments to share your thoughts using the link below. Your feedback is highly appreciated.

${FEEDBACK_URL}

Wishing you the very best in your job search and all your future endeavors.`,
  };
  return null;
}

// ── can send? ─────────────────────────────────────────────────────────────────
function canSendRow(row: Candidate, headers: string[], emailStatusHeader: string | undefined, m: ColumnMapping): boolean {
  const email  = getEmailField(row, headers, m);
  const result = getResultField(row, headers, m);
  const status = emailStatusHeader ? String(row[emailStatusHeader] ?? "") : "";
  const r      = result.toLowerCase().trim();
  return !!email && (r === "selected" || r === "rejected") && !status.startsWith("✓ Sent");
}

function sendDisabledReason(row: Candidate, headers: string[], emailStatusHeader: string | undefined, m: ColumnMapping): string {
  const email  = getEmailField(row, headers, m);
  const result = getResultField(row, headers, m);
  const status = emailStatusHeader ? String(row[emailStatusHeader] ?? "") : "";
  if (!email)                          return "No email address";
  if (status.startsWith("✓ Sent"))     return "Already sent";
  const r = result.toLowerCase().trim();
  if (!r)                              return "Result column is empty";
  if (r !== "selected" && r !== "rejected") return `Result is "${result}" — only Selected/Rejected can be emailed`;
  return "";
}

// ── badges ─────────────────────────────────────────────────────────────────────
function ResultBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  if (v === "selected")  return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">Selected</Badge>;
  if (v === "rejected")  return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">Rejected</Badge>;
  if (v === "waitlisted") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">Waitlisted</Badge>;
  return <Badge variant="secondary">{value || "—"}</Badge>;
}

function EmailStatusBadge({ value }: { value: string }) {
  if (!value)                return <span className="text-muted-foreground text-xs">—</span>;
  if (value.startsWith("✓")) return <span className="text-green-600 text-xs font-medium flex items-center gap-1"><CheckSquare className="h-3 w-3" />{value}</span>;
  if (value.startsWith("✗")) return <span className="text-red-500 text-xs font-medium">{value}</span>;
  if (value === "Skipped")   return <span className="text-muted-foreground text-xs">Skipped</span>;
  return <span className="text-xs">{value}</span>;
}

const RESULT_COLS  = new Set(["result", "status", "outcome", "decision"]);
const HIDDEN_SYSTEM = new Set(["email status", "_rowindex"]);

// ── main component ─────────────────────────────────────────────────────────────
export default function CandidatesTable({ sheetUrl, columnMapping = {} }: { sheetUrl: string; columnMapping?: ColumnMapping }) {
  const [headers, setHeaders]               = useState<string[]>([]);
  const [allRows, setAllRows]               = useState<Candidate[]>([]);
  const [loading, setLoading]               = useState(false);
  const [sending, setSending]               = useState<Record<number, boolean>>({});
  const [search, setSearch]                 = useState("");
  const [resultFilter, setResultFilter]     = useState<string>("all");
  const [page, setPage]                     = useState(1);
  const [pageSize, setPageSize]             = useState(20);
  const [visibleCols, setVisibleCols]       = useState<Set<string>>(new Set());
  const [colsInitialized, setColsInitialized] = useState(false);
  const [selected, setSelected]             = useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkSending, setBulkSending]       = useState(false);
  const [bulkProgress, setBulkProgress]     = useState({ current: 0, total: 0 });

  // Reset all state when sheet URL changes
  useEffect(() => {
    setColsInitialized(false);
    setVisibleCols(new Set());
    setAllRows([]);
    setHeaders([]);
    setPage(1);
    setSelected(new Set());
    setResultFilter("all");
  }, [sheetUrl]);

  const fetchData = useCallback(async () => {
    if (!sheetUrl) return;
    setLoading(true);
    try {
      const res  = await fetch(`/api/sheet?url=${encodeURIComponent(sheetUrl)}`);
      const json: SheetResponse = await res.json();
      if (json.status === "success") {
        setHeaders(json.headers);
        setAllRows([...json.data].reverse());
        setPage(1);
        setSelected(new Set());
        if (!colsInitialized) {
          const selectable = json.headers.filter((h) => !HIDDEN_SYSTEM.has(h.toLowerCase()) && h.trim() !== "");
          setVisibleCols(new Set(selectable));
          setColsInitialized(true);
        }
      } else {
        toast.error(json.message || "Failed to load sheet data");
      }
    } catch {
      toast.error("Network error loading sheet");
    } finally {
      setLoading(false);
    }
  }, [sheetUrl, colsInitialized]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const selectableHeaders = useMemo(
    () => headers.filter((h) => !HIDDEN_SYSTEM.has(h.toLowerCase()) && h.trim() !== ""),
    [headers]
  );
  const emailStatusHeader = useMemo(() => {
    if (columnMapping.emailStatus) return columnMapping.emailStatus;
    return headers.find((h) => ["email status", "mail sent status"].includes(h.toLowerCase()));
  }, [headers, columnMapping]);

  const filtered = useMemo(() => {
    let rows = allRows;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((row) =>
        selectableHeaders.some((h) => String(row[h] ?? "").toLowerCase().includes(q))
      );
    }
    if (resultFilter !== "all") {
      rows = rows.filter((row) => {
        const r = getResultField(row, headers, columnMapping).toLowerCase().trim();
        return r === resultFilter;
      });
    }
    return rows;
  }, [allRows, search, resultFilter, selectableHeaders, headers]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const pageRows   = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ── stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total   = allRows.length;
    const sent    = allRows.filter((r) => {
      const s = emailStatusHeader ? String(r[emailStatusHeader] ?? "") : "";
      return s.startsWith("✓ Sent");
    }).length;
    const failed  = allRows.filter((r) => {
      const s = emailStatusHeader ? String(r[emailStatusHeader] ?? "") : "";
      return s.startsWith("✗");
    }).length;
    const pending = allRows.filter((r) => canSendRow(r, headers, emailStatusHeader, columnMapping)).length;
    return { total, sent, failed, pending };
  }, [allRows, emailStatusHeader, headers]);

  function toggleCol(col: string) {
    setVisibleCols((prev) => { const n = new Set(prev); n.has(col) ? n.delete(col) : n.add(col); return n; });
  }

  function toggleRow(rowIndex: number) {
    setSelected((prev) => { const n = new Set(prev); n.has(rowIndex) ? n.delete(rowIndex) : n.add(rowIndex); return n; });
  }

  // Select All — only selects sendable rows on current page
  function toggleAll() {
    const sendableOnPage = pageRows
      .filter((r) => canSendRow(r, headers, emailStatusHeader, columnMapping))
      .map((r) => r._rowIndex);
    const allSelected = sendableOnPage.length > 0 && sendableOnPage.every((idx) => selected.has(idx));
    if (allSelected) {
      setSelected((prev) => { const n = new Set(prev); sendableOnPage.forEach((idx) => n.delete(idx)); return n; });
    } else {
      setSelected((prev) => { const n = new Set(prev); sendableOnPage.forEach((idx) => n.add(idx)); return n; });
    }
  }

  // ── send single ──────────────────────────────────────────────────────────────
  async function sendEmail(row: Candidate) {
    const email = getEmailField(row, headers, columnMapping);
    if (!email) return;
    const result      = getResultField(row, headers, columnMapping);
    const name        = getNameField(row, headers, columnMapping);
    const candidateId = getCandidateIdField(row, headers, columnMapping);
    const template    = buildEmailTemplate(result, name, candidateId);
    if (!template) {
      toast.error(`No template for "${result}". Only Selected/Rejected supported.`);
      return;
    }
    setSending((s) => ({ ...s, [row._rowIndex]: true }));
    try {
      const res  = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sheetUrl,
          rowIndex:          row._rowIndex,
          to:                email,
          subject:           template.subject,
          body:              template.body,
          candidateId:       template.candidateId,
          cc:                row["CC"] || row["cc"] || "",
          sender_name:       "Talent Acquisition Team",
          emailStatusColumn: columnMapping.emailStatus || "",
        }),
      });
      const data = await res.json();
      if (data.status === "sent") {
        toast.success(`Sent to ${email}`);
        setAllRows((prev) =>
          prev.map((r) =>
            r._rowIndex === row._rowIndex && emailStatusHeader
              ? { ...r, [emailStatusHeader]: `✓ Sent to ${email}` }
              : r
          )
        );
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending((s) => ({ ...s, [row._rowIndex]: false }));
    }
  }

  // ── bulk send ────────────────────────────────────────────────────────────────
  async function sendBulk() {
    const rows = allRows.filter((r) => selected.has(r._rowIndex) && canSendRow(r, headers, emailStatusHeader, columnMapping));
    if (!rows.length) return;
    setBulkSending(true);
    setBulkProgress({ current: 0, total: rows.length });
    let success = 0, failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      const email       = getEmailField(row, headers, columnMapping);
      const result      = getResultField(row, headers, columnMapping);
      const name        = getNameField(row, headers, columnMapping);
      const candidateId = getCandidateIdField(row, headers, columnMapping);
      const template    = buildEmailTemplate(result, name, candidateId);
      if (!template) { failed++; errors.push(email || `row ${row._rowIndex}`); setBulkProgress((p) => ({ ...p, current: p.current + 1 })); continue; }

      try {
        const res  = await fetch("/api/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sheetUrl,
            rowIndex:          row._rowIndex,
            to:                email,
            subject:           template.subject,
            body:              template.body,
            candidateId:       template.candidateId,
            cc:                row["CC"] || row["cc"] || "",
            sender_name:       "Talent Acquisition Team",
            emailStatusColumn: columnMapping.emailStatus || "",
          }),
        });
        const data = await res.json();
        if (data.status === "sent") {
          success++;
          setAllRows((prev) =>
            prev.map((r) =>
              r._rowIndex === row._rowIndex && emailStatusHeader
                ? { ...r, [emailStatusHeader]: `✓ Sent to ${email}` }
                : r
            )
          );
        } else {
          failed++;
          errors.push(email || `row ${row._rowIndex}`);
        }
      } catch {
        failed++;
        errors.push(email || `row ${row._rowIndex}`);
      }
      setBulkProgress((p) => ({ ...p, current: p.current + 1 }));
    }

    setBulkSending(false);
    setBulkDialogOpen(false);
    setSelected(new Set());
    if (failed > 0) {
      toast.error(`${failed} failed: ${errors.slice(0, 3).join(", ")}${errors.length > 3 ? ` +${errors.length - 3} more` : ""}`);
    }
    if (success > 0) {
      toast.success(`Sent ${success} emails successfully.`);
    }
  }

  const displayHeaders = selectableHeaders.filter((h) => visibleCols.has(h));

  const eligibleCount = allRows.filter(
    (r) => selected.has(r._rowIndex) && canSendRow(r, headers, emailStatusHeader, columnMapping)
  ).length;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap bg-card border rounded-lg p-3">
        <Input
          placeholder="Search candidates..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="max-w-64 h-9 text-sm"
        />

        {/* Result filter */}
        <Select value={resultFilter} onValueChange={(v) => { setResultFilter(v ?? "all"); setPage(1); }}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="All results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All results</SelectItem>
            <SelectItem value="selected">Selected</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="waitlisted">Waitlisted</SelectItem>
          </SelectContent>
        </Select>

        {/* Column visibility */}
        <Popover>
          <PopoverTrigger className="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-accent transition-colors h-9">
            <Columns3 className="h-3.5 w-3.5" />
            Columns
            {visibleCols.size < selectableHeaders.length && (
              <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs h-4">
                {selectableHeaders.length - visibleCols.size} hidden
              </Badge>
            )}
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" align="start">
            <p className="text-xs font-semibold text-muted-foreground px-1 mb-2">Toggle columns</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {selectableHeaders.map((h, i) => (
                <label key={`col-${h}-${i}`} className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
                  <Checkbox checked={visibleCols.has(h)} onCheckedChange={() => toggleCol(h)} />
                  <span className="truncate">{h}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-1 mt-2 pt-2 border-t">
              <Button variant="ghost" size="sm" className="h-7 text-xs flex-1"
                onClick={() => setVisibleCols(new Set(selectableHeaders))}>All</Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs flex-1"
                onClick={() => setVisibleCols(new Set())}>None</Button>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
          <SelectTrigger className="w-28 h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[10, 20, 50, 100].map((n) => (
              <SelectItem key={n} value={String(n)}>{n} rows</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </Button>

        <div className="flex-1" />

        {selected.size > 0 && (
          <Button size="sm" className="h-9 gap-1.5 bg-orange-600 hover:bg-orange-700"
            onClick={() => setBulkDialogOpen(true)}>
            <Mail className="h-3.5 w-3.5" />
            Send {selected.size} selected
          </Button>
        )}

        <span className="text-sm text-muted-foreground">
          {loading ? "Loading…" : `${filtered.length} candidates`}
        </span>
      </div>

      {/* Stats bar */}
      {allRows.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-slate-700", bg: "bg-slate-50 border-slate-200" },
            { label: "Pending", value: stats.pending, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
            { label: "Sent", value: stats.sent, color: "text-green-700", bg: "bg-green-50 border-green-200" },
            { label: "Failed", value: stats.failed, color: "text-red-700", bg: "bg-red-50 border-red-200" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`rounded-lg border p-3 ${bg}`}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="table-auto w-full">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-10 px-3">
                  {(() => {
                    const sendableOnPage = pageRows.filter((r) => canSendRow(r, headers, emailStatusHeader, columnMapping));
                    const allSelected    = sendableOnPage.length > 0 && sendableOnPage.every((r) => selected.has(r._rowIndex));
                    const someSelected   = sendableOnPage.some((r) => selected.has(r._rowIndex));
                    return (
                      <Checkbox
                        checked={allSelected}
                        data-state={someSelected && !allSelected ? "indeterminate" : undefined}
                        onCheckedChange={toggleAll}
                        disabled={sendableOnPage.length === 0}
                        title={sendableOnPage.length === 0 ? "No sendable rows on this page" : "Select all sendable rows"}
                      />
                    );
                  })()}
                </TableHead>
                {displayHeaders.map((h, i) => (
                  <TableHead key={`${h}-${i}`} className="font-semibold text-xs px-3 py-2 min-w-[120px] whitespace-normal break-words">{h}</TableHead>
                ))}
                <TableHead className="text-xs px-3 py-2 min-w-[160px] whitespace-normal">Email Status</TableHead>
                <TableHead className="text-right text-xs px-3 py-2 w-[90px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && allRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayHeaders.length + 3} className="text-center py-16">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-xs text-muted-foreground mt-2">Loading from Google Sheets…</p>
                  </TableCell>
                </TableRow>
              ) : pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={displayHeaders.length + 3} className="text-center py-16 text-muted-foreground text-sm">
                    No candidates found
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((row) => {
                  const email       = getEmailField(row, headers, columnMapping);
                  const emailStatus = emailStatusHeader ? String(row[emailStatusHeader] ?? "") : "";
                  const alreadySent = emailStatus.startsWith("✓ Sent");
                  const sendable    = canSendRow(row, headers, emailStatusHeader, columnMapping);
                  const disabledMsg = sendDisabledReason(row, headers, emailStatusHeader, columnMapping);

                  return (
                    <TableRow key={row._rowIndex}
                      className={`text-sm ${selected.has(row._rowIndex) ? "bg-orange-50" : ""}`}>
                      <TableCell className="py-2 px-3 align-top">
                        <Checkbox
                          checked={selected.has(row._rowIndex)}
                          onCheckedChange={() => sendable && toggleRow(row._rowIndex)}
                          disabled={!sendable}
                          title={disabledMsg}
                        />
                      </TableCell>
                      {displayHeaders.map((h, i) => (
                        <TableCell key={`${h}-${i}`} className="py-2 px-3 align-top overflow-hidden">
                          <div className="break-words whitespace-normal text-xs leading-relaxed">
                            {RESULT_COLS.has(h.toLowerCase())
                              ? <ResultBadge value={String(row[h] ?? "")} />
                              : String(row[h] ?? "") || <span className="text-muted-foreground">—</span>
                            }
                          </div>
                        </TableCell>
                      ))}
                      <TableCell className="py-2 px-3 align-top overflow-hidden">
                        <div className="break-words whitespace-normal text-xs leading-relaxed">
                          <EmailStatusBadge value={emailStatus} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 px-3 align-top">
                        {alreadySent ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 text-xs">✓ Sent</Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            disabled={!sendable || !!sending[row._rowIndex]}
                            onClick={() => {
                              if (window.confirm(`Send email to ${email}?`)) {
                                sendEmail(row);
                              }
                            }}
                            variant={sendable ? "default" : "secondary"}
                            title={disabledMsg || `Send to ${email}`}
                          >
                            {sending[row._rowIndex]
                              ? <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              : <Send className="h-3 w-3 mr-1" />}
                            Send
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm bg-card border rounded-lg p-3">
          <span className="text-muted-foreground">
            Page {page} of {totalPages} · {filtered.length} rows
          </span>
          <div className="flex gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page <= 1} onClick={() => setPage(1)}>«</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0"
              disabled={page >= totalPages} onClick={() => setPage(totalPages)}>»</Button>
          </div>
        </div>
      )}

      {/* Bulk send dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Bulk Emails</DialogTitle>
            <DialogDescription>
              You&apos;ve selected <strong>{selected.size}</strong> rows.{" "}
              <strong>{eligibleCount}</strong> are eligible (Selected/Rejected with valid email, not already sent).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-900 space-y-1">
              <p><strong>Templates used by result:</strong></p>
              <p>• <strong>Selected</strong> — Congratulations email with next steps</p>
              <p>• <strong>Rejected</strong> — Update on application with feedback link</p>
            </div>
            <p className="text-sm text-muted-foreground">
              Rows with Waitlisted, blank, or other result values will be skipped automatically.
            </p>
            {bulkSending && (
              <div className="w-full bg-slate-200 rounded-full h-1.5">
                <div
                  className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${bulkProgress.total > 0 ? (bulkProgress.current / bulkProgress.total) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDialogOpen(false)} disabled={bulkSending}>
              Cancel
            </Button>
            <Button onClick={sendBulk} disabled={bulkSending || eligibleCount === 0}
              className="bg-orange-600 hover:bg-orange-700">
              {bulkSending ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />Sending {bulkProgress.current} of {bulkProgress.total}…</>
              ) : (
                <><Mail className="h-3.5 w-3.5 mr-2" />Send {eligibleCount} Emails</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
