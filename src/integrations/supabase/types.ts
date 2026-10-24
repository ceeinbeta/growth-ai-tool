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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          cost_usd: number | null
          created_at: string
          feature: string
          id: string
          input_tokens: number | null
          model: string
          output_tokens: number | null
          product_id: string
        }
        Insert: {
          cost_usd?: number | null
          created_at?: string
          feature: string
          id?: string
          input_tokens?: number | null
          model: string
          output_tokens?: number | null
          product_id: string
        }
        Update: {
          cost_usd?: number | null
          created_at?: string
          feature?: string
          id?: string
          input_tokens?: number | null
          model?: string
          output_tokens?: number | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      allowed_emails: {
        Row: {
          created_at: string | null
          email: string
          note: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          note?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          note?: string | null
        }
        Relationships: []
      }
      app_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          value: number
        }
        Insert: {
          key: string
          updated_at?: string
          value: number
        }
        Update: {
          key?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      audit_runs: {
        Row: {
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          created_at: string
          funnel_context: Json
          id: string
          model: string
          page_copy: Json
          product_id: string
        }
        Insert: {
          created_at?: string
          funnel_context: Json
          id?: string
          model: string
          page_copy: Json
          product_id: string
        }
        Update: {
          created_at?: string
          funnel_context?: Json
          id?: string
          model?: string
          page_copy?: Json
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          id: string
          name: string
          product_id: string
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_id: string
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          first_touch_campaign: string | null
          first_touch_medium: string | null
          first_touch_referrer_host: string | null
          first_touch_source: string | null
          id: string
          name: string
          path: string
          product_id: string
          referrer_host: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_referrer_host?: string | null
          first_touch_source?: string | null
          id?: string
          name: string
          path: string
          product_id: string
          referrer_host?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          first_touch_campaign?: string | null
          first_touch_medium?: string | null
          first_touch_referrer_host?: string | null
          first_touch_source?: string | null
          id?: string
          name?: string
          path?: string
          product_id?: string
          referrer_host?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visitor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          created_at: string
          id: string
          kind: string
          label: string
          match: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          label: string
          match: string
          position: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          label?: string
          match?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_steps_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      install_checks: {
        Row: {
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "install_checks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      leaks: {
        Row: {
          area: string
          audit_id: string
          created_at: string
          fix: string
          id: string
          impact: string
          issue: string
          product_id: string
          rewrite: string
          status: string
        }
        Insert: {
          area: string
          audit_id: string
          created_at?: string
          fix: string
          id?: string
          impact: string
          issue: string
          product_id: string
          rewrite?: string
          status?: string
        }
        Update: {
          area?: string
          audit_id?: string
          created_at?: string
          fix?: string
          id?: string
          impact?: string
          issue?: string
          product_id?: string
          rewrite?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leaks_audit_id_product_id_fkey"
            columns: ["audit_id", "product_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id", "product_id"]
          },
          {
            foreignKeyName: "leaks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          created_at: string
          role: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          aliases: string[]
          audience: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          name: string
          one_liner: string | null
          profile_edited_fields: string[]
          profile_source: string | null
          profiled_at: string | null
          stage: string
          tracking_key: string
          url: string
          workspace_id: string
        }
        Insert: {
          aliases?: string[]
          audience?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          name: string
          one_liner?: string | null
          profile_edited_fields?: string[]
          profile_source?: string | null
          profiled_at?: string | null
          stage: string
          tracking_key?: string
          url: string
          workspace_id: string
        }
        Update: {
          aliases?: string[]
          audience?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          one_liner?: string | null
          profile_edited_fields?: string[]
          profile_source?: string | null
          profiled_at?: string | null
          stage?: string
          tracking_key?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_ai_state: {
        Row: {
          blocked: boolean
          message: string | null
          model: string
          updated_at: string
        }
        Insert: {
          blocked?: boolean
          message?: string | null
          model: string
          updated_at?: string
        }
        Update: {
          blocked?: boolean
          message?: string | null
          model?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_runs: {
        Row: {
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_checks: {
        Row: {
          engines: string[]
          estimated_cost_usd: number | null
          finished_at: string | null
          id: string
          note: string | null
          product_id: string
          runs_per_question: number
          started_at: string
          status: string
        }
        Insert: {
          engines: string[]
          estimated_cost_usd?: number | null
          finished_at?: string | null
          id?: string
          note?: string | null
          product_id: string
          runs_per_question: number
          started_at?: string
          status?: string
        }
        Update: {
          engines?: string[]
          estimated_cost_usd?: number | null
          finished_at?: string | null
          id?: string
          note?: string | null
          product_id?: string
          runs_per_question?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_checks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_fixes: {
        Row: {
          check_id: string
          created_at: string
          id: string
          product_id: string
          text: Json
        }
        Insert: {
          check_id: string
          created_at?: string
          id?: string
          product_id: string
          text: Json
        }
        Update: {
          check_id?: string
          created_at?: string
          id?: string
          product_id?: string
          text?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sov_fixes_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "sov_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_fixes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_mentions: {
        Row: {
          id: string
          kind: string
          name: string
          product_id: string
          rank: number
          run_id: string
        }
        Insert: {
          id?: string
          kind: string
          name: string
          product_id: string
          rank: number
          run_id: string
        }
        Update: {
          id?: string
          kind?: string
          name?: string
          product_id?: string
          rank?: number
          run_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_mentions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_mentions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "sov_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_questions: {
        Row: {
          active: boolean
          created_at: string
          id: string
          product_id: string
          question: string
          source: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          product_id: string
          question: string
          source?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          product_id?: string
          question?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_runs: {
        Row: {
          answer_excerpt: string | null
          check_id: string
          cited_hosts: string[] | null
          cost_usd: number | null
          created_at: string
          engine: string
          error: string | null
          id: string
          input_tokens: number | null
          output_tokens: number | null
          product_id: string
          question: string
          run_index: number
          search_calls: number | null
          status: string
        }
        Insert: {
          answer_excerpt?: string | null
          check_id: string
          cited_hosts?: string[] | null
          cost_usd?: number | null
          created_at?: string
          engine: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          product_id: string
          question: string
          run_index: number
          search_calls?: number | null
          status?: string
        }
        Update: {
          answer_excerpt?: string | null
          check_id?: string
          cited_hosts?: string[] | null
          cost_usd?: number | null
          created_at?: string
          engine?: string
          error?: string | null
          id?: string
          input_tokens?: number | null
          output_tokens?: number | null
          product_id?: string
          question?: string
          run_index?: number
          search_calls?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_runs_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "sov_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sov_runs_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      sov_schedule: {
        Row: {
          enabled: boolean
          per_week: number
          product_id: string
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          per_week?: number
          product_id: string
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          per_week?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sov_schedule_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      tracking_event_names: {
        Row: {
          name: string
          product_id: string
        }
        Insert: {
          name: string
          product_id: string
        }
        Update: {
          name?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tracking_event_names_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_signups: {
        Row: {
          consent_at: string
          consent_text: string
          created_at: string
          email: string
          id: string
          invited_at: string | null
          stage: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
          website: string | null
        }
        Insert: {
          consent_at: string
          consent_text: string
          created_at?: string
          email: string
          id?: string
          invited_at?: string | null
          stage?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Update: {
          consent_at?: string
          consent_text?: string
          created_at?: string
          email?: string
          id?: string
          invited_at?: string | null
          stage?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          website?: string | null
        }
        Relationships: []
      }
      waitlist_submissions: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          max_products: number
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          max_products?: number
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          max_products?: number
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_waitlist_entry: {
        Args: { entry_id: string }
        Returns: undefined
      }
      admin_invite_email: {
        Args: { addr: string; note?: string }
        Returns: undefined
      }
      admin_list_invites: { Args: never; Returns: Json }
      admin_list_waitlist: { Args: never; Returns: Json }
      admin_set_setting: {
        Args: { setting_key: string; val: number }
        Returns: undefined
      }
      admin_summary: { Args: never; Returns: Json }
      admin_uninvite_email: { Args: { addr: string }; Returns: undefined }
      apply_product_profile: {
        Args: { pid: string; profile: Json }
        Returns: undefined
      }
      can_access_product: { Args: { pid: string }; Returns: boolean }
      collect_tracking_event: {
        Args: { payload: Json; pid: string }
        Returns: boolean
      }
      finish_sov_check: {
        Args: { check_id: string; final_cost: number; new_status: string }
        Returns: undefined
      }
      funnel_summary: { Args: { days?: number; pid: string }; Returns: Json }
      is_app_admin: { Args: never; Returns: boolean }
      is_workspace_member: { Args: { ws: string }; Returns: boolean }
      replace_funnel_steps: {
        Args: { pid: string; steps: Json }
        Returns: undefined
      }
      reserve_ai_run: {
        Args: { feature: string; pid: string }
        Returns: string
      }
      reserve_install_check: { Args: { pid: string }; Returns: undefined }
      reserve_profile_run: { Args: { pid: string }; Returns: string }
      reserve_sov_check: {
        Args: {
          p_engines: string[]
          p_estimated_cost: number
          p_runs_per_question: number
          pid: string
        }
        Returns: string
      }
      save_page_audit: {
        Args: {
          copy: Json
          findings: Json
          funnel: Json
          model_name: string
          pid: string
        }
        Returns: string
      }
      sov_budget_info: { Args: never; Returns: Json }
      submit_waitlist: { Args: { entry: Json }; Returns: boolean }
      tracking_summary: { Args: { pid: string }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
