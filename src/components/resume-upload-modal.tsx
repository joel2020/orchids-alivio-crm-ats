"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Upload, FileText, Check, X, AlertCircle, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"

type UploadResult = {
  jobId: string
  fileName: string
  status: "pending" | "processing" | "completed" | "failed" | "error"
  error?: string
  candidateId?: string
  candidateName?: string
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  jobId?: string
  projectId?: string
  onComplete?: (candidateId: string) => void
}

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc", ".txt"]
const MAX_FILES = 20
const MAX_SIZE_MB = 10

export function ResumeUploadModal({ open, onOpenChange, jobId, projectId, onComplete }: Props) {
  const router = useRouter()
  const [files, setFiles] = useState<File[]>([])
  const [uploading, setUploading] = useState(false)
  const [results, setResults] = useState<UploadResult[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }, [])

  const validateFile = (file: File): string | null => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File too large. Maximum ${MAX_SIZE_MB}MB`
    }
    return null
  }

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(newFiles).forEach((file) => {
      const error = validateFile(file)
      if (error) {
        errors.push(`${file.name}: ${error}`)
      } else if (files.length + validFiles.length < MAX_FILES) {
        validFiles.push(file)
      }
    })

    if (validFiles.length > 0) {
      setFiles((prev) => [...prev, ...validFiles])
    }
  }, [files.length])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      if (e.dataTransfer.files?.length) {
        addFiles(e.dataTransfer.files)
      }
    },
    [addFiles]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    if (files.length === 0) return

    setUploading(true)
    setResults([])

    const formData = new FormData()
    files.forEach((file) => formData.append("files", file))
    if (jobId) formData.append("jobId", jobId)
    if (projectId) formData.append("projectId", projectId)

    try {
      const response = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.results) {
        setResults(data.results)
        const pendingJobs = data.results
          .filter((r: UploadResult) => r.status === "pending")
          .map((r: UploadResult) => r.jobId)

        if (pendingJobs.length > 0) {
          startPolling(pendingJobs)
        }
      } else if (data.error) {
        setResults([{ jobId: "", fileName: "Upload", status: "error", error: data.error }])
      }
    } catch {
      setResults([{ jobId: "", fileName: "Upload", status: "error", error: "Network error" }])
    }

    setFiles([])
  }

  const startPolling = (jobIds: string[]) => {
    if (pollInterval) clearInterval(pollInterval)

    const interval = setInterval(async () => {
      try {
        const params = new URLSearchParams()
        jobIds.forEach((id) => params.append("jobIds[]", id))

        const response = await fetch(`/api/resumes/status?${params.toString()}`)
        const data = await response.json()

        if (data.results) {
          setResults((prev) =>
            prev.map((r) => {
              const updated = data.results.find((u: { jobId: string }) => u.jobId === r.jobId)
              if (updated) {
                return {
                  ...r,
                  status: updated.status,
                  candidateId: updated.candidateId,
                  candidateName: updated.candidate?.full_name,
                  error: updated.errorMessage,
                }
              }
              return r
            })
          )

          const allDone = data.results.every(
            (r: { status: string }) => r.status === "completed" || r.status === "failed"
          )

          if (allDone) {
            clearInterval(interval)
            setPollInterval(null)
            setUploading(false)

            const completed = data.results.filter((r: { status: string }) => r.status === "completed")
            if (completed.length === 1 && onComplete) {
              onComplete(completed[0].candidateId)
            }
          }
        }
      } catch (error) {
        console.error("Polling error:", error)
      }
    }, 1500)

    setPollInterval(interval)
  }

  useEffect(() => {
    return () => {
      if (pollInterval) clearInterval(pollInterval)
    }
  }, [pollInterval])

  const completedCount = results.filter((r) => r.status === "completed").length
  const failedCount = results.filter((r) => r.status === "failed" || r.status === "error").length
  const processingCount = results.filter((r) => r.status === "pending" || r.status === "processing").length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Resume{files.length > 1 || results.length > 1 ? "s" : ""}</DialogTitle>
        </DialogHeader>

        {results.length === 0 ? (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOCX, DOC, TXT (max {MAX_SIZE_MB}MB each, up to {MAX_FILES} files)
              </p>
              <input
                type="file"
                multiple
                accept={ALLOWED_EXTENSIONS.join(",")}
                onChange={handleFileInput}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                style={{ position: "absolute", top: 0, left: 0 }}
              />
            </div>

            {files.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">{files.length} file(s) selected</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 rounded bg-muted"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({(file.size / 1024 / 1024).toFixed(2)}MB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={uploadFiles} disabled={files.length === 0 || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {files.length > 0 ? `(${files.length})` : ""}
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {processingCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Processing {processingCount} resume(s)...</span>
                </div>
                <Progress value={(completedCount / results.length) * 100} />
              </div>
            )}

            {processingCount === 0 && (
              <Alert variant={failedCount > 0 ? "destructive" : "default"}>
                <AlertDescription>
                  {completedCount > 0 && `${completedCount} resume(s) processed successfully. `}
                  {failedCount > 0 && `${failedCount} failed.`}
                </AlertDescription>
              </Alert>
            )}

            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{result.fileName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === "completed" && (
                      <>
                        <Badge variant="default" className="bg-green-500">
                          <Check className="h-3 w-3 mr-1" />
                          Done
                        </Badge>
                        {result.candidateId && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0"
                            onClick={() => router.push(`/candidates/${result.candidateId}`)}
                          >
                            {result.candidateName || "View"}
                          </Button>
                        )}
                      </>
                    )}
                    {(result.status === "pending" || result.status === "processing") && (
                      <Badge variant="secondary">
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        {result.status === "processing" ? "Parsing" : "Queued"}
                      </Badge>
                    )}
                    {(result.status === "failed" || result.status === "error") && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        {result.error || "Failed"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              {processingCount === 0 && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResults([])
                      setFiles([])
                    }}
                  >
                    Upload More
                  </Button>
                  <Button onClick={() => onOpenChange(false)}>Done</Button>
                </>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}