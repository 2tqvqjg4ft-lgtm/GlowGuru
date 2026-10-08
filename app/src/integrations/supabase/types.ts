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
      active_schedule: {
        Row: {
          active_name: string | null
          client_id: string
          created_at: string
          id: string
          instructions: string | null
          period: Database["public"]["Enums"]["day_period"]
          scheduled_date: string
          specialist_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          active_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          period?: Database["public"]["Enums"]["day_period"]
          scheduled_date: string
          specialist_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          active_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          period?: Database["public"]["Enums"]["day_period"]
          scheduled_date?: string
          specialist_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_schedule_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_schedule_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_schedule_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "active_schedule_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_schedule_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_schedule_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_schedule_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "active_schedule_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_schedule_occurrences: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          id: string
          period: Database["public"]["Enums"]["day_period"]
          product_id: string | null
          product_name_snapshot: string | null
          schedule_id: string
          scheduled_date: string
          skip_note: string | null
          skip_reason: string | null
          skipped_at: string | null
          stage_id: string | null
          stage_label_snapshot: string | null
          stage_order_snapshot: number | null
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period: Database["public"]["Enums"]["day_period"]
          product_id?: string | null
          product_name_snapshot?: string | null
          schedule_id: string
          scheduled_date: string
          skip_note?: string | null
          skip_reason?: string | null
          skipped_at?: string | null
          stage_id?: string | null
          stage_label_snapshot?: string | null
          stage_order_snapshot?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          period?: Database["public"]["Enums"]["day_period"]
          product_id?: string | null
          product_name_snapshot?: string | null
          schedule_id?: string
          scheduled_date?: string
          skip_note?: string | null
          skip_reason?: string | null
          skipped_at?: string | null
          stage_id?: string | null
          stage_label_snapshot?: string | null
          stage_order_snapshot?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_schedule_occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "care_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedule_occurrences_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "care_schedule_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      care_schedule_stages: {
        Row: {
          created_at: string
          custom_rule: Json
          duration_days: number | null
          frequency_type: string
          id: string
          interval_value: number | null
          label: string | null
          schedule_id: string
          stage_order: number
          weekdays: number[]
          weekly_count_max: number | null
          weekly_count_min: number | null
        }
        Insert: {
          created_at?: string
          custom_rule?: Json
          duration_days?: number | null
          frequency_type: string
          id?: string
          interval_value?: number | null
          label?: string | null
          schedule_id: string
          stage_order: number
          weekdays?: number[]
          weekly_count_max?: number | null
          weekly_count_min?: number | null
        }
        Update: {
          created_at?: string
          custom_rule?: Json
          duration_days?: number | null
          frequency_type?: string
          id?: string
          interval_value?: number | null
          label?: string | null
          schedule_id?: string
          stage_order?: number
          weekdays?: number[]
          weekly_count_max?: number | null
          weekly_count_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "care_schedule_stages_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "care_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      care_schedules: {
        Row: {
          active_name: string | null
          client_id: string
          created_at: string
          id: string
          instructions: string | null
          is_as_needed: boolean
          periods: Database["public"]["Enums"]["day_period"][]
          product_id: string | null
          routine_item_id: string | null
          schedule_kind: string
          specialist_id: string
          start_date: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          active_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_as_needed?: boolean
          periods?: Database["public"]["Enums"]["day_period"][]
          product_id?: string | null
          routine_item_id?: string | null
          schedule_kind?: string
          specialist_id: string
          start_date?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          active_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          instructions?: string | null
          is_as_needed?: boolean
          periods?: Database["public"]["Enums"]["day_period"][]
          product_id?: string | null
          routine_item_id?: string | null
          schedule_kind?: string
          specialist_id?: string
          start_date?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "care_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "care_schedules_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_specialists: {
        Row: {
          client_id: string
          created_at: string
          specialist_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          specialist_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_specialists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_specialists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_specialists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_specialists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_specialists_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_specialists_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_specialists_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "client_specialists_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_entries: {
        Row: {
          client_id: string
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          photo_paths: string[]
          photo_urls: string[]
          skin_state: Json
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          photo_urls?: string[]
          skin_state?: Json
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          entry_date?: string
          id?: string
          notes?: string | null
          photo_paths?: string[]
          photo_urls?: string[]
          skin_state?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diary_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "diary_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_care_items: {
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
            foreignKeyName: "gg_care_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_care_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_care_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_care_items_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_care_items_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "gg_care_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_care_reviews: {
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
        Relationships: [
          {
            foreignKeyName: "gg_care_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_care_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_care_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_care_reviews_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_client_journal: {
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
        Relationships: [
          {
            foreignKeyName: "gg_client_journal_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_client_journal_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_client_journal_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_client_journal_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_client_plans: {
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
        Relationships: [
          {
            foreignKeyName: "gg_client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_client_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_library_products: {
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
      gg_messages: {
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
          body?: string
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
        Relationships: [
          {
            foreignKeyName: "gg_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_messages_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_notification_settings: {
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
        Relationships: [
          {
            foreignKeyName: "gg_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_notifications: {
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
        Relationships: [
          {
            foreignKeyName: "gg_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_notifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_published_plans: {
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
        Relationships: [
          {
            foreignKeyName: "gg_published_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_published_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_published_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_published_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_published_plans_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_published_plans_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_published_plans_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_published_plans_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_push_tokens: {
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
        Relationships: [
          {
            foreignKeyName: "gg_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_push_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_questionnaires: {
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
        Relationships: [
          {
            foreignKeyName: "gg_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      gg_scheduled_pushes: {
        Row: {
          body: string
          id: string
          key: string
          kind: string
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
          send_at?: string
          sent_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gg_scheduled_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_scheduled_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gg_scheduled_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "gg_scheduled_pushes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          recipient_id: string
          sender_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id: string
          sender_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          recipient_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_alternatives: {
        Row: {
          alternative_product_id: string
          created_at: string
          product_id: string
          reason: string | null
        }
        Insert: {
          alternative_product_id: string
          created_at?: string
          product_id: string
          reason?: string | null
        }
        Update: {
          alternative_product_id?: string
          created_at?: string
          product_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_alternatives_alternative_product_id_fkey"
            columns: ["alternative_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_alternatives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active_ingredients: string[]
          brand: string
          category: string
          caution: string | null
          created_at: string
          created_by: string | null
          description: string | null
          how: string | null
          id: string
          image_path: string | null
          image_url: string | null
          ingredients: string[] | null
          is_active: boolean
          name: string
          tags: string[]
          updated_at: string
          usage_instructions: string | null
          warnings: string | null
          what: string | null
        }
        Insert: {
          active_ingredients?: string[]
          brand: string
          category: string
          caution?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          how?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean
          name: string
          tags?: string[]
          updated_at?: string
          usage_instructions?: string | null
          warnings?: string | null
          what?: string | null
        }
        Update: {
          active_ingredients?: string[]
          brand?: string
          category?: string
          caution?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          how?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          ingredients?: string[] | null
          is_active?: boolean
          name?: string
          tags?: string[]
          updated_at?: string
          usage_instructions?: string | null
          warnings?: string | null
          what?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_date: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          birth_date?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      questionnaires: {
        Row: {
          answers: Json
          client_id: string
          created_at: string
          id: string
          reviewed_at: string | null
          status: string
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          answers?: Json
          client_id: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          answers?: Json
          client_id?: string
          created_at?: string
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "questionnaires_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_item_alternatives: {
        Row: {
          approved_by: string
          created_at: string
          id: string
          product_id: string
          routine_item_id: string
        }
        Insert: {
          approved_by: string
          created_at?: string
          id?: string
          product_id: string
          routine_item_id: string
        }
        Update: {
          approved_by?: string
          created_at?: string
          id?: string
          product_id?: string
          routine_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_item_alternatives_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_alternatives_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_alternatives_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_item_alternatives_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_alternatives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_alternatives_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_item_completions: {
        Row: {
          client_id: string
          completed_at: string
          completion_date: string
          id: string
          routine_item_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string
          completion_date?: string
          id?: string
          routine_item_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string
          completion_date?: string
          id?: string
          routine_item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_item_completions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_completions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_completions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_item_completions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_completions_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_item_schedule_dates: {
        Row: {
          created_at: string
          id: string
          routine_item_id: string
          scheduled_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          routine_item_id: string
          scheduled_date: string
        }
        Update: {
          created_at?: string
          id?: string
          routine_item_id?: string
          scheduled_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_item_schedule_dates_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: false
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_item_selections: {
        Row: {
          client_id: string
          routine_item_id: string
          selected_product_id: string
          updated_at: string
        }
        Insert: {
          client_id: string
          routine_item_id: string
          selected_product_id: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          routine_item_id?: string
          selected_product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_item_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routine_item_selections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_selections_routine_item_id_fkey"
            columns: ["routine_item_id"]
            isOneToOne: true
            referencedRelation: "routine_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_item_selections_selected_product_id_fkey"
            columns: ["selected_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_items: {
        Row: {
          alternative_group: string | null
          created_at: string
          id: string
          instructions: string | null
          is_additional: boolean
          is_optional: boolean
          period: Database["public"]["Enums"]["day_period"]
          product_id: string | null
          routine_id: string
          schedule_mode: string
          step_order: number
          weekdays: number[]
        }
        Insert: {
          alternative_group?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_additional?: boolean
          is_optional?: boolean
          period?: Database["public"]["Enums"]["day_period"]
          product_id?: string | null
          routine_id: string
          schedule_mode?: string
          step_order?: number
          weekdays?: number[]
        }
        Update: {
          alternative_group?: string | null
          created_at?: string
          id?: string
          instructions?: string | null
          is_additional?: boolean
          is_optional?: boolean
          period?: Database["public"]["Enums"]["day_period"]
          product_id?: string | null
          routine_id?: string
          schedule_mode?: string
          step_order?: number
          weekdays?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "routine_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_items_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          client_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          specialist_comment: string | null
          specialist_id: string
          status: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          client_id: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          specialist_comment?: string | null
          specialist_id: string
          status?: Database["public"]["Enums"]["recommendation_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          confirmed_at?: string | null
          created_at?: string
          id?: string
          specialist_comment?: string | null
          specialist_id?: string
          status?: Database["public"]["Enums"]["recommendation_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routines_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "routines_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      skin_profiles: {
        Row: {
          care_mode: string
          care_mode_note: string | null
          client_id: string
          concerns: string[]
          notes: string | null
          sensitivities: string[]
          skin_type: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          care_mode?: string
          care_mode_note?: string | null
          client_id: string
          concerns?: string[]
          notes?: string | null
          sensitivities?: string[]
          skin_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          care_mode?: string
          care_mode_note?: string | null
          client_id?: string
          concerns?: string[]
          notes?: string | null
          sensitivities?: string[]
          skin_type?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "skin_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skin_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "skin_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "skin_profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_notes: {
        Row: {
          body: string
          client_id: string
          created_at: string
          id: string
          specialist_id: string
          updated_at: string
        }
        Insert: {
          body: string
          client_id: string
          created_at?: string
          id?: string
          specialist_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          specialist_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "specialist_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_notes_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_notes_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "specialist_notes_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "gg_user_roles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "specialist_notes_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      gg_profiles: {
        Row: {
          birth_date: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gg_user_roles: {
        Row: {
          created_at: string | null
          id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          role?: never
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          role?: never
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      append_diary_photo_path: {
        Args: { p_entry_id: string; p_path: string }
        Returns: {
          client_id: string
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          photo_paths: string[]
          photo_urls: string[]
          skin_state: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "diary_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_linked: { Args: { a: string; b: string }; Returns: boolean }
      confirm_routine_atomic: {
        Args: { p_routine_id: string }
        Returns: {
          client_id: string
          confirmed_at: string | null
          created_at: string
          id: string
          specialist_comment: string | null
          specialist_id: string
          status: Database["public"]["Enums"]["recommendation_status"]
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "routines"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      gg_can_manage: { Args: { _client: string }; Returns: boolean }
      gg_has_role: {
        Args: { _role: string; _user_id: string }
        Returns: boolean
      }
      is_specialist: { Args: never; Returns: boolean }
      remove_diary_photo_path: {
        Args: { p_entry_id: string; p_path: string }
        Returns: {
          client_id: string
          created_at: string
          entry_date: string
          id: string
          notes: string | null
          photo_paths: string[]
          photo_urls: string[]
          skin_state: Json
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "diary_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_care_schedule_atomic: {
        Args: {
          p_active_name: string
          p_client_id: string
          p_instructions: string
          p_is_as_needed: boolean
          p_occurrences: Json
          p_periods: Database["public"]["Enums"]["day_period"][]
          p_product_id: string
          p_routine_item_id: string
          p_schedule_id: string
          p_schedule_kind: string
          p_stages: Json
          p_start_date: string
          p_status: string
          p_title: string
        }
        Returns: string
      }
    }
    Enums: {
      day_period: "morning" | "evening" | "anytime"
      recommendation_status: "draft" | "confirmed" | "archived"
      user_role: "client" | "specialist"
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
      day_period: ["morning", "evening", "anytime"],
      recommendation_status: ["draft", "confirmed", "archived"],
      user_role: ["client", "specialist"],
    },
  },
} as const
