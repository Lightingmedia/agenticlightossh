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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agent_id: string
          cpu: number
          created_at: string
          id: string
          memory: number
          name: string
          status: string
          tasks: number
          type: string
          updated_at: string
          uptime: string
        }
        Insert: {
          agent_id: string
          cpu?: number
          created_at?: string
          id?: string
          memory?: number
          name: string
          status?: string
          tasks?: number
          type: string
          updated_at?: string
          uptime?: string
        }
        Update: {
          agent_id?: string
          cpu?: number
          created_at?: string
          id?: string
          memory?: number
          name?: string
          status?: string
          tasks?: number
          type?: string
          updated_at?: string
          uptime?: string
        }
        Relationships: []
      }
      gpu_metrics: {
        Row: {
          created_at: string
          gpu_id: string
          gpu_name: string
          id: string
          memory_total: number
          memory_used: number
          power: number
          status: string
          temperature: number
          updated_at: string
          utilization: number
        }
        Insert: {
          created_at?: string
          gpu_id: string
          gpu_name: string
          id?: string
          memory_total?: number
          memory_used?: number
          power?: number
          status?: string
          temperature?: number
          updated_at?: string
          utilization?: number
        }
        Update: {
          created_at?: string
          gpu_id?: string
          gpu_name?: string
          id?: string
          memory_total?: number
          memory_used?: number
          power?: number
          status?: string
          temperature?: number
          updated_at?: string
          utilization?: number
        }
        Relationships: []
      }
      inference_tasks: {
        Row: {
          created_at: string
          duration: string | null
          id: string
          model: string
          progress: number | null
          status: string
          task_id: string
          tokens: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration?: string | null
          id?: string
          model: string
          progress?: number | null
          status?: string
          task_id: string
          tokens?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration?: string | null
          id?: string
          model?: string
          progress?: number | null
          status?: string
          task_id?: string
          tokens?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          service: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          service: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          service?: string
        }
        Relationships: []
      }
      telemetry_data: {
        Row: {
          id: string
          metric_type: string
          timestamp: string
          value: number
        }
        Insert: {
          id?: string
          metric_type: string
          timestamp?: string
          value: number
        }
        Update: {
          id?: string
          metric_type?: string
          timestamp?: string
          value?: number
        }
        Relationships: []
      }
      testers: {
        Row: {
          active_title: string | null
          company_hq_address: string | null
          company_hq_country: string | null
          company_industry: string | null
          company_linkedin_url: string | null
          company_name: string | null
          company_website: string | null
          connections_count: number | null
          created_at: string
          department: string | null
          external_id: string | null
          followers_count: number | null
          full_name: string
          headline: string | null
          id: string
          linkedin_url: string | null
          location_country: string | null
          location_full: string | null
          management_level: string | null
        }
        Insert: {
          active_title?: string | null
          company_hq_address?: string | null
          company_hq_country?: string | null
          company_industry?: string | null
          company_linkedin_url?: string | null
          company_name?: string | null
          company_website?: string | null
          connections_count?: number | null
          created_at?: string
          department?: string | null
          external_id?: string | null
          followers_count?: number | null
          full_name: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location_country?: string | null
          location_full?: string | null
          management_level?: string | null
        }
        Update: {
          active_title?: string | null
          company_hq_address?: string | null
          company_hq_country?: string | null
          company_industry?: string | null
          company_linkedin_url?: string | null
          company_name?: string | null
          company_website?: string | null
          connections_count?: number | null
          created_at?: string
          department?: string | null
          external_id?: string | null
          followers_count?: number | null
          full_name?: string
          headline?: string | null
          id?: string
          linkedin_url?: string | null
          location_country?: string | null
          location_full?: string | null
          management_level?: string | null
        }
        Relationships: []
      }
      thermal_zones: {
        Row: {
          fan_speed: number
          id: string
          name: string
          temperature: number
          throttling: boolean
          updated_at: string
          zone_id: string
        }
        Insert: {
          fan_speed?: number
          id?: string
          name: string
          temperature?: number
          throttling?: boolean
          updated_at?: string
          zone_id: string
        }
        Update: {
          fan_speed?: number
          id?: string
          name?: string
          temperature?: number
          throttling?: boolean
          updated_at?: string
          zone_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
