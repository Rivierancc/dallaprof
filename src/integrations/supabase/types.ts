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
      kiosk_themes: {
        Row: {
          accent: string
          anim: string
          bg: string
          created_at: string
          decor: string
          end_md: string
          greeting: string
          greeting_en: string
          greeting_es: string
          greeting_fr: string
          id: string
          mode: string
          name: string
          position: number
          primary_color: string
          start_md: string
        }
        Insert: {
          accent?: string
          anim?: string
          bg?: string
          created_at?: string
          decor?: string
          end_md?: string
          greeting?: string
          greeting_en?: string
          greeting_es?: string
          greeting_fr?: string
          id?: string
          mode?: string
          name: string
          position?: number
          primary_color?: string
          start_md?: string
        }
        Update: {
          accent?: string
          anim?: string
          bg?: string
          created_at?: string
          decor?: string
          end_md?: string
          greeting?: string
          greeting_en?: string
          greeting_es?: string
          greeting_fr?: string
          id?: string
          mode?: string
          name?: string
          position?: number
          primary_color?: string
          start_md?: string
        }
        Relationships: []
      }
      menu_categories: {
        Row: {
          active: boolean
          custom_kind: string
          custom_price: number
          custom_title: string
          custom_title_en: string
          custom_title_es: string
          custom_title_fr: string
          id: string
          image_path: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          active?: boolean
          custom_kind?: string
          custom_price?: number
          custom_title?: string
          custom_title_en?: string
          custom_title_es?: string
          custom_title_fr?: string
          id?: string
          image_path?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          active?: boolean
          custom_kind?: string
          custom_price?: number
          custom_title?: string
          custom_title_en?: string
          custom_title_es?: string
          custom_title_fr?: string
          id?: string
          image_path?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      menu_ingredients: {
        Row: {
          available: boolean
          created_at: string
          grp: string
          id: string
          kind: string
          name: string
          name_en: string
          name_es: string
          name_fr: string
          position: number
          price: number
        }
        Insert: {
          available?: boolean
          created_at?: string
          grp?: string
          id?: string
          kind?: string
          name: string
          name_en?: string
          name_es?: string
          name_fr?: string
          position?: number
          price?: number
        }
        Update: {
          available?: boolean
          created_at?: string
          grp?: string
          id?: string
          kind?: string
          name?: string
          name_en?: string
          name_es?: string
          name_fr?: string
          position?: number
          price?: number
        }
        Relationships: []
      }
      menu_products: {
        Row: {
          active: boolean
          badge_blink: boolean
          badge_on: boolean
          badge_text: string
          category_id: string
          description: string
          description_en: string
          description_es: string
          description_fr: string
          extras: Json
          featured_at: string | null
          id: string
          image_path: string
          ingredients: Json
          is_featured: boolean
          name: string
          position: number
          price: number
          sold_out: boolean
        }
        Insert: {
          active?: boolean
          badge_blink?: boolean
          badge_on?: boolean
          badge_text?: string
          category_id: string
          description?: string
          description_en?: string
          description_es?: string
          description_fr?: string
          extras?: Json
          featured_at?: string | null
          id?: string
          image_path?: string
          ingredients?: Json
          is_featured?: boolean
          name: string
          position?: number
          price?: number
          sold_out?: boolean
        }
        Update: {
          active?: boolean
          badge_blink?: boolean
          badge_on?: boolean
          badge_text?: string
          category_id?: string
          description?: string
          description_en?: string
          description_es?: string
          description_fr?: string
          extras?: Json
          featured_at?: string | null
          id?: string
          image_path?: string
          ingredients?: Json
          is_featured?: boolean
          name?: string
          position?: number
          price?: number
          sold_out?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "menu_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          dine_option: string
          id: string
          items: Json
          order_number: number
          paid_at: string | null
          payment_method: string | null
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          dine_option: string
          id?: string
          items?: Json
          order_number?: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          dine_option?: string
          id?: string
          items?: Json
          order_number?: number
          paid_at?: string | null
          payment_method?: string | null
          status?: string
          total?: number
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
