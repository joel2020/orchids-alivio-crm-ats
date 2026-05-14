"use client"

import { useMemo, useRef, useState } from "react"
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Loader2, Upload, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

type DuplicateMode = "skip" | "update" | "import_new"

type LeadRow = {
  businessName?: string | null
  ownerFirstName: string
  ownerLastName: string
  cellPhone: string
  email: string
  monthlyRevenue?: string | null
  requestedFundingAmount?: string | null
  industry?: string | null
  state?: string | null
  leadSource?: string | null
  ein?: string | null
  ssn?: string | null
  businessAddress?: string | null
  timeInBusiness?: string | null
  averageMonthlyDeposits?: string | null
  notes?: string | null
  assignedRep?: string | null
  status?: string | null
}

type UploadResult = {
  batchId: string
  fileName?: string | null
  totalRows: number
  imported: number
  updated: number
  duplicates: number
  failed: number
  duplicateRows?: unknown[]
  failedRows?: { rowNumber: number; error: string; row: unknown }[]
}

const templateHeaders = [
  "Business Name",
  "Owner First Name",
  "Owner Last Name",
  "Cell Phone",
  "Email",
  "Monthly Revenue",
  "Requested Funding Amount",
  "Industry",
  "State",
  "Lead Source",
  "EIN",
  "Full SSN",
  "Business Address",
  "Time in Business",
  "Average Monthly Deposits",
  "Notes",
  "Assigned Rep",
  "Status",
]

const headerMap: Record<string, keyof LeadRow> = {
  "business name": "businessName",
  "company": "businessName",
  "company name": "businessName",
  "owner first name": "ownerFirstName",
  "first name": "ownerFirstName",
  "owner last name": "ownerLastName",
  "last name": "ownerLastName",
  "cell phone": "cellPhone",
  "phone": "cellPhone",
  "mobile": "cellPhone",
  "email": "email",
  "monthly revenue": "monthlyRevenue",
  "requested funding amount": "requestedFundingAmount",
  "funding amount": "requestedFundingAmount",
  "industry": "industry",
  "state": "state",
  "lead source": "leadSource",
  "source": "leadSource",
  "ein": "ein",
  "full ein": "ein",
  "ssn": "ssn",
  "full ssn": "ssn",
  "business address": "businessAddress",
  "address": "businessAddress",
  "time in business": "timeInBusiness",
  "average monthly deposits": "averageMonthlyDeposits",
  "average adb": "averageMonthlyDeposits",
  "notes": "notes",
  "assigned rep": "assignedRep",
  "status": "status",
}

function normalizeHeader(header: string) {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ")
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let current = ""
  let row: string[] = []
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      current += '"'
      i++
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === "," && !inQuotes) {
      row.push(current.trim())
      current = ""
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++
      row.push(current.trim())
      if (row.some(Boolean)) rows.push(row)
      row = []
      current = ""
    } else {
      current += char
    }
  }

  row.push(current.trim())
  if (row.some(Boolean)) rows.push(row)
  return rows
}

function toLeadRows(matrix: string[][]) {
  const [headers, ...body] = matrix
  if (!headers?.length) return []

  const mappedHeaders = headers.map((header) => headerMap[normalizeHeader(header)])

  return body
    .map((values) => {
      const row: Partial<LeadRow> = {}
      values.forEach((value, index) => {
        const key = mappedHeaders[index]
        if (key) row[key] = value
      })
      return {
        businessName: row.businessName || null,
        ownerFirstName: row.ownerFirstName || "",
        ownerLastName: row.ownerLastName || "",
        cellPhone: row.cellPhone || "",
        email: row.email || "",
        monthlyRevenue: row.monthlyRevenue || null,
        requestedFundingAmount: row.requestedFundingAmount || null,
        industry: row.industry || null,
        state: row.state || null,
        leadSource: row.leadSource || "Bulk Upload",
        ein: row.ein || null,
        ssn: row.ssn || null,
        businessAddress: row.businessAddress || null,
        timeInBusiness: row.timeInBusiness || null,
        averageMonthlyDeposits: row.averageMonthlyDeposits || null,
        notes: row.notes || null,
        assignedRep: row.assignedRep || null,
        status: row.status || "new",
      }
    })
    .filter((row) => Object.values(row).some(Boolean))
}

function validationErrors(row: LeadRow) {
  const errors: string[] = []
  if (!row.ownerFirstName) errors.push("Owner first name")
  if (!row.ownerLastName) errors.push("Owner last name")
  if (!row.cellPhone) errors.push("Cell phone")
  if (!row.email || !/^\S+@\S+\.\S+$/.test(row.email)) errors.push("Valid email")
  return errors
}

