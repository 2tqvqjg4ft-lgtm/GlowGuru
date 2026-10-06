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
          client_comment: string
          client_id: string
          created_at: string
          id: string
          service_id: string | null
          specialist_notes: string
          starts_at: string
          status: string
        }
        Insert: {
          client_comment?: string
          client_id: string
          created_at?: string
          id?: string
          service_id?: string | null
          specialist_notes?: string
          starts_at: string
          status?: string
        }
        Update: {
          client_comment?: string
          client_id?: string
          created_at?: string
          id?: string
          service_id?: string | null
          specialist_notes?: string
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      care_items: {
        Row: {
          client_comment: string
          client_id: string
          created_at: string
          decision: string | null
          id: string
          name: string
          photo_path: string
          review_id: string
          specialist_comment: string
          updated_at: string
        }
        Insert: {
          client_comment?: string
          client_id: string
          created_at?: string
          decision?: string | null
          id?: string
          name?: string
          photo_path: string
          review_id: string
          specialist_comment?: string
          updated_at?: string
        }
        Update: {
          client_comment?: string
          client_id?: string
          created_at?: string
          decision?: string | null
          id?: string
          name?: string
          photo_path?: string
          review_id?: string
          specialist_comment?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "care_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      care_reviews: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          general_comment: string
          id: string
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          general_comment?: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          general_comment?: string
          id?: string
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      client_cards: {
        Row: {
          allergies: string
          client_id: string
          contraindications: string
          notes: string
          skin_type: string
          updated_at: string
        }
        Insert: {
          allergies?: string
          client_id: string
          contraindications?: string
          notes?: string
          skin_type?: string
          updated_at?: string
        }
        Update: {
          allergies?: string
          client_id?: string
          contraindications?: string
          notes?: string
          skin_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      client_journal: {
        Row: {
          client_id: string
          data: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          data?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      client_plans: {
        Row: {
          client_id: string
          data: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          data?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_tokens: {
        Row: {
          id: number
          token: string
        }
        Insert: {
          id?: number
          token?: string
        }
        Update: {
          id?: number
          token?: string
        }
        Relationships: []
      }
      library_products: {
        Row: {
          archived: boolean
          brand: string
          category: string
          created_at: string
          description: string
          directions: string[]
          has_active: boolean
          id: string
          inci: string
          key_ingredients: string
          name: string
          photo_url: string | null
          specialist_notes: string
          subcategory: string
          updated_at: string
          usage_rules: string
        }
        Insert: {
          archived?: boolean
          brand?: string
          category?: string
          created_at?: string
          description?: string
          directions?: string[]
          has_active?: boolean
          id: string
          inci?: string
          key_ingredients?: string
          name: string
          photo_url?: string | null
          specialist_notes?: string
          subcategory?: string
          updated_at?: string
          usage_rules?: string
        }
        Update: {
          archived?: boolean
          brand?: string
          category?: string
          created_at?: string
          description?: string
          directions?: string[]
          has_active?: boolean
          id?: string
          inci?: string
          key_ingredients?: string
          name?: string
          photo_url?: string | null
          specialist_notes?: string
          subcategory?: string
          updated_at?: string
          usage_rules?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          photo_path: string | null
          read_at: string | null
          receiver_id: string | null
          sender_id: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          photo_path?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          photo_path?: string | null
          read_at?: string | null
          receiver_id?: string | null
          sender_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          client_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          client_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          birth_date: string | null
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      published_plans: {
        Row: {
          client_id: string
          data: Json
          published_at: string
          published_by: string | null
          viewed_at: string | null
        }
        Insert: {
          client_id: string
          data?: Json
          published_at?: string
          published_by?: string | null
          viewed_at?: string | null
        }
        Update: {
          client_id?: string
          data?: Json
          published_at?: string
          published_by?: string | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      questionnaires: {
        Row: {
          client_id: string
          completed_at: string
          data: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string
          data?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string
          data?: Json
          updated_at?: string
        }
        Relationships: []
      }
      scheduled_pushes: {
        Row: {
          body: string
          id: string
          key: string
          kind: string
          path: string | null
          send_at: string
          sent_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          id?: string
          key: string
          kind: string
          path?: string | null
          send_at: string
          sent_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          id?: string
          key?: string
          kind?: string
          path?: string | null
          send_at?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      services: {
        Row: {
          created_at: string
          description: string
          duration_min: number
          id: string
          is_active: boolean
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name: string
          price?: number
        }
        Update: {
          created_at?: string
          description?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number
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
      [_ in never]: never
    }
    Functions: {
      client_name: { Args: { _id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_specialists: {
        Args: {
          _body: string
          _client: string
          _eid: string
          _etype: string
          _setting: string
          _title: string
          _type: string
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _body: string
          _client: string
          _eid: string
          _etype: string
          _path: string
          _setting: string
          _title: string
          _type: string
          _user: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "specialist" | "client"
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
      app_role: ["specialist", "client"],
    },
  },
} as const
