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
      bairros: {
        Row: {
          cidade: string
          created_at: string
          descricao: string | null
          destaque: boolean
          estado: string
          id: string
          imagem_url: string | null
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          cidade?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          estado?: string
          id?: string
          imagem_url?: string | null
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          cidade?: string
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          estado?: string
          id?: string
          imagem_url?: string | null
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      corretores: {
        Row: {
          ativo: boolean
          bio: string | null
          created_at: string
          creci: string | null
          email: string | null
          foto_url: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          telefone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bio?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bio?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      imoveis: {
        Row: {
          area_total: number | null
          area_util: number | null
          badge: string | null
          bairro_id: string | null
          banheiros: number | null
          caracteristicas: string[] | null
          codigo: string | null
          condominio: number | null
          corretor_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          endereco: string | null
          exclusivo: boolean
          finalidade: Database["public"]["Enums"]["imovel_finalidade"]
          id: string
          imagem_capa: string | null
          iptu: number | null
          latitude: number | null
          longitude: number | null
          preco: number | null
          preco_sob_consulta: boolean
          publicado_em: string | null
          quartos: number | null
          slug: string
          status: Database["public"]["Enums"]["imovel_status"]
          suites: number | null
          tipo: Database["public"]["Enums"]["imovel_tipo"]
          titulo: string
          updated_at: string
          vagas: number | null
          views: number
        }
        Insert: {
          area_total?: number | null
          area_util?: number | null
          badge?: string | null
          bairro_id?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          codigo?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          endereco?: string | null
          exclusivo?: boolean
          finalidade?: Database["public"]["Enums"]["imovel_finalidade"]
          id?: string
          imagem_capa?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          preco?: number | null
          preco_sob_consulta?: boolean
          publicado_em?: string | null
          quartos?: number | null
          slug: string
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo?: Database["public"]["Enums"]["imovel_tipo"]
          titulo: string
          updated_at?: string
          vagas?: number | null
          views?: number
        }
        Update: {
          area_total?: number | null
          area_util?: number | null
          badge?: string | null
          bairro_id?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          codigo?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          endereco?: string | null
          exclusivo?: boolean
          finalidade?: Database["public"]["Enums"]["imovel_finalidade"]
          id?: string
          imagem_capa?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          preco?: number | null
          preco_sob_consulta?: boolean
          publicado_em?: string | null
          quartos?: number | null
          slug?: string
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo?: Database["public"]["Enums"]["imovel_tipo"]
          titulo?: string
          updated_at?: string
          vagas?: number | null
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imoveis_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_imagens: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          imovel_id: string
          ordem: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          imovel_id: string
          ordem?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          imovel_id?: string
          ordem?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_imagens_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          corretor_id: string | null
          created_at: string
          email: string | null
          id: string
          imovel_id: string | null
          mensagem: string | null
          nome: string
          origem: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          corretor_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          nome: string
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          corretor_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          imovel_id?: string | null
          mensagem?: string | null
          nome?: string
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
        ]
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "corretor"
      imovel_finalidade: "venda" | "aluguel" | "lancamento"
      imovel_status: "rascunho" | "ativo" | "vendido" | "reservado" | "inativo"
      imovel_tipo:
        | "apartamento"
        | "cobertura"
        | "casa"
        | "casa_condominio"
        | "terreno"
        | "comercial"
        | "garden"
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
    Enums: {
      app_role: ["admin", "corretor"],
      imovel_finalidade: ["venda", "aluguel", "lancamento"],
      imovel_status: ["rascunho", "ativo", "vendido", "reservado", "inativo"],
      imovel_tipo: [
        "apartamento",
        "cobertura",
        "casa",
        "casa_condominio",
        "terreno",
        "comercial",
        "garden",
      ],
    },
  },
} as const
