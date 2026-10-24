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
      apply_product_profile: {
        Args: { pid: string; profile: Json }
        Returns: undefined
      }
      can_access_product: { Args: { pid: string }; Returns: boolean }
      collect_tracking_event: {
        Args: { payload: Json; pid: string }
        Returns: boolean
      }
      funnel_summary: { Args: { days?: number; pid: string }; Returns: Json }
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