function downloadFile(filename: string, content: string, type = "text/csv") {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvEscape(value: unknown) {
  const text = String(value ?? "")
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`
  return text
}

export function BulkLeadUpload({ onImported }: { onImported?: () => void }) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [open, setOpen] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [rows, setRows] = useState<LeadRow[]>([])
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip")
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)

  const invalidRows = useMemo(() => rows.map(validationErrors), [rows])
  const hasInvalidRows = invalidRows.some((errors) => errors.length > 0)

  async function readFile(file: File) {
    setParseError(null)
    setResult(null)
    setFileName(file.name)

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text()
        setRows(toLeadRows(parseCsv(text)))
        return
      }

      if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
        const XLSX = await import("xlsx")
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: "" })
        setRows(toLeadRows(matrix))
        return
      }

      setParseError("Please upload a CSV or Excel file.")
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Unable to parse this file.")
    }
  }

  async function handleUpload() {
    if (!rows.length || hasInvalidRows) return
    setIsUploading(true)
    setResult(null)

    try {
      const response = await fetch("/api/leads/bulk-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows, duplicateMode, fileName }),
      })

      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || "Upload failed")
      setResult(payload)
      onImported?.()
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  function downloadTemplate() {
    downloadFile("bulk-lead-upload-template.csv", `${templateHeaders.join(",")}\n`)
  }

  function downloadErrorReport() {
    if (!result?.failedRows?.length) return
    const headers = ["Row Number", "Error", ...templateHeaders]
    const lines = result.failedRows.map((failed) => {
      const row = failed.row as Partial<LeadRow>
      return [
        failed.rowNumber,
        failed.error,
        row.businessName,
        row.ownerFirstName,
        row.ownerLastName,
        row.cellPhone,
        row.email,
        row.monthlyRevenue,
        row.requestedFundingAmount,
        row.industry,
        row.state,
        row.leadSource,
        row.ein,
        row.ssn,
        row.businessAddress,
        row.timeInBusiness,
        row.averageMonthlyDeposits,
        row.notes,
        row.assignedRep,
        row.status,
      ].map(csvEscape).join(",")
    })
    downloadFile(`bulk-upload-errors-${result.batchId}.csv`, [headers.map(csvEscape).join(","), ...lines].join("\n"))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload Leads
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Bulk Upload Leads</DialogTitle>
          <DialogDescription>
            Upload CSV or Excel files, preview the leads, choose duplicate handling, and import them into the CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download CSV Template
            </Button>
            <Select value={duplicateMode} onValueChange={(value) => setDuplicateMode(value as DuplicateMode)}>
              <SelectTrigger className="w-[240px]"><SelectValue placeholder="Duplicate handling" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">Skip duplicates</SelectItem>
                <SelectItem value="update">Update existing records</SelectItem>
                <SelectItem value="import_new">Import as new leads</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            className={`rounded-xl border border-dashed p-8 text-center transition ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30 hover:bg-muted/40"}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setIsDragging(false)
              const file = event.dataTransfer.files?.[0]
              if (file) readFile(file)
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) readFile(file)
              }}
            />
            <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <div className="font-medium">Drag and drop a CSV or Excel file here</div>
            <div className="text-sm text-muted-foreground">or click to select a file from your computer</div>
            {fileName && <Badge variant="secondary" className="mt-3">{fileName}</Badge>}
          </button>

          {parseError && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4" />
              {parseError}
            </div>
          )}

          {rows.length > 0 && (
            <div className="rounded-lg border">
              <div className="flex items-center justify-between border-b p-3">
                <div>
                  <div className="font-medium">Preview {rows.length} leads</div>
                  <div className="text-sm text-muted-foreground">Showing the first 50 rows before import.</div>
                </div>
                {hasInvalidRows ? (
                  <Badge variant="destructive">Fix missing required fields</Badge>
                ) : (
                  <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ready to import</Badge>
                )}
              </div>
              <ScrollArea className="h-[320px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 50).map((row, index) => {
                      const errors = invalidRows[index]
                      return (
                        <TableRow key={`${row.email}-${index}`}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{row.businessName || "-"}</TableCell>
                          <TableCell>{`${row.ownerFirstName} ${row.ownerLastName}`.trim() || "-"}</TableCell>
                          <TableCell>{row.cellPhone || "-"}</TableCell>
                          <TableCell>{row.email || "-"}</TableCell>
                          <TableCell>{row.requestedFundingAmount || "-"}</TableCell>
                          <TableCell>
                            {errors.length ? (
                              <span className="text-xs text-red-600">Missing: {errors.join(", ")}</span>
                            ) : (
                              <span className="text-xs text-green-700">Valid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}

          {result && (
            <div className="grid gap-3 rounded-lg border bg-muted/20 p-4">
              <div className="flex items-center gap-2 font-medium">
                {result.failed ? <XCircle className="h-5 w-5 text-amber-600" /> : <CheckCircle2 className="h-5 w-5 text-green-600" />}
                Import Summary
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                <div><div className="text-muted-foreground">Rows</div><div className="font-semibold">{result.totalRows}</div></div>
                <div><div className="text-muted-foreground">Imported</div><div className="font-semibold">{result.imported}</div></div>
                <div><div className="text-muted-foreground">Updated</div><div className="font-semibold">{result.updated}</div></div>
                <div><div className="text-muted-foreground">Duplicates</div><div className="font-semibold">{result.duplicates}</div></div>
                <div><div className="text-muted-foreground">Failed</div><div className="font-semibold">{result.failed}</div></div>
              </div>
              {result.failedRows?.length ? (
                <Button variant="outline" className="w-fit" onClick={downloadErrorReport}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Error Report
                </Button>
              ) : null}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Close</Button>
            <Button onClick={handleUpload} disabled={!rows.length || hasInvalidRows || isUploading}>
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import Leads
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
