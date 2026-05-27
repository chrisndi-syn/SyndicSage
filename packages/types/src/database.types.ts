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
      ai_embeddings: {
        Row: {
          building_id: string
          created_at: string
          embedding: string
          id: string
          model: string
          organization_id: string
          provider: string
          resource_id: string
          resource_type: string
        }
        Insert: {
          building_id: string
          created_at?: string
          embedding: string
          id?: string
          model: string
          organization_id: string
          provider: string
          resource_id: string
          resource_type: string
        }
        Update: {
          building_id?: string
          created_at?: string
          embedding?: string
          id?: string
          model?: string
          organization_id?: string
          provider?: string
          resource_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_embeddings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_embeddings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          building_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json | null
          organization_id: string | null
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id: string
          building_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string
          building_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json | null
          organization_id?: string | null
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      building_members: {
        Row: {
          building_id: string
          created_at: string
          id: string
          invited_by: string | null
          joined_at: string | null
          role: string
          unit_id: string | null
          user_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role: string
          unit_id?: string | null
          user_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          joined_at?: string | null
          role?: string
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "building_members_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_building_members_unit"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      buildings: {
        Row: {
          address: string
          city: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          organization_id: string
          unit_count: number
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          organization_id: string
          unit_count: number
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          organization_id?: string
          unit_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buildings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      charges: {
        Row: {
          amount: number
          building_id: string
          created_at: string
          deleted_at: string | null
          due_date: string
          id: string
          notes: string | null
          owner_id: string | null
          paid_date: string | null
          period: string
          status: string
          title: string
        }
        Insert: {
          amount: number
          building_id: string
          created_at?: string
          deleted_at?: string | null
          due_date: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          paid_date?: string | null
          period: string
          status?: string
          title: string
        }
        Update: {
          amount?: number
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          paid_date?: string | null
          period?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "charges_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "charges_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ai_extractions: {
        Row: {
          building_id: string
          confidence: number | null
          created_at: string
          document_id: string
          extracted_data: Json
          id: string
          model: string
          provider: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          building_id: string
          confidence?: number | null
          created_at?: string
          document_id: string
          extracted_data: Json
          id?: string
          model: string
          provider: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          building_id?: string
          confidence?: number | null
          created_at?: string
          document_id?: string
          extracted_data?: Json
          id?: string
          model?: string
          provider?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_ai_extractions_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ai_extractions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_ai_summaries: {
        Row: {
          building_id: string
          created_at: string
          document_id: string
          id: string
          model: string
          provider: string
          summary: string
        }
        Insert: {
          building_id: string
          created_at?: string
          document_id: string
          id?: string
          model: string
          provider: string
          summary: string
        }
        Update: {
          building_id?: string
          created_at?: string
          document_id?: string
          id?: string
          model?: string
          provider?: string
          summary?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_ai_summaries_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_ai_summaries_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          building_id: string
          category: string
          checksum: string | null
          created_at: string
          deleted_at: string | null
          file_size: number | null
          id: string
          mime_type: string | null
          name: string
          storage_path: string
          uploaded_by: string
          virus_scanned_at: string | null
          visibility: string
        }
        Insert: {
          building_id: string
          category: string
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name: string
          storage_path: string
          uploaded_by: string
          virus_scanned_at?: string | null
          visibility?: string
        }
        Update: {
          building_id?: string
          category?: string
          checksum?: string | null
          created_at?: string
          deleted_at?: string | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          name?: string
          storage_path?: string
          uploaded_by?: string
          virus_scanned_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          building_id: string
          created_at: string
          deleted_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
          unit_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          building_id: string
          created_at?: string
          deleted_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: string
          status?: string
          token: string
          unit_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitations_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          building_id: string
          created_at: string
          deleted_at: string | null
          description: string
          id: string
          image_urls: string[] | null
          owner_id: string | null
          priority: string
          resolved_at: string | null
          status: string
          submitted_by: string
          title: string
          unit_id: string
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          deleted_at?: string | null
          description: string
          id?: string
          image_urls?: string[] | null
          owner_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          submitted_by: string
          title: string
          unit_id: string
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string
          id?: string
          image_urls?: string[] | null
          owner_id?: string | null
          priority?: string
          resolved_at?: string | null
          status?: string
          submitted_by?: string
          title?: string
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          building_id: string
          created_at: string
          date: string
          deleted_at: string | null
          id: string
          minutes: string | null
          status: string
          title: string
        }
        Insert: {
          agenda?: string | null
          building_id: string
          created_at?: string
          date: string
          deleted_at?: string | null
          id?: string
          minutes?: string | null
          status?: string
          title: string
        }
        Update: {
          agenda?: string | null
          building_id?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          id?: string
          minutes?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          building_id: string | null
          created_at: string
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          building_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          building_id?: string | null
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          plan: string
          vat_number: string | null
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          plan?: string
          vat_number?: string | null
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          plan?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      owners: {
        Row: {
          building_id: string
          created_at: string
          deleted_at: string | null
          email: string
          full_name: string
          id: string
          is_renter: boolean
          member_id: string | null
          phone: string | null
          unit_id: string
        }
        Insert: {
          building_id: string
          created_at?: string
          deleted_at?: string | null
          email: string
          full_name: string
          id?: string
          is_renter?: boolean
          member_id?: string | null
          phone?: string | null
          unit_id: string
        }
        Update: {
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_renter?: boolean
          member_id?: string | null
          phone?: string | null
          unit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owners_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "building_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owners_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_records: {
        Row: {
          amount: number
          building_id: string
          charge_id: string
          created_at: string
          id: string
          method: string
          owner_id: string
          paid_at: string
          reference: string | null
        }
        Insert: {
          amount: number
          building_id: string
          charge_id: string
          created_at?: string
          id?: string
          method: string
          owner_id: string
          paid_at: string
          reference?: string | null
        }
        Update: {
          amount?: number
          building_id?: string
          charge_id?: string
          created_at?: string
          id?: string
          method?: string
          owner_id?: string
          paid_at?: string
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_charge_id_fkey"
            columns: ["charge_id"]
            isOneToOne: false
            referencedRelation: "charges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          organization_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          organization_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      roadmap_items: {
        Row: {
          building_id: string
          created_at: string
          deleted_at: string | null
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string
          status: string
          target_date: string | null
          title: string
        }
        Insert: {
          building_id: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title: string
        }
        Update: {
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string
          status?: string
          target_date?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "roadmap_items_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          building_id: string
          created_at: string
          deleted_at: string | null
          floor: number | null
          id: string
          ownership_share: number
          unit_number: string
          unit_type: string
        }
        Insert: {
          building_id: string
          created_at?: string
          deleted_at?: string | null
          floor?: number | null
          id?: string
          ownership_share: number
          unit_number: string
          unit_type?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          deleted_at?: string | null
          floor?: number | null
          id?: string
          ownership_share?: number
          unit_number?: string
          unit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "units_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_casts: {
        Row: {
          choice: string
          created_at: string
          id: string
          unit_id: string
          user_id: string
          vote_id: string
          vote_weight: number
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          unit_id: string
          user_id: string
          vote_id: string
          vote_weight: number
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          unit_id?: string
          user_id?: string
          vote_id?: string
          vote_weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "vote_casts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_casts_vote_id_fkey"
            columns: ["vote_id"]
            isOneToOne: false
            referencedRelation: "votes"
            referencedColumns: ["id"]
          },
        ]
      }
      votes: {
        Row: {
          building_id: string
          created_at: string
          id: string
          meeting_id: string
          question: string
          status: string
        }
        Insert: {
          building_id: string
          created_at?: string
          id?: string
          meeting_id: string
          question: string
          status?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          id?: string
          meeting_id?: string
          question?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "votes_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_member: { Args: { bid: string; roles: string[] }; Returns: boolean }
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
