"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Search, Filter, X, ArrowUpDown } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { ClientContact, Client, CONTACT_SENIORITIES, ContactSeniority } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"

type ContactWithClient = ClientContact & { clients: Client | null }

const seniorityColors: Record<string, string> = {
  c_level: "bg-purple-100 text-purple-800",
  vp: "bg-blue-100 text-blue-800",
  director: "bg-green-100 text-green-800",
  manager: "bg-yellow-100 text-yellow-800",
  ic: "bg-slate-100 text-slate-800",
}

const INDUSTRIES = ["Technology", "Healthcare", "Finance", "Manufacturing", "Retail", "Other"]

export default function ContactsPage() {
  const [contacts, setContacts] = useState<ContactWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortField, setSortField] = useState<string>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")

  const [filters, setFilters] = useState({
    seniority: [] as string[],
    industry: "",
    titleContains: "",
    hasOpenOpportunity: false,
  })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    
    const { data: contactsData, error } = await supabase
      .from("client_contacts")
      .select("*, clients(*)")
      .order(sortField, { ascending: sortDirection === "asc" })

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    let filtered = (contactsData || []) as ContactWithClient[]

    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(c => 
        c.name?.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.clients?.name?.toLowerCase().includes(searchLower)
      )
    }

    if (filters.seniority.length > 0) {
      filtered = filtered.filter(c => c.seniority && filters.seniority.includes(c.seniority))
    }

    if (filters.industry) {
      filtered = filtered.filter(c => c.clients?.industry === filters.industry)
    }

    if (filters.titleContains) {
      filtered = filtered.filter(c => 
        c.title?.toLowerCase().includes(filters.titleContains.toLowerCase())
      )
    }

    if (filters.hasOpenOpportunity) {
      const { data: oppsData } = await supabase
        .from("opportunities")
        .select("primary_contact_id")
        .not("stage", "in", '("won","lost")')
      
      const contactIdsWithOpps = new Set((oppsData || []).map(o => o.primary_contact_id).filter(Boolean))
      filtered = filtered.filter(c => contactIdsWithOpps.has(c.id))
    }

    setContacts(filtered)
    setLoading(false)
  }, [search, filters, sortField, sortDirection])

  useEffect(() => { fetchContacts() }, [fetchContacts])

  function handleSort(field: string) {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const activeFilterCount = [
    filters.seniority.length > 0,
    !!filters.industry,
    !!filters.titleContains,
    filters.hasOpenOpportunity,
  ].filter(Boolean).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Contacts</h1>
      </div>

      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search contacts or clients..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />Filters
              {activeFilterCount > 0 && <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Seniority</Label>
                <div className="flex flex-wrap gap-2">
                  {CONTACT_SENIORITIES.map((s) => (
                    <Badge
                      key={s}
                      variant={filters.seniority.includes(s) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => {
                        setFilters({
                          ...filters,
                          seniority: filters.seniority.includes(s)
                            ? filters.seniority.filter(x => x !== s)
                            : [...filters.seniority, s]
                        })
                      }}
                    >
                      {s.replace("_", "-").toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Title Contains</Label>
                <Input 
                  placeholder="e.g. VP, Director" 
                  value={filters.titleContains} 
                  onChange={(e) => setFilters({ ...filters, titleContains: e.target.value })} 
                />
              </div>

              <div className="space-y-2">
                <Label>Industry</Label>
                <Select value={filters.industry} onValueChange={(v) => setFilters({ ...filters, industry: v === "all" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="All industries" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All industries</SelectItem>
                    {INDUSTRIES.map((i) => (<SelectItem key={i} value={i}>{i}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="hasOpp" checked={filters.hasOpenOpportunity} onCheckedChange={(c) => setFilters({ ...filters, hasOpenOpportunity: !!c })} />
                <label htmlFor="hasOpp" className="text-sm">Has open opportunity</label>
              </div>

              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters({ seniority: [], industry: "", titleContains: "", hasOpenOpportunity: false })}>
                  <X className="mr-2 h-4 w-4" />Clear filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort("name")}>
                <div className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Seniority</TableHead>
              <TableHead>Decision Maker</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort("created_at")}>
                <div className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : contacts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No contacts found</TableCell>
              </TableRow>
            ) : (
              contacts.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {contact.is_primary_contact && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    </div>
                  </TableCell>
                  <TableCell>{contact.title || "-"}</TableCell>
                  <TableCell>
                    {contact.clients ? (
                      <Link href={`/clients/${contact.client_id}`} className="hover:underline">{contact.clients.name}</Link>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a>
                  </TableCell>
                  <TableCell>
                    {contact.seniority ? (
                      <Badge className={seniorityColors[contact.seniority] || ""}>
                        {contact.seniority.replace("_", "-").toUpperCase()}
                      </Badge>
                    ) : "-"}
                  </TableCell>
                  <TableCell>
                    {contact.is_decision_maker ? <Badge className="bg-green-100 text-green-800">Yes</Badge> : "-"}
                  </TableCell>
                  <TableCell>{new Date(contact.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
