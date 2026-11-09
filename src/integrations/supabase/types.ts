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
      kiosk_banner: {
        Row: {
          company_description: string
          company_logo_path: string
          company_style: Json
          divider: Json | null
          id: number
          kitchen: Json
          languages: Json
          loyalty: Json
          news: Json
          offers_title: string
          offers_title_tr: Json
          settings: Json
          updated_at: string
          venue_id: string
        }
        Insert: {
          company_description?: string
          company_logo_path?: string
          company_style?: Json
          divider?: Json | null
          id?: number
          kitchen?: Json
          languages?: Json
          loyalty?: Json
          news?: Json
          offers_title?: string
          offers_title_tr?: Json
          settings?: Json
          updated_at?: string
          venue_id?: string
        }
        Update: {
          company_description?: string
          company_logo_path?: string
          company_style?: Json
          divider?: Json | null
          id?: number
          kitchen?: Json
          languages?: Json
          loyalty?: Json
          news?: Json
          offers_title?: string
          offers_title_tr?: Json
          settings?: Json
          updated_at?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_banner_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
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
          venue_id: string
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
          venue_id?: string
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
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kiosk_themes_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      license: {
        Row: {
          address: string
          business_name: string
          city: string
          company_name: string
          demo: Json
          expires_at: string | null
          id: number
          master_hash: string | null
          notes: string
          owner_email: string
          pec: string
          phone: string
          plan: string
          sdi: string
          status: string
          updated_at: string
          vat: string
          venue_id: string
        }
        Insert: {
          address?: string
          business_name?: string
          city?: string
          company_name?: string
          demo?: Json
          expires_at?: string | null
          id?: number
          master_hash?: string | null
          notes?: string
          owner_email?: string
          pec?: string
          phone?: string
          plan?: string
          sdi?: string
          status?: string
          updated_at?: string
          vat?: string
          venue_id?: string
        }
        Update: {
          address?: string
          business_name?: string
          city?: string
          company_name?: string
          demo?: Json
          expires_at?: string | null
          id?: number
          master_hash?: string | null
          notes?: string
          owner_email?: string
          pec?: string
          phone?: string
          plan?: string
          sdi?: string
          status?: string
          updated_at?: string
          vat?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_categories: {
        Row: {
          active: boolean
          custom_kind: string
          custom_price: number
          custom_title: string
          custom_title_ar: string
          custom_title_de: string
          custom_title_en: string
          custom_title_es: string
          custom_title_fr: string
          id: string
          image_path: string
          name: string
          name_tr: Json
          position: number
          slug: string
          strip: number
          venue_id: string
        }
        Insert: {
          active?: boolean
          custom_kind?: string
          custom_price?: number
          custom_title?: string
          custom_title_ar?: string
          custom_title_de?: string
          custom_title_en?: string
          custom_title_es?: string
          custom_title_fr?: string
          id?: string
          image_path?: string
          name: string
          name_tr?: Json
          position?: number
          slug: string
          strip?: number
          venue_id?: string
        }
        Update: {
          active?: boolean
          custom_kind?: string
          custom_price?: number
          custom_title?: string
          custom_title_ar?: string
          custom_title_de?: string
          custom_title_en?: string
          custom_title_es?: string
          custom_title_fr?: string
          id?: string
          image_path?: string
          name?: string
          name_tr?: Json
          position?: number
          slug?: string
          strip?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_categories_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_ingredients: {
        Row: {
          available: boolean
          created_at: string
          grp: string
          id: string
          kind: string
          name: string
          name_ar: string
          name_de: string
          name_en: string
          name_es: string
          name_fr: string
          position: number
          price: number
          venue_id: string
        }
        Insert: {
          available?: boolean
          created_at?: string
          grp?: string
          id?: string
          kind?: string
          name: string
          name_ar?: string
          name_de?: string
          name_en?: string
          name_es?: string
          name_fr?: string
          position?: number
          price?: number
          venue_id?: string
        }
        Update: {
          available?: boolean
          created_at?: string
          grp?: string
          id?: string
          kind?: string
          name?: string
          name_ar?: string
          name_de?: string
          name_en?: string
          name_es?: string
          name_fr?: string
          position?: number
          price?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_ingredients_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_products: {
        Row: {
          active: boolean
          badge_blink: boolean
          badge_on: boolean
          badge_text: string
          category_id: string
          choice_groups: Json
          combo_alts: Json
          combo_extras: Json
          combo_groups: Json
          combo_items: Json
          combo_name: string
          combo_offer: boolean
          combo_price: number | null
          description: string
          description_ar: string
          description_de: string
          description_en: string
          description_es: string
          description_fr: string
          extras: Json
          featured_at: string | null
          id: string
          image_path: string
          ingredients: Json
          is_featured: boolean
          max_extras: number
          name: string
          position: number
          price: number
          recipe: string
          recipe_on: boolean
          sold_out: boolean
          suggest: Json
          venue_id: string
        }
        Insert: {
          active?: boolean
          badge_blink?: boolean
          badge_on?: boolean
          badge_text?: string
          category_id: string
          choice_groups?: Json
          combo_alts?: Json
          combo_extras?: Json
          combo_groups?: Json
          combo_items?: Json
          combo_name?: string
          combo_offer?: boolean
          combo_price?: number | null
          description?: string
          description_ar?: string
          description_de?: string
          description_en?: string
          description_es?: string
          description_fr?: string
          extras?: Json
          featured_at?: string | null
          id?: string
          image_path?: string
          ingredients?: Json
          is_featured?: boolean
          max_extras?: number
          name: string
          position?: number
          price?: number
          recipe?: string
          recipe_on?: boolean
          sold_out?: boolean
          suggest?: Json
          venue_id?: string
        }
        Update: {
          active?: boolean
          badge_blink?: boolean
          badge_on?: boolean
          badge_text?: string
          category_id?: string
          choice_groups?: Json
          combo_alts?: Json
          combo_extras?: Json
          combo_groups?: Json
          combo_items?: Json
          combo_name?: string
          combo_offer?: boolean
          combo_price?: number | null
          description?: string
          description_ar?: string
          description_de?: string
          description_en?: string
          description_es?: string
          description_fr?: string
          extras?: Json
          featured_at?: string | null
          id?: string
          image_path?: string
          ingredients?: Json
          is_featured?: boolean
          max_extras?: number
          name?: string
          position?: number
          price?: number
          recipe?: string
          recipe_on?: boolean
          sold_out?: boolean
          suggest?: Json
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "menu_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_products_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          checked_items: Json
          created_at: string
          customer_id: string | null
          delivered_items: Json
          dine_option: string
          discount: number
          id: string
          items: Json
          order_number: number
          paid_at: string | null
          partial_notes: Json
          payment_method: string | null
          status: string
          total: number
          venue_id: string
        }
        Insert: {
          checked_items?: Json
          created_at?: string
          customer_id?: string | null
          delivered_items?: Json
          dine_option: string
          discount?: number
          id?: string
          items?: Json
          order_number?: number
          paid_at?: string | null
          partial_notes?: Json
          payment_method?: string | null
          status?: string
          total?: number
          venue_id?: string
        }
        Update: {
          checked_items?: Json
          created_at?: string
          customer_id?: string | null
          delivered_items?: Json
          dine_option?: string
          discount?: number
          id?: string
          items?: Json
          order_number?: number
          paid_at?: string | null
          partial_notes?: Json
          payment_method?: string | null
          status?: string
          total?: number
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "venue_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_credentials: {
        Row: {
          id: number
          pin_hash: string
          updated_at: string
          venue_id: string
          version: string
        }
        Insert: {
          id?: number
          pin_hash: string
          updated_at?: string
          venue_id?: string
          version?: string
        }
        Update: {
          id?: number
          pin_hash?: string
          updated_at?: string
          venue_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_credentials_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: true
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_customers: {
        Row: {
          birth_day: number | null
          birth_month: number | null
          consent_at: string
          created_at: string
          id: string
          name: string
          phone: string
          venue_id: string
        }
        Insert: {
          birth_day?: number | null
          birth_month?: number | null
          consent_at?: string
          created_at?: string
          id?: string
          name: string
          phone: string
          venue_id: string
        }
        Update: {
          birth_day?: number | null
          birth_month?: number | null
          consent_at?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_customers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string
          id: string
          name: string
          next_order: number
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          next_order?: number
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          next_order?: number
          slug?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      license_allows_orders: { Args: never; Returns: boolean }
      license_allows_orders_v: { Args: { v: string }; Returns: boolean }
      license_state: { Args: never; Returns: Json }
      license_state_v: { Args: { v: string }; Returns: Json }
      staff_next_order_number: { Args: never; Returns: number }
      staff_next_order_number_v: { Args: { v: string }; Returns: number }
      staff_set_order_number: { Args: { next_number: number }; Returns: number }
      staff_set_order_number_v: {
        Args: { next_number: number; v: string }
        Returns: number
      }
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
