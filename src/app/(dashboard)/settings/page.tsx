"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Account, Tag } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Trash2 } from "lucide-react"

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [newAccountName, setNewAccountName] = useState("")
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState("#6366f1")

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [accRes, tagRes] = await Promise.all([
      supabase.from("accounts").select("*").order("created_at"),
      supabase.from("tags").select("*").order("name"),
    ])
    setAccounts(accRes.data || [])
    setTags(tagRes.data || [])
    setLoading(false)
  }

  async function createAccount() {
    if (!newAccountName.trim()) return
    await supabase.from("accounts").insert([{ name: newAccountName }])
    setNewAccountName("")
    fetchData()
  }

  async function createTag() {
    if (!newTagName.trim()) return
    await supabase.from("tags").insert([{ name: newTagName, color: newTagColor }])
    setNewTagName("")
    setNewTagColor("#6366f1")
    fetchData()
  }

  async function deleteTag(id: string) {
    await supabase.from("tags").delete().eq("id", id)
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account, tags, and integrations</p>
      </div>

      <Tabs defaultValue="account">
        <TabsList><TabsTrigger value="account">Account</TabsTrigger><TabsTrigger value="tags">Tags</TabsTrigger><TabsTrigger value="integrations">Integrations</TabsTrigger></TabsList>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Accounts / Organizations</CardTitle>
              <CardDescription>Manage your multi-tenant accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="New account name" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
                <Button onClick={createAccount}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : accounts.length === 0 ? (
                <p className="text-muted-foreground">No accounts yet</p>
              ) : (
                <div className="space-y-2">
                  {accounts.map((acc) => (
                    <div key={acc.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div>
                        <p className="font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.slug || "No slug"} · {acc.plan}</p>
                      </div>
                      <Badge>{acc.plan}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
              <CardDescription>Create and manage tags for clients, candidates, and contacts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Tag name" value={newTagName} onChange={(e) => setNewTagName(e.target.value)} />
                <Input type="color" className="w-16" value={newTagColor} onChange={(e) => setNewTagColor(e.target.value)} />
                <Button onClick={createTag}><Plus className="h-4 w-4 mr-1" />Add</Button>
              </div>
              {loading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : tags.length === 0 ? (
                <p className="text-muted-foreground">No tags yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <Badge key={tag.id} style={{ backgroundColor: tag.color }} className="text-white flex items-center gap-1 px-3 py-1">
                      {tag.name}
                      <button onClick={() => deleteTag(tag.id)} className="hover:bg-white/20 rounded p-0.5">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integrations</CardTitle>
              <CardDescription>Connect external services</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Instantly</p>
                  <p className="text-sm text-muted-foreground">Cold email and outreach platform</p>
                </div>
                <Button variant="outline" asChild><a href="/instantly">Manage</a></Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">Cal.com</p>
                  <p className="text-sm text-muted-foreground">Interview scheduling</p>
                </div>
                <Badge variant="secondary">Per-project</Badge>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border opacity-50">
                <div>
                  <p className="font-medium">Gmail / Outlook</p>
                  <p className="text-sm text-muted-foreground">Email sync (coming soon)</p>
                </div>
                <Badge variant="outline">Coming Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
