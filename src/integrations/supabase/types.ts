export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      access_events: {
        Row: {
          actor: string
          api_key_id: string | null
          country: string
          created_at: string
          id: string
          method: string
          path: string
          referer: string
          surface: string
          tier: string
          user_agent: string
          user_id: string | null
        }
        Insert: {
          actor?: string
          api_key_id?: string | null
          country?: string
          created_at?: string
          id?: string
          method?: string
          path: string
          referer?: string
          surface: string
          tier?: string
          user_agent?: string
          user_id?: string | null
        }
        Update: {
          actor?: string
          api_key_id?: string | null
          country?: string
          created_at?: string
          id?: string
          method?: string
          path?: string
          referer?: string
          surface?: string
          tier?: string
          user_agent?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "access_events_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          agent_label: string
          created_at: string
          id: string
          key_hash: string
          key_prefix: string
          kind: string
          last_used_at: string | null
          name: string
          revoked_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_label?: string
          created_at?: string
          id?: string
          key_hash: string
          key_prefix: string
          kind?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_label?: string
          created_at?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          kind?: string
          last_used_at?: string | null
          name?: string
          revoked_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_usage: {
        Row: {
          actor: string
          calls: number
          day: string
          id: string
        }
        Insert: {
          actor: string
          calls?: number
          day?: string
          id?: string
        }
        Update: {
          actor?: string
          calls?: number
          day?: string
          id?: string
        }
        Relationships: []
      }
      entries: {
        Row: {
          auth_mode: string
          auth_params: Json
          avg_latency_ms: number | null
          capabilities: string[]
          capability_checked_at: string | null
          capability_detail: string
          capability_ok: boolean | null
          category: Database["public"]["Enums"]["entry_category"]
          checks_ok: number
          checks_total: number
          created_at: string
          description: string
          discovered_tools: string[]
          docs_url: string | null
          endpoint: string
          featured: boolean
          health_checked_at: string | null
          health_latency_ms: number | null
          health_ok: boolean | null
          health_status_code: number | null
          id: string
          input_format: string
          invocation_example: string
          name: string
          output_format: string
          pricing: string
          probe_url: string | null
          rate_limit: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          source: string
          status: Database["public"]["Enums"]["entry_status"]
          submitted_by: string | null
          summary: string
          tags: string[]
          updated_at: string
          verified: boolean
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          auth_mode?: string
          auth_params?: Json
          avg_latency_ms?: number | null
          capabilities?: string[]
          capability_checked_at?: string | null
          capability_detail?: string
          capability_ok?: boolean | null
          category: Database["public"]["Enums"]["entry_category"]
          checks_ok?: number
          checks_total?: number
          created_at?: string
          description?: string
          discovered_tools?: string[]
          docs_url?: string | null
          endpoint: string
          featured?: boolean
          health_checked_at?: string | null
          health_latency_ms?: number | null
          health_ok?: boolean | null
          health_status_code?: number | null
          id?: string
          input_format?: string
          invocation_example?: string
          name: string
          output_format?: string
          pricing?: string
          probe_url?: string | null
          rate_limit?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          source?: string
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_by?: string | null
          summary: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          auth_mode?: string
          auth_params?: Json
          avg_latency_ms?: number | null
          capabilities?: string[]
          capability_checked_at?: string | null
          capability_detail?: string
          capability_ok?: boolean | null
          category?: Database["public"]["Enums"]["entry_category"]
          checks_ok?: number
          checks_total?: number
          created_at?: string
          description?: string
          discovered_tools?: string[]
          docs_url?: string | null
          endpoint?: string
          featured?: boolean
          health_checked_at?: string | null
          health_latency_ms?: number | null
          health_ok?: boolean | null
          health_status_code?: number | null
          id?: string
          input_format?: string
          invocation_example?: string
          name?: string
          output_format?: string
          pricing?: string
          probe_url?: string | null
          rate_limit?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          source?: string
          status?: Database["public"]["Enums"]["entry_status"]
          submitted_by?: string | null
          summary?: string
          tags?: string[]
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      entry_votes: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_votes_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_vote_counts"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      health_checks: {
        Row: {
          checked_at: string
          entry_id: string
          error: string | null
          id: string
          latency_ms: number | null
          ok: boolean
          probe_kind: string
          status_code: number | null
        }
        Insert: {
          checked_at?: string
          entry_id: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok: boolean
          probe_kind?: string
          status_code?: number | null
        }
        Update: {
          checked_at?: string
          entry_id?: string
          error?: string | null
          id?: string
          latency_ms?: number | null
          ok?: boolean
          probe_kind?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "health_checks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "health_checks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_vote_counts"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      invocation_reports: {
        Row: {
          created_at: string
          entry_id: string | null
          error: string | null
          id: string
          latency_ms: number | null
          outcome: string
          reported_by: string | null
          slug: string
          source: string
          status_code: number | null
        }
        Insert: {
          created_at?: string
          entry_id?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          outcome: string
          reported_by?: string | null
          slug: string
          source?: string
          status_code?: number | null
        }
        Update: {
          created_at?: string
          entry_id?: string | null
          error?: string | null
          id?: string
          latency_ms?: number | null
          outcome?: string
          reported_by?: string | null
          slug?: string
          source?: string
          status_code?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invocation_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invocation_reports_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_vote_counts"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      need_signals: {
        Row: {
          category: string | null
          created_at: string
          id: string
          matched_count: number
          need: string
          source: string
          tokens: string[]
          top_slug: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          matched_count?: number
          need: string
          source?: string
          tokens?: string[]
          top_slug?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          matched_count?: number
          need?: string
          source?: string
          tokens?: string[]
          top_slug?: string | null
        }
        Relationships: []
      }
      ops_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      publisher_alerts: {
        Row: {
          entry_id: string
          id: string
          kind: string
          recipient: string
          sent_at: string
        }
        Insert: {
          entry_id: string
          id?: string
          kind: string
          recipient?: string
          sent_at?: string
        }
        Update: {
          entry_id?: string
          id?: string
          kind?: string
          recipient?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "publisher_alerts_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publisher_alerts_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entry_vote_counts"
            referencedColumns: ["entry_id"]
          },
        ]
      }
      rate_limit_events: {
        Row: {
          actor: string
          bucket: string
          created_at: string
          id: string
        }
        Insert: {
          actor: string
          bucket: string
          created_at?: string
          id?: string
        }
        Update: {
          actor?: string
          bucket?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          environment: string
          id: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id: string
          paddle_subscription_id: string
          price_id: string
          product_id: string
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          environment?: string
          id?: string
          paddle_customer_id?: string
          paddle_subscription_id?: string
          price_id?: string
          product_id?: string
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      entry_vote_counts: {
        Row: {
          entry_id: string | null
          slug: string | null
          votes: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      consume_api_quota: {
        Args: { _actor: string; _limit: number }
        Returns: Json
      }
      consume_rate_limit: {
        Args: {
          _actor: string
          _bucket: string
          _limit: number
          _window_seconds: number
        }
        Returns: boolean
      }
      get_reputation: {
        Args: { _user_id: string }
        Returns: {
          approved_entries: number
          votes_received: number
        }[]
      }
      has_active_subscription: {
        Args: { check_env?: string; user_uuid: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      public_recent_incidents: {
        Args: { _limit?: number }
        Returns: {
          checked_at: string
          error: string
          name: string
          slug: string
          status_code: number
        }[]
      }
      public_uptime_daily: {
        Args: { _days?: number }
        Returns: {
          avg_latency: number
          checks: number
          day: string
          ok: number
          slug: string
        }[]
      }
      record_access_event: {
        Args: {
          _actor: string
          _api_key_id: string
          _country: string
          _method: string
          _path: string
          _referer: string
          _surface: string
          _tier: string
          _user_agent: string
          _user_id: string
        }
        Returns: undefined
      }
      trigger_health_check_run: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      entry_category: "api" | "mcp" | "cli"
      entry_status: "pending" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      entry_category: ["api", "mcp", "cli"],
      entry_status: ["pending", "approved", "rejected"],
    },
  },
} as const
