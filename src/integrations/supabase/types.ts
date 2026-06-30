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
      audit_log: {
        Row: {
          action: string
          after: Json | null
          before: Json | null
          created_at: string
          entity: string | null
          entity_id: string | null
          id: string
          ip: string | null
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity?: string | null
          entity_id?: string | null
          id?: string
          ip?: string | null
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bairros: {
        Row: {
          cidade_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          id: string
          imagem_url: string | null
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          cidade_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_url?: string | null
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          cidade_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          id?: string
          imagem_url?: string | null
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bairros_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          autor_id: string | null
          categoria_id: string | null
          conteudo: string
          created_at: string
          id: string
          imagem_capa: string | null
          meta_description: string | null
          meta_title: string | null
          publicado_em: string | null
          resumo: string | null
          slug: string
          status: Database["public"]["Enums"]["blog_post_status"]
          titulo: string
          updated_at: string
          views: number
        }
        Insert: {
          autor_id?: string | null
          categoria_id?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          imagem_capa?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publicado_em?: string | null
          resumo?: string | null
          slug: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          titulo: string
          updated_at?: string
          views?: number
        }
        Update: {
          autor_id?: string | null
          categoria_id?: string | null
          conteudo?: string
          created_at?: string
          id?: string
          imagem_capa?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publicado_em?: string | null
          resumo?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["blog_post_status"]
          titulo?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "blog_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      cidades: {
        Row: {
          created_at: string
          estado: string
          id: string
          nome: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          nome: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      corretores: {
        Row: {
          ativo: boolean
          bio: string | null
          cargo: string | null
          cpf: string | null
          created_at: string
          creci: string | null
          email: string | null
          foto_url: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          sobrenome: string | null
          status: Database["public"]["Enums"]["user_status"]
          team_id: string | null
          telefone: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          ativo?: boolean
          bio?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          team_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          ativo?: boolean
          bio?: string | null
          cargo?: string | null
          cpf?: string | null
          created_at?: string
          creci?: string | null
          email?: string | null
          foto_url?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          sobrenome?: string | null
          status?: Database["public"]["Enums"]["user_status"]
          team_id?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "corretores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
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
          cep: string | null
          cidade: string | null
          codigo: string | null
          complemento: string | null
          condominio: number | null
          corretor_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          destaque: boolean
          endereco: string | null
          estado: string | null
          exclusivo: boolean
          finalidade: Database["public"]["Enums"]["imovel_finalidade"]
          id: string
          imagem_capa: string | null
          iptu: number | null
          latitude: number | null
          longitude: number | null
          mostrar_endereco_completo: boolean
          mostrar_rua: boolean
          numero: string | null
          preco: number | null
          preco_sob_consulta: boolean
          publicado_em: string | null
          quartos: number | null
          rua: string | null
          slug: string
          status: Database["public"]["Enums"]["imovel_status"]
          suites: number | null
          tipo: Database["public"]["Enums"]["imovel_tipo"]
          titulo: string
          tour_url: string | null
          updated_at: string
          vagas: number | null
          video_url: string | null
          views: number
        }
        Insert: {
          area_total?: number | null
          area_util?: number | null
          badge?: string | null
          bairro_id?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          destaque?: boolean
          endereco?: string | null
          estado?: string | null
          exclusivo?: boolean
          finalidade?: Database["public"]["Enums"]["imovel_finalidade"]
          id?: string
          imagem_capa?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          mostrar_endereco_completo?: boolean
          mostrar_rua?: boolean
          numero?: string | null
          preco?: number | null
          preco_sob_consulta?: boolean
          publicado_em?: string | null
          quartos?: number | null
          rua?: string | null
          slug: string
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo?: Database["public"]["Enums"]["imovel_tipo"]
          titulo: string
          tour_url?: string | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
          views?: number
        }
        Update: {
          area_total?: number | null
          area_util?: number | null
          badge?: string | null
          bairro_id?: string | null
          banheiros?: number | null
          caracteristicas?: string[] | null
          cep?: string | null
          cidade?: string | null
          codigo?: string | null
          complemento?: string | null
          condominio?: number | null
          corretor_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          destaque?: boolean
          endereco?: string | null
          estado?: string | null
          exclusivo?: boolean
          finalidade?: Database["public"]["Enums"]["imovel_finalidade"]
          id?: string
          imagem_capa?: string | null
          iptu?: number | null
          latitude?: number | null
          longitude?: number | null
          mostrar_endereco_completo?: boolean
          mostrar_rua?: boolean
          numero?: string | null
          preco?: number | null
          preco_sob_consulta?: boolean
          publicado_em?: string | null
          quartos?: number | null
          rua?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["imovel_status"]
          suites?: number | null
          tipo?: Database["public"]["Enums"]["imovel_tipo"]
          titulo?: string
          tour_url?: string | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
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
      instagram_posts: {
        Row: {
          created_at: string
          created_by: string | null
          hashtags: string
          id: string
          imagem_ids: string[]
          imovel_id: string | null
          launch_project_id: string | null
          legenda: string
          modelo_ia: string | null
          publicado_em: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          hashtags?: string
          id?: string
          imagem_ids?: string[]
          imovel_id?: string | null
          launch_project_id?: string | null
          legenda?: string
          modelo_ia?: string | null
          publicado_em?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          hashtags?: string
          id?: string
          imagem_ids?: string[]
          imovel_id?: string | null
          launch_project_id?: string | null
          legenda?: string
          modelo_ia?: string | null
          publicado_em?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_posts_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "instagram_posts_launch_project_id_fkey"
            columns: ["launch_project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_amenities: {
        Row: {
          ativo: boolean
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_payment_conditions: {
        Row: {
          created_at: string
          entrada: number | null
          id: string
          num_parcelas: number
          observacoes: string | null
          parcela_30: number | null
          parcela_60: number | null
          parcela_90: number | null
          project_id: string
          qtd_anuais: number | null
          qtd_semestrais: number | null
          sinal: number
          updated_at: string
          valor_anual: number | null
          valor_parcela: number
          valor_semestral: number | null
        }
        Insert: {
          created_at?: string
          entrada?: number | null
          id?: string
          num_parcelas: number
          observacoes?: string | null
          parcela_30?: number | null
          parcela_60?: number | null
          parcela_90?: number | null
          project_id: string
          qtd_anuais?: number | null
          qtd_semestrais?: number | null
          sinal: number
          updated_at?: string
          valor_anual?: number | null
          valor_parcela: number
          valor_semestral?: number | null
        }
        Update: {
          created_at?: string
          entrada?: number | null
          id?: string
          num_parcelas?: number
          observacoes?: string | null
          parcela_30?: number | null
          parcela_60?: number | null
          parcela_90?: number | null
          project_id?: string
          qtd_anuais?: number | null
          qtd_semestrais?: number | null
          sinal?: number
          updated_at?: string
          valor_anual?: number | null
          valor_parcela?: number
          valor_semestral?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_payment_conditions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_pdfs: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["launch_pdf_kind"]
          project_id: string
          storage_path: string
          tamanho_bytes: number | null
          titulo: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["launch_pdf_kind"]
          project_id: string
          storage_path: string
          tamanho_bytes?: number | null
          titulo?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["launch_pdf_kind"]
          project_id?: string
          storage_path?: string
          tamanho_bytes?: number | null
          titulo?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_pdfs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_project_amenities: {
        Row: {
          amenity_id: string
          created_at: string
          project_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          project_id: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_project_amenities_amenity_id_fkey"
            columns: ["amenity_id"]
            isOneToOne: false
            referencedRelation: "launch_amenities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_project_amenities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_project_imagens: {
        Row: {
          created_at: string
          id: string
          legenda: string | null
          ordem: number
          project_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          project_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          project_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_project_imagens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_projects: {
        Row: {
          area_apartamentos: number | null
          arquitetura: string | null
          bairro_id: string | null
          cidade_id: string | null
          construtora: string | null
          corretor_id: string | null
          created_at: string
          descricao: string | null
          destaque: boolean
          elevadores: number | null
          endereco: string | null
          entrega: string | null
          id: string
          imagem_capa: string | null
          meta_description: string | null
          meta_title: string | null
          nome: string
          numero_andares: number | null
          numero_torres: number | null
          numero_unidades: number | null
          og_image: string | null
          publicado: boolean
          quartos: number | null
          slug: string
          status_id: string | null
          suites: number | null
          unidades_por_andar: number | null
          updated_at: string
          vagas: number | null
          video_url: string | null
        }
        Insert: {
          area_apartamentos?: number | null
          arquitetura?: string | null
          bairro_id?: string | null
          cidade_id?: string | null
          construtora?: string | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          elevadores?: number | null
          endereco?: string | null
          entrega?: string | null
          id?: string
          imagem_capa?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nome: string
          numero_andares?: number | null
          numero_torres?: number | null
          numero_unidades?: number | null
          og_image?: string | null
          publicado?: boolean
          quartos?: number | null
          slug: string
          status_id?: string | null
          suites?: number | null
          unidades_por_andar?: number | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
        }
        Update: {
          area_apartamentos?: number | null
          arquitetura?: string | null
          bairro_id?: string | null
          cidade_id?: string | null
          construtora?: string | null
          corretor_id?: string | null
          created_at?: string
          descricao?: string | null
          destaque?: boolean
          elevadores?: number | null
          endereco?: string | null
          entrega?: string | null
          id?: string
          imagem_capa?: string | null
          meta_description?: string | null
          meta_title?: string | null
          nome?: string
          numero_andares?: number | null
          numero_torres?: number | null
          numero_unidades?: number | null
          og_image?: string | null
          publicado?: boolean
          quartos?: number | null
          slug?: string
          status_id?: string | null
          suites?: number | null
          unidades_por_andar?: number | null
          updated_at?: string
          vagas?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_projects_bairro_id_fkey"
            columns: ["bairro_id"]
            isOneToOne: false
            referencedRelation: "bairros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_projects_cidade_id_fkey"
            columns: ["cidade_id"]
            isOneToOne: false
            referencedRelation: "cidades"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_projects_corretor_id_fkey"
            columns: ["corretor_id"]
            isOneToOne: false
            referencedRelation: "corretores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_projects_status_id_fkey"
            columns: ["status_id"]
            isOneToOne: false
            referencedRelation: "launch_statuses"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_statuses: {
        Row: {
          ativo: boolean
          created_at: string
          id: string
          nome: string
          ordem: number
          slug: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      launch_units: {
        Row: {
          area: number | null
          ativa: boolean
          bloco: string | null
          created_at: string
          id: string
          project_id: string
          status: Database["public"]["Enums"]["launch_unit_status"]
          tipo: Database["public"]["Enums"]["launch_unit_tipo"] | null
          unidade: number
          updated_at: string
          vagas: number | null
          valor: number | null
        }
        Insert: {
          area?: number | null
          ativa?: boolean
          bloco?: string | null
          created_at?: string
          id?: string
          project_id: string
          status?: Database["public"]["Enums"]["launch_unit_status"]
          tipo?: Database["public"]["Enums"]["launch_unit_tipo"] | null
          unidade: number
          updated_at?: string
          vagas?: number | null
          valor?: number | null
        }
        Update: {
          area?: number | null
          ativa?: boolean
          bloco?: string | null
          created_at?: string
          id?: string
          project_id?: string
          status?: Database["public"]["Enums"]["launch_unit_status"]
          tipo?: Database["public"]["Enums"]["launch_unit_tipo"] | null
          unidade?: number
          updated_at?: string
          vagas?: number | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "launch_units_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_atividades: {
        Row: {
          created_at: string
          descricao: string
          id: string
          lead_id: string
          metadata: Json
          tipo: Database["public"]["Enums"]["lead_atividade_tipo"]
          updated_at: string
          user_id: string | null
          user_nome: string
          user_perfil: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          lead_id: string
          metadata?: Json
          tipo: Database["public"]["Enums"]["lead_atividade_tipo"]
          updated_at?: string
          user_id?: string | null
          user_nome: string
          user_perfil: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          lead_id?: string
          metadata?: Json
          tipo?: Database["public"]["Enums"]["lead_atividade_tipo"]
          updated_at?: string
          user_id?: string | null
          user_nome?: string
          user_perfil?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_atividades_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_descartes: {
        Row: {
          created_at: string
          detalhes: string
          id: string
          lead_id: string
          motivo: Database["public"]["Enums"]["lead_descarte_motivo"]
          user_id: string | null
          user_nome: string
          user_perfil: string
        }
        Insert: {
          created_at?: string
          detalhes: string
          id?: string
          lead_id: string
          motivo: Database["public"]["Enums"]["lead_descarte_motivo"]
          user_id?: string | null
          user_nome: string
          user_perfil: string
        }
        Update: {
          created_at?: string
          detalhes?: string
          id?: string
          lead_id?: string
          motivo?: Database["public"]["Enums"]["lead_descarte_motivo"]
          user_id?: string | null
          user_nome?: string
          user_perfil?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_descartes_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_to: string | null
          consent_at: string | null
          consent_lgpd: boolean
          corretor_id: string | null
          created_at: string
          email: string | null
          id: string
          imovel_id: string | null
          launch_project_id: string | null
          mensagem: string | null
          nome: string
          origem: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          consent_at?: string | null
          consent_lgpd?: boolean
          corretor_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          imovel_id?: string | null
          launch_project_id?: string | null
          mensagem?: string | null
          nome: string
          origem?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          consent_at?: string | null
          consent_lgpd?: boolean
          corretor_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          imovel_id?: string | null
          launch_project_id?: string | null
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
          {
            foreignKeyName: "leads_launch_project_id_fkey"
            columns: ["launch_project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_modules: {
        Row: {
          codigo: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
        }
        Insert: {
          codigo: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
        }
        Update: {
          codigo?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
        }
        Relationships: []
      }
      rbac_permissions: {
        Row: {
          action: Database["public"]["Enums"]["rbac_action"]
          created_at: string
          id: string
          module_id: string
          profile_id: string
          scope: Database["public"]["Enums"]["rbac_scope"]
        }
        Insert: {
          action: Database["public"]["Enums"]["rbac_action"]
          created_at?: string
          id?: string
          module_id: string
          profile_id: string
          scope?: Database["public"]["Enums"]["rbac_scope"]
        }
        Update: {
          action?: Database["public"]["Enums"]["rbac_action"]
          created_at?: string
          id?: string
          module_id?: string
          profile_id?: string
          scope?: Database["public"]["Enums"]["rbac_scope"]
        }
        Relationships: [
          {
            foreignKeyName: "rbac_permissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "rbac_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rbac_permissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "rbac_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rbac_profiles: {
        Row: {
          codigo: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          sistema: boolean
          updated_at: string
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          sistema?: boolean
          updated_at?: string
        }
        Update: {
          codigo?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          sistema?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          lider_user_id: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_user_id?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_user_id?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "rbac_profiles"
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      has_any_permission: {
        Args: { _module_codigo: string; _user_id: string }
        Returns: boolean
      }
      has_permission: {
        Args: {
          _action: Database["public"]["Enums"]["rbac_action"]
          _module_codigo: string
          _user_id: string
        }
        Returns: Database["public"]["Enums"]["rbac_scope"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      user_team_ids: { Args: { _user_id: string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "corretor" | "secretaria" | "gerente" | "captador"
      blog_post_status: "rascunho" | "publicado"
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
      launch_pdf_kind: "tabela_precos" | "manual"
      launch_unit_status:
        | "disponivel"
        | "reservada"
        | "vendida"
        | "indisponivel"
      launch_unit_tipo:
        | "1_quarto"
        | "2_quartos"
        | "3_quartos"
        | "4_quartos_mais"
        | "cobertura"
        | "garden"
      lead_atividade_tipo:
        | "ligacao"
        | "whatsapp"
        | "email"
        | "visita"
        | "video_chamada"
        | "reuniao_presencial"
        | "outros"
        | "descarte"
        | "ia_analise"
      lead_descarte_motivo:
        | "sem_contato"
        | "nao_e_lead"
        | "financeiro"
        | "desistiu"
        | "aluguel"
        | "outros"
      rbac_action:
        | "visualizar"
        | "criar"
        | "editar"
        | "excluir"
        | "exportar"
        | "importar"
        | "aprovar"
        | "gerenciar"
      rbac_scope: "proprio" | "equipe" | "global"
      user_status: "ativo" | "inativo" | "bloqueado" | "pendente"
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
      app_role: ["admin", "corretor", "secretaria", "gerente", "captador"],
      blog_post_status: ["rascunho", "publicado"],
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
      launch_pdf_kind: ["tabela_precos", "manual"],
      launch_unit_status: [
        "disponivel",
        "reservada",
        "vendida",
        "indisponivel",
      ],
      launch_unit_tipo: [
        "1_quarto",
        "2_quartos",
        "3_quartos",
        "4_quartos_mais",
        "cobertura",
        "garden",
      ],
      lead_atividade_tipo: [
        "ligacao",
        "whatsapp",
        "email",
        "visita",
        "video_chamada",
        "reuniao_presencial",
        "outros",
        "descarte",
        "ia_analise",
      ],
      lead_descarte_motivo: [
        "sem_contato",
        "nao_e_lead",
        "financeiro",
        "desistiu",
        "aluguel",
        "outros",
      ],
      rbac_action: [
        "visualizar",
        "criar",
        "editar",
        "excluir",
        "exportar",
        "importar",
        "aprovar",
        "gerenciar",
      ],
      rbac_scope: ["proprio", "equipe", "global"],
      user_status: ["ativo", "inativo", "bloqueado", "pendente"],
    },
  },
} as const
