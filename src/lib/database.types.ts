export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      [key: string]: {
        Row: Record<string, Json | undefined>
        Insert: Record<string, Json | undefined>
        Update: Record<string, Json | undefined>
        Relationships: []
      }
      applications: {
        Row: {
          id: string
          account_id: string
          candidate_id: string
          job_id: string
          stage: string | null
          position: number
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          candidate_id: string
          job_id: string
          stage?: string | null
          position?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          candidate_id?: string
          job_id?: string
          stage?: string | null
          position?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          id: string
          account_id: string
          object_type: string | null
          object_id: string | null
          type: string | null
          payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          account_id: string
          object_type?: string | null
          object_id?: string | null
          type?: string | null
          payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          object_type?: string | null
          object_id?: string | null
          type?: string | null
          payload?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          id: string
          account_id: string
          title: string
        }
        Insert: {
          id?: string
          account_id: string
          title: string
        }
        Update: {
          id?: string
          account_id?: string
          title?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          id: string
          account_id: string
          name: string
          industry: string | null
          website: string | null
          region: string | null
          status: string | null
          owner_id: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          name: string
          industry?: string | null
          website?: string | null
          region?: string | null
          status?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          name?: string
          industry?: string | null
          website?: string | null
          region?: string | null
          status?: string | null
          owner_id?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          id: string
          account_id: string
          candidate_id: string
          job_order_id: string
          submission_status: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          account_id: string
          candidate_id: string
          job_order_id: string
          submission_status?: string | null
          updated_at?: string
        }
        Update: {
          id?: string
          account_id?: string
          candidate_id?: string
          job_order_id?: string
          submission_status?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      job_orders: {
        Row: {
          id: string
          account_id: string
          company_id: string | null
          fee_percent: number | null
        }
        Insert: {
          id?: string
          account_id: string
          company_id?: string | null
          fee_percent?: number | null
        }
        Update: {
          id?: string
          account_id?: string
          company_id?: string | null
          fee_percent?: number | null
        }
        Relationships: []
      }
      placements: {
        Row: {
          id: string
          account_id: string
          submission_id: string
          candidate_id: string
          job_order_id: string
          company_id: string | null
          start_date: string
          guarantee_end_date: string
          fee: number | null
          revenue: number | null
          placement_status: string | null
          offer_status: string | null
        }
        Insert: {
          id?: string
          account_id: string
          submission_id: string
          candidate_id: string
          job_order_id: string
          company_id?: string | null
          start_date: string
          guarantee_end_date: string
          fee?: number | null
          revenue?: number | null
          placement_status?: string | null
          offer_status?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          submission_id?: string
          candidate_id?: string
          job_order_id?: string
          company_id?: string | null
          start_date?: string
          guarantee_end_date?: string
          fee?: number | null
          revenue?: number | null
          placement_status?: string | null
          offer_status?: string | null
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          account_id: string
          entity_type: string
          entity_id: string
          title: string
          status: string
          priority: string
          due_date: string | null
          assignee_user_id: string | null
        }
        Insert: {
          id?: string
          account_id: string
          entity_type: string
          entity_id: string
          title: string
          status: string
          priority: string
          due_date?: string | null
          assignee_user_id?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          entity_type?: string
          entity_id?: string
          title?: string
          status?: string
          priority?: string
          due_date?: string | null
          assignee_user_id?: string | null
        }
        Relationships: []
      }
      interviews: {
        Row: {
          id: string
          account_id: string
          application_id: string
          start_time: string | null
        }
        Insert: {
          id?: string
          account_id: string
          application_id: string
          start_time?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          application_id?: string
          start_time?: string | null
        }
        Relationships: []
      }
      sequences_inst: {
        Row: {
          id: string
          account_id: string
          application_id: string
        }
        Insert: {
          id?: string
          account_id: string
          application_id: string
        }
        Update: {
          id?: string
          account_id?: string
          application_id?: string
        }
        Relationships: []
      }
      instantly_connections: {
        Row: {
          id: string
          account_id: string
          api_key_encrypted: string
          last_synced_at: string | null
        }
        Insert: {
          id?: string
          account_id: string
          api_key_encrypted: string
          last_synced_at?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          api_key_encrypted?: string
          last_synced_at?: string | null
        }
        Relationships: []
      }
      instantly_campaigns: {
        Row: {
          id: string
          connection_id: string
          account_id: string
          instantly_campaign_id: string
          name: string
          status: string
          stats_sends: number
          stats_opens: number
          stats_clicks: number
          stats_replies: number
          stats_bounces: number
          raw_data: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          account_id: string
          instantly_campaign_id: string
          name: string
          status: string
          stats_sends?: number
          stats_opens?: number
          stats_clicks?: number
          stats_replies?: number
          stats_bounces?: number
          raw_data?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          account_id?: string
          instantly_campaign_id?: string
          name?: string
          status?: string
          stats_sends?: number
          stats_opens?: number
          stats_clicks?: number
          stats_replies?: number
          stats_bounces?: number
          raw_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      instantly_prospects: {
        Row: {
          id: string
          connection_id: string
          account_id: string
          instantly_prospect_id: string
          email: string | null
          first_name: string | null
          last_name: string | null
          company: string | null
          phone: string | null
          website: string | null
          status: string
          raw_data: Json | null
          updated_at: string
        }
        Insert: {
          id?: string
          connection_id: string
          account_id: string
          instantly_prospect_id: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          phone?: string | null
          website?: string | null
          status: string
          raw_data?: Json | null
          updated_at?: string
        }
        Update: {
          id?: string
          connection_id?: string
          account_id?: string
          instantly_prospect_id?: string
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          company?: string | null
          phone?: string | null
          website?: string | null
          status?: string
          raw_data?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
