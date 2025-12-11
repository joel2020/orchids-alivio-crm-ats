"use client"

import { useEffect, useState } from "react"
import { Plus, RefreshCw, Mail, BarChart3 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { InstantlyConnection, InstantlyCampaign } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const DEFAULT_ACCOUNT_ID = "7653ba80-2065-46ec-aaae-7f4eca146d1f"

export default function InstantlyPage() {
  const [connections, setConnections] = useState<InstantlyConnection[]>([])
  const [campaigns, setCampaigns] = useState<InstantlyCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({ label: "", api_key: "" })

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [connRes, campRes] = await Promise.all([
      supabase.from("instantly_connections").select("*").order("created_at", { ascending: false }),
      supabase.from("instantly_campaigns").select("*").order("name"),
    ])
    setConnections(connRes.data || [])
    setCampaigns(campRes.data || [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    if (!formData.label.trim() || !formData.api_key.trim()) {
      setError("Label and API key are required")
      setSubmitting(false)
      return
    }

    const { error } = await supabase.from("instantly_connections").insert([{
      account_id: DEFAULT_ACCOUNT_ID,
      label: formData.label,
      api_key_encrypted: formData.api_key,
      status: "active",
    }])

    if (error) {
      setError(error.message)
      setSubmitting(false)
      return
    }

    setFormData({ label: "", api_key: "" })
    setDialogOpen(false)
    setSubmitting(false)
    fetchData()
  }

  const totalSends = campaigns.reduce((s, c) => s + c.stats_sends, 0)
  const totalOpens = campaigns.reduce((s, c) => s + c.stats_opens, 0)
  const totalReplies = campaigns.reduce((s, c) => s + c.stats_replies, 0)
  const openRate = totalSends > 0 ? ((totalOpens / totalSends) * 100).toFixed(1) : "0"
  const replyRate = totalSends > 0 ? ((totalReplies / totalSends) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instantly Integration</h1>
          <p className="text-sm text-muted-foreground">Manage your cold email campaigns and connections</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); setError(null) }}>
          <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" />Connect Account</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Connect Instantly Account</DialogTitle></DialogHeader>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2"><Label>Label *</Label><Input placeholder="e.g., Sales Inbox 1" required value={formData.label} onChange={(e) => setFormData({ ...formData, label: e.target.value })} /></div>
              <div className="space-y-2"><Label>API Key *</Label><Input type="password" placeholder="Your Instantly API key" required value={formData.api_key} onChange={(e) => setFormData({ ...formData, api_key: e.target.value })} /></div>
              <p className="text-xs text-muted-foreground">Your API key is stored securely and never exposed to the frontend.</p>
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? "Connecting..." : "Connect Account"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Connections</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{connections.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Total Sends</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{totalSends.toLocaleString()}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Open Rate</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{openRate}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3"><CardTitle className="text-sm font-medium text-muted-foreground">Reply Rate</CardTitle></CardHeader>
          <CardContent className="py-0"><p className="text-2xl font-bold">{replyRate}%</p></CardContent>
        </Card>
      </div>

      <Tabs defaultValue="connections">
        <TabsList><TabsTrigger value="connections">Connections</TabsTrigger><TabsTrigger value="campaigns">Campaigns</TabsTrigger></TabsList>
        
        <TabsContent value="connections" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : connections.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium">No connections yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Connect your Instantly account to start syncing campaigns.</p>
                <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Connect Account</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {connections.map((conn) => (
                <Card key={conn.id}>
                  <CardHeader className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">{conn.label}</CardTitle>
                        <CardDescription>Connected {new Date(conn.created_at).toLocaleDateString()}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={conn.status === "active" ? "default" : "destructive"}>{conn.status}</Badge>
                        <Button variant="outline" size="sm"><RefreshCw className="h-4 w-4 mr-1" />Sync</Button>
                      </div>
                    </div>
                  </CardHeader>
                  {conn.last_synced_at && (
                    <CardContent className="py-0 pb-4">
                      <p className="text-xs text-muted-foreground">Last synced: {new Date(conn.last_synced_at).toLocaleString()}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : campaigns.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium">No campaigns synced</h3>
                <p className="text-sm text-muted-foreground">Connect an Instantly account and sync to see your campaigns.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Sends</TableHead>
                    <TableHead className="text-right">Opens</TableHead>
                    <TableHead className="text-right">Clicks</TableHead>
                    <TableHead className="text-right">Replies</TableHead>
                    <TableHead className="text-right">Bounces</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((camp) => (
                    <TableRow key={camp.id}>
                      <TableCell className="font-medium">{camp.name}</TableCell>
                      <TableCell><Badge variant={camp.status === "active" ? "default" : "secondary"}>{camp.status}</Badge></TableCell>
                      <TableCell className="text-right">{camp.stats_sends.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{camp.stats_opens.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{camp.stats_clicks.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{camp.stats_replies.toLocaleString()}</TableCell>
                      <TableCell className="text-right">{camp.stats_bounces.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}