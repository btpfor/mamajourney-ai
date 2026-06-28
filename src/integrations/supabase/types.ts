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
      appointments: {
        Row: {
          appointment_date: string
          appointment_type: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          title: string
          user_id: string
        }
        Insert: {
          appointment_date: string
          appointment_type?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          title: string
          user_id: string
        }
        Update: {
          appointment_date?: string
          appointment_type?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          blood_pressure: string | null
          created_at: string
          entry_date: string
          id: string
          mood: string | null
          notes: string | null
          user_id: string
          weight_kg: number | null
        }
        Insert: {
          blood_pressure?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id: string
          weight_kg?: number | null
        }
        Update: {
          blood_pressure?: string | null
          created_at?: string
          entry_date?: string
          id?: string
          mood?: string | null
          notes?: string | null
          user_id?: string
          weight_kg?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          parts: Json
          role: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          parts?: Json
          role: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          parts?: Json
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          channel_inapp: boolean
          channel_push: boolean
          reminder_offsets_minutes: number[]
          updated_at: string
          user_id: string
          weekly_day: number
          weekly_enabled: boolean
          weekly_hour_utc: number
        }
        Insert: {
          channel_inapp?: boolean
          channel_push?: boolean
          reminder_offsets_minutes?: number[]
          updated_at?: string
          user_id: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_hour_utc?: number
        }
        Update: {
          channel_inapp?: boolean
          channel_push?: boolean
          reminder_offsets_minutes?: number[]
          updated_at?: string
          user_id?: string
          weekly_day?: number
          weekly_enabled?: boolean
          weekly_hour_utc?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          appointment_id: string | null
          body: string | null
          created_at: string
          delivered_at: string | null
          id: string
          link: string | null
          push_sent_at: string | null
          read_at: string | null
          scheduled_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          appointment_id?: string | null
          body?: string | null
          created_at?: string
          delivered_at?: string | null
          id?: string
          link?: string | null
          push_sent_at?: string | null
          read_at?: string | null
          scheduled_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          due_date: string | null
          full_name: string | null
          id: string
          last_weekly_notified_week: number | null
          lmp_date: string | null
          locale: string
          onboarded: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          full_name?: string | null
          id: string
          last_weekly_notified_week?: number | null
          lmp_date?: string | null
          locale?: string
          onboarded?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          full_name?: string | null
          id?: string
          last_weekly_notified_week?: number | null
          lmp_date?: string | null
          locale?: string
          onboarded?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      symptoms: {
        Row: {
          created_at: string
          entry_date: string
          id: string
          intensity: number
          notes: string | null
          symptom: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_date?: string
          id?: string
          intensity?: number
          notes?: string | null
          symptom: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_date?: string
          id?: string
          intensity?: number
          notes?: string | null
          symptom?: string
          user_id?: string
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
