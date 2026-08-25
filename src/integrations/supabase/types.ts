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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "bairros_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_charge_provider_mappings: {
        Row: {
          charge_intent_id: string
          created_at: string
          id: string
          provider_code: string
          provider_customer_ref: string
          provider_invoice_ref: string
          provider_observed_at: string | null
          provider_payment_ref: string | null
          status: string
          updated_at: string
        }
        Insert: {
          charge_intent_id: string
          created_at?: string
          id?: string
          provider_code: string
          provider_customer_ref: string
          provider_invoice_ref: string
          provider_observed_at?: string | null
          provider_payment_ref?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          charge_intent_id?: string
          created_at?: string
          id?: string
          provider_code?: string
          provider_customer_ref?: string
          provider_invoice_ref?: string
          provider_observed_at?: string | null
          provider_payment_ref?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_charge_provider_mappings_charge_intent_id_fkey"
            columns: ["charge_intent_id"]
            isOneToOne: false
            referencedRelation: "commercial_charge_intents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_charge_provider_mappings_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "billing_provider_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      billing_event_transitions: {
        Row: {
          billing_event_id: string
          created_at: string
          from_status: string | null
          id: string
          metadata: Json
          reason: string | null
          to_status: string
        }
        Insert: {
          billing_event_id: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status: string
        }
        Update: {
          billing_event_id?: string
          created_at?: string
          from_status?: string | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_event_transitions_billing_event_id_fkey"
            columns: ["billing_event_id"]
            isOneToOne: false
            referencedRelation: "billing_events"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          created_at: string
          error_code: string | null
          error_message: string | null
          event_type: string
          id: string
          idempotency_key: string
          metadata: Json
          occurred_at: string | null
          payload_hash: string | null
          payload_sanitized: Json
          processed_at: string | null
          processing_status: string
          provider_code: string
          provider_event_id: string
          provider_mapping_id: string | null
          received_at: string
          subscription_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type: string
          id?: string
          idempotency_key: string
          metadata?: Json
          occurred_at?: string | null
          payload_hash?: string | null
          payload_sanitized?: Json
          processed_at?: string | null
          processing_status?: string
          provider_code: string
          provider_event_id: string
          provider_mapping_id?: string | null
          received_at?: string
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string
          metadata?: Json
          occurred_at?: string | null
          payload_hash?: string | null
          payload_sanitized?: Json
          processed_at?: string | null
          processing_status?: string
          provider_code?: string
          provider_event_id?: string
          provider_mapping_id?: string | null
          received_at?: string
          subscription_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "billing_provider_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "billing_events_provider_mapping_id_fkey"
            columns: ["provider_mapping_id"]
            isOneToOne: false
            referencedRelation: "tenant_billing_provider_mappings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_plan_provider_prices: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          plan_price_id: string
          provider_code: string
          provider_price_ref: string
          retired_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          plan_price_id: string
          provider_code: string
          provider_price_ref: string
          retired_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          plan_price_id?: string
          provider_code?: string
          provider_price_ref?: string
          retired_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plan_provider_prices_plan_price_id_fkey"
            columns: ["plan_price_id"]
            isOneToOne: false
            referencedRelation: "commercial_plan_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_plan_provider_prices_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "billing_provider_definitions"
            referencedColumns: ["code"]
          },
        ]
      }
      billing_provider_definitions: {
        Row: {
          capabilities: Json
          code: string
          created_at: string
          metadata: Json
          name: string
          provider_type: string
          status: string
          updated_at: string
        }
        Insert: {
          capabilities?: Json
          code: string
          created_at?: string
          metadata?: Json
          name: string
          provider_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          capabilities?: Json
          code?: string
          created_at?: string
          metadata?: Json
          name?: string
          provider_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      blog_categorias: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          slug: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          slug: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_categorias_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "blog_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          estado?: string
          id?: string
          nome: string
          slug: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          estado?: string
          id?: string
          nome?: string
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cidades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_campaign_events: {
        Row: {
          campaign_id: string
          created_at: string
          id: number
          rota: string | null
          session_id: string | null
          tenant_id: string
          tipo: string
          user_agent: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: number
          rota?: string | null
          session_id?: string | null
          tenant_id?: string
          tipo: string
          user_agent?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: number
          rota?: string | null
          session_id?: string | null
          tenant_id?: string
          tipo?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "cms_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_campaigns: {
        Row: {
          agendamento: Json
          conteudo: Json
          created_at: string
          created_by: string | null
          end_at: string | null
          frequencia: Json
          id: string
          nome: string
          prioridade: number
          segmentacao: Json
          start_at: string | null
          status: string
          tenant_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          agendamento?: Json
          conteudo?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          frequencia?: Json
          id?: string
          nome: string
          prioridade?: number
          segmentacao?: Json
          start_at?: string | null
          status?: string
          tenant_id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          agendamento?: Json
          conteudo?: Json
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          frequencia?: Json
          id?: string
          nome?: string
          prioridade?: number
          segmentacao?: Json
          start_at?: string | null
          status?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_form_fields: {
        Row: {
          ajuda: string | null
          created_at: string
          form_id: string
          id: string
          label: string
          largura: string
          nome: string
          obrigatorio: boolean
          opcoes: Json
          ordem: number
          placeholder: string | null
          tenant_id: string
          tipo: string
          validacao: Json
          valor_padrao: string | null
        }
        Insert: {
          ajuda?: string | null
          created_at?: string
          form_id: string
          id?: string
          label: string
          largura?: string
          nome: string
          obrigatorio?: boolean
          opcoes?: Json
          ordem?: number
          placeholder?: string | null
          tenant_id?: string
          tipo: string
          validacao?: Json
          valor_padrao?: string | null
        }
        Update: {
          ajuda?: string | null
          created_at?: string
          form_id?: string
          id?: string
          label?: string
          largura?: string
          nome?: string
          obrigatorio?: boolean
          opcoes?: Json
          ordem?: number
          placeholder?: string | null
          tenant_id?: string
          tipo?: string
          validacao?: Json
          valor_padrao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cms_form_fields_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "cms_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_forms: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          slug: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          slug: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          slug?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_import_snapshots: {
        Row: {
          contagem: Json
          created_at: string
          created_by: string | null
          escopo: Json
          id: string
          modo: string
          motivo: string
          payload: Json
          restored_at: string | null
          restored_by: string | null
          tenant_id: string
        }
        Insert: {
          contagem?: Json
          created_at?: string
          created_by?: string | null
          escopo?: Json
          id?: string
          modo: string
          motivo: string
          payload: Json
          restored_at?: string | null
          restored_by?: string | null
          tenant_id?: string
        }
        Update: {
          contagem?: Json
          created_at?: string
          created_by?: string | null
          escopo?: Json
          id?: string
          modo?: string
          motivo?: string
          payload?: Json
          restored_at?: string | null
          restored_by?: string | null
          tenant_id?: string
        }
        Relationships: []
      }
      cms_pages: {
        Row: {
          blocks: Json
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          published_at: string | null
          seo: Json
          slug: string
          status: string
          tenant_id: string
          titulo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          published_at?: string | null
          seo?: Json
          slug: string
          status?: string
          tenant_id?: string
          titulo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blocks?: Json
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          published_at?: string | null
          seo?: Json
          slug?: string
          status?: string
          tenant_id?: string
          titulo?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      commercial_charge_intents: {
        Row: {
          amount_total_minor: number
          charge_type: string
          correlation_ref: string | null
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          idempotency_key: string
          metadata_sanitized: Json
          paid_at: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          amount_total_minor: number
          charge_type: string
          correlation_ref?: string | null
          created_at?: string
          currency: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          metadata_sanitized?: Json
          paid_at?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          amount_total_minor?: number
          charge_type?: string
          correlation_ref?: string | null
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          metadata_sanitized?: Json
          paid_at?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_charge_intents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_charge_items: {
        Row: {
          amount_total_minor: number
          charge_intent_id: string
          created_at: string
          description: string
          id: string
          line_position: number
          metadata_sanitized: Json
          quantity: number
          unit_amount_minor: number
        }
        Insert: {
          amount_total_minor: number
          charge_intent_id: string
          created_at?: string
          description: string
          id?: string
          line_position: number
          metadata_sanitized?: Json
          quantity?: number
          unit_amount_minor: number
        }
        Update: {
          amount_total_minor?: number
          charge_intent_id?: string
          created_at?: string
          description?: string
          id?: string
          line_position?: number
          metadata_sanitized?: Json
          quantity?: number
          unit_amount_minor?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_charge_items_charge_intent_id_fkey"
            columns: ["charge_intent_id"]
            isOneToOne: false
            referencedRelation: "commercial_charge_intents"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_entitlement_definitions: {
        Row: {
          created_at: string
          description: string | null
          is_active: boolean
          key: string
          metadata: Json
          name: string
          unit: string | null
          updated_at: string
          value_type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key: string
          metadata?: Json
          name: string
          unit?: string | null
          updated_at?: string
          value_type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          is_active?: boolean
          key?: string
          metadata?: Json
          name?: string
          unit?: string | null
          updated_at?: string
          value_type?: string
        }
        Relationships: []
      }
      commercial_plan_entitlements: {
        Row: {
          created_at: string
          entitlement_key: string
          id: string
          metadata: Json
          plan_id: string
          updated_at: string
          value_bool: boolean | null
          value_decimal: number | null
          value_int: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          entitlement_key: string
          id?: string
          metadata?: Json
          plan_id: string
          updated_at?: string
          value_bool?: boolean | null
          value_decimal?: number | null
          value_int?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          entitlement_key?: string
          id?: string
          metadata?: Json
          plan_id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_decimal?: number | null
          value_int?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commercial_plan_entitlements_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "commercial_entitlement_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "commercial_plan_entitlements_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_plan_prices: {
        Row: {
          billing_interval: string
          code: string
          created_at: string
          currency: string
          id: string
          interval_count: number
          metadata: Json
          plan_id: string
          retired_at: string | null
          status: string
          unit_amount_minor: number
          updated_at: string
        }
        Insert: {
          billing_interval: string
          code: string
          created_at?: string
          currency: string
          id?: string
          interval_count?: number
          metadata?: Json
          plan_id: string
          retired_at?: string | null
          status?: string
          unit_amount_minor: number
          updated_at?: string
        }
        Update: {
          billing_interval?: string
          code?: string
          created_at?: string
          currency?: string
          id?: string
          interval_count?: number
          metadata?: Json
          plan_id?: string
          retired_at?: string | null
          status?: string
          unit_amount_minor?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "commercial_plan_prices_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_plans: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          sort_order?: number
          status?: string
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "corretores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_lost_reasons: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          padrao: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          padrao?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          padrao?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      domain_audit_events: {
        Row: {
          actor_user_id: string | null
          after_status:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          authority_origin: string
          before_status:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          command_id: string | null
          correlation_id: string
          created_at: string
          detail_sanitized: Json
          domain_id: string | null
          event_type: string
          generation: number | null
          id: string
          tenant_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          after_status?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          authority_origin: string
          before_status?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          command_id?: string | null
          correlation_id?: string
          created_at?: string
          detail_sanitized?: Json
          domain_id?: string | null
          event_type: string
          generation?: number | null
          id?: string
          tenant_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          after_status?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          authority_origin?: string
          before_status?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          command_id?: string | null
          correlation_id?: string
          created_at?: string
          detail_sanitized?: Json
          domain_id?: string | null
          event_type?: string
          generation?: number | null
          id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_audit_events_domain_id_fkey"
            columns: ["domain_id"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_audit_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_authority_control: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          authority_mode: string
          created_at: string
          expected_legacy_domain_count: number
          lock_version: number
          singleton: boolean
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          authority_mode?: string
          created_at?: string
          expected_legacy_domain_count?: number
          lock_version?: number
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          authority_mode?: string
          created_at?: string
          expected_legacy_domain_count?: number
          lock_version?: number
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      domain_operation_attempts: {
        Row: {
          attempt_number: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          id: string
          job_id: string
          lease_owner: string
          outcome: string | null
          result_sanitized: Json
          started_at: string
        }
        Insert: {
          attempt_number: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          job_id: string
          lease_owner: string
          outcome?: string | null
          result_sanitized?: Json
          started_at?: string
        }
        Update: {
          attempt_number?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          id?: string
          job_id?: string
          lease_owner?: string
          outcome?: string | null
          result_sanitized?: Json
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_operation_attempts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "domain_operation_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_operation_jobs: {
        Row: {
          attempt_count: number
          authority_origin: string
          created_at: string
          domain_id: string
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          generation: number
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          operation_type: Database["public"]["Enums"]["domain_operation_type"]
          payload: Json
          requested_by: string
          result_sanitized: Json
          status: Database["public"]["Enums"]["domain_job_status"]
          tenant_id: string
          terminal_error_code: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          authority_origin: string
          created_at?: string
          domain_id: string
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          generation: number
          id?: string
          idempotency_key: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          operation_type: Database["public"]["Enums"]["domain_operation_type"]
          payload?: Json
          requested_by: string
          result_sanitized?: Json
          status?: Database["public"]["Enums"]["domain_job_status"]
          tenant_id: string
          terminal_error_code?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          authority_origin?: string
          created_at?: string
          domain_id?: string
          execution_mode?: Database["public"]["Enums"]["domain_execution_mode"]
          generation?: number
          id?: string
          idempotency_key?: string
          lease_expires_at?: string | null
          lease_owner?: string | null
          max_attempts?: number
          next_attempt_at?: string
          operation_type?: Database["public"]["Enums"]["domain_operation_type"]
          payload?: Json
          requested_by?: string
          result_sanitized?: Json
          status?: Database["public"]["Enums"]["domain_job_status"]
          tenant_id?: string
          terminal_error_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "domain_operation_jobs_domain_tenant_fk"
            columns: ["domain_id", "tenant_id", "generation"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id", "tenant_id", "generation"]
          },
          {
            foreignKeyName: "domain_operation_jobs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_provider_accounts: {
        Row: {
          account_identifier: string
          capabilities: Json
          created_at: string
          credential_reference: string
          enabled: boolean
          health_detail_sanitized: Json
          health_status: string
          id: string
          last_health_check_at: string | null
          provider_code: string
          updated_at: string
        }
        Insert: {
          account_identifier: string
          capabilities?: Json
          created_at?: string
          credential_reference: string
          enabled?: boolean
          health_detail_sanitized?: Json
          health_status?: string
          id?: string
          last_health_check_at?: string | null
          provider_code: string
          updated_at?: string
        }
        Update: {
          account_identifier?: string
          capabilities?: Json
          created_at?: string
          credential_reference?: string
          enabled?: boolean
          health_detail_sanitized?: Json
          health_status?: string
          id?: string
          last_health_check_at?: string | null
          provider_code?: string
          updated_at?: string
        }
        Relationships: []
      }
      domain_provider_bindings: {
        Row: {
          binding_state: string
          created_at: string
          custom_hostname_id: string | null
          domain_id: string
          generation: number
          id: string
          identity_bound_at: string | null
          observed_at: string | null
          provider_account_id: string
          provider_detail_sanitized: Json
          provider_status: string | null
          provider_version: string | null
          provisioning_key: string
          ssl_status: string | null
          tenant_id: string
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          binding_state: string
          created_at?: string
          custom_hostname_id?: string | null
          domain_id: string
          generation: number
          id?: string
          identity_bound_at?: string | null
          observed_at?: string | null
          provider_account_id: string
          provider_detail_sanitized?: Json
          provider_status?: string | null
          provider_version?: string | null
          provisioning_key: string
          ssl_status?: string | null
          tenant_id: string
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          binding_state?: string
          created_at?: string
          custom_hostname_id?: string | null
          domain_id?: string
          generation?: number
          id?: string
          identity_bound_at?: string | null
          observed_at?: string | null
          provider_account_id?: string
          provider_detail_sanitized?: Json
          provider_status?: string | null
          provider_version?: string | null
          provisioning_key?: string
          ssl_status?: string | null
          tenant_id?: string
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_provider_bindings_domain_tenant_fk"
            columns: ["domain_id", "tenant_id", "generation"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id", "tenant_id", "generation"]
          },
          {
            foreignKeyName: "domain_provider_bindings_provider_account_id_fkey"
            columns: ["provider_account_id"]
            isOneToOne: false
            referencedRelation: "domain_provider_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domain_provider_bindings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      domain_verification_challenges: {
        Row: {
          attempt_count: number
          challenge_kind: string
          challenge_version: number
          created_at: string
          domain_id: string
          expires_at: string
          generation: number
          id: string
          observed_value_hash: string | null
          opaque_nonce_reference: string
          record_name: string
          status: Database["public"]["Enums"]["domain_challenge_status"]
          tenant_id: string
          updated_at: string
          value_digest: string
          verified_at: string | null
        }
        Insert: {
          attempt_count?: number
          challenge_kind?: string
          challenge_version: number
          created_at?: string
          domain_id: string
          expires_at: string
          generation: number
          id?: string
          observed_value_hash?: string | null
          opaque_nonce_reference: string
          record_name: string
          status?: Database["public"]["Enums"]["domain_challenge_status"]
          tenant_id: string
          updated_at?: string
          value_digest: string
          verified_at?: string | null
        }
        Update: {
          attempt_count?: number
          challenge_kind?: string
          challenge_version?: number
          created_at?: string
          domain_id?: string
          expires_at?: string
          generation?: number
          id?: string
          observed_value_hash?: string | null
          opaque_nonce_reference?: string
          record_name?: string
          status?: Database["public"]["Enums"]["domain_challenge_status"]
          tenant_id?: string
          updated_at?: string
          value_digest?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domain_challenges_domain_tenant_fk"
            columns: ["domain_id", "tenant_id", "generation"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id", "tenant_id", "generation"]
          },
          {
            foreignKeyName: "domain_verification_challenges_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      form_submissions: {
        Row: {
          created_at: string
          dados: Json
          fbclid: string | null
          form_id: string
          form_slug: string
          gclid: string | null
          id: string
          ip_address: string | null
          lead_id: string | null
          page_url: string | null
          referrer: string | null
          tenant_id: string
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          created_at?: string
          dados?: Json
          fbclid?: string | null
          form_id: string
          form_slug: string
          gclid?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          page_url?: string | null
          referrer?: string | null
          tenant_id: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          created_at?: string
          dados?: Json
          fbclid?: string | null
          form_id?: string
          form_slug?: string
          gclid?: string | null
          id?: string
          ip_address?: string | null
          lead_id?: string | null
          page_url?: string | null
          referrer?: string | null
          tenant_id?: string
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "cms_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submissions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "imoveis_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          imovel_id: string
          ordem?: number
          tenant_id?: string
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          imovel_id?: string
          ordem?: number
          tenant_id?: string
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
          {
            foreignKeyName: "imovel_imagens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      imovel_portais: {
        Row: {
          created_at: string
          id: string
          imovel_id: string
          portal_reference: string | null
          portal_slug: string
          publicado: boolean
          status: string
          tenant_id: string
          ultima_leitura: string | null
          ultimo_envio: string | null
          ultimo_erro: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          imovel_id: string
          portal_reference?: string | null
          portal_slug: string
          publicado?: boolean
          status?: string
          tenant_id: string
          ultima_leitura?: string | null
          ultimo_envio?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          imovel_id?: string
          portal_reference?: string | null
          portal_slug?: string
          publicado?: boolean
          status?: string
          tenant_id?: string
          ultima_leitura?: string | null
          ultimo_envio?: string | null
          ultimo_erro?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "imovel_portais_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "imovel_portais_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "instagram_posts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_amenities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "launch_payment_conditions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "launch_pdfs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      launch_project_amenities: {
        Row: {
          amenity_id: string
          created_at: string
          project_id: string
          tenant_id: string
        }
        Insert: {
          amenity_id: string
          created_at?: string
          project_id: string
          tenant_id?: string
        }
        Update: {
          amenity_id?: string
          created_at?: string
          project_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "launch_project_amenities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          project_id: string
          storage_path: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          legenda?: string | null
          ordem?: number
          project_id?: string
          storage_path?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_project_imagens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "launch_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "launch_project_imagens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "launch_projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome: string
          ordem?: number
          slug: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          id?: string
          nome?: string
          ordem?: number
          slug?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "launch_statuses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "launch_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id?: string
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
          tenant_id?: string
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
          {
            foreignKeyName: "lead_atividades_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_audit_events: {
        Row: {
          actor_user_id: string
          created_at: string
          event_type: string
          id: string
          lead_id: string
          metadata: Json
          tenant_id: string
        }
        Insert: {
          actor_user_id: string
          created_at?: string
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json
          tenant_id: string
        }
        Update: {
          actor_user_id?: string
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_audit_events_lead_id_fkey"
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
          motivo_nome: string | null
          reason_id: string | null
          tenant_id: string
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
          motivo_nome?: string | null
          reason_id?: string | null
          tenant_id?: string
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
          motivo_nome?: string | null
          reason_id?: string | null
          tenant_id?: string
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
          {
            foreignKeyName: "lead_descartes_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "lead_discard_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_descartes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_discard_reasons: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          padrao: boolean
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          padrao?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          padrao?: boolean
          tenant_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      lead_origens: {
        Row: {
          ativo: boolean
          cor: string | null
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cor?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_origens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_perdas: {
        Row: {
          created_at: string
          detalhes: string
          id: string
          imovel_id: string | null
          launch_project_id: string | null
          lead_id: string
          motivo_nome: string
          reason_id: string | null
          tenant_id: string
          user_id: string | null
          user_nome: string
          user_perfil: string
          valor_estimado: number | null
        }
        Insert: {
          created_at?: string
          detalhes?: string
          id?: string
          imovel_id?: string | null
          launch_project_id?: string | null
          lead_id: string
          motivo_nome: string
          reason_id?: string | null
          tenant_id?: string
          user_id?: string | null
          user_nome: string
          user_perfil: string
          valor_estimado?: number | null
        }
        Update: {
          created_at?: string
          detalhes?: string
          id?: string
          imovel_id?: string | null
          launch_project_id?: string | null
          lead_id?: string
          motivo_nome?: string
          reason_id?: string | null
          tenant_id?: string
          user_id?: string | null
          user_nome?: string
          user_perfil?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_perdas_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_perdas_reason_id_fkey"
            columns: ["reason_id"]
            isOneToOne: false
            referencedRelation: "deal_lost_reasons"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_stage_history: {
        Row: {
          actor_user_id: string | null
          created_at: string
          from_status: string | null
          id: string
          lead_id: string
          metadata: Json
          reason_id: string | null
          reason_type: string | null
          tenant_id: string
          to_status: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id: string
          metadata?: Json
          reason_id?: string | null
          reason_type?: string | null
          tenant_id: string
          to_status: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          lead_id?: string
          metadata?: Json
          reason_id?: string | null
          reason_type?: string | null
          tenant_id?: string
          to_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_stage_history_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_stage_history_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          descartado_at: string | null
          discard_reason_id: string | null
          email: string | null
          fbclid: string | null
          ganho_at: string | null
          gclid: string | null
          id: string
          imovel_id: string | null
          landing_url: string | null
          launch_project_id: string | null
          lost_reason_id: string | null
          mensagem: string | null
          nome: string
          origem: string | null
          perdido_at: string | null
          proposta_at: string | null
          referrer: string | null
          status: string
          telefone: string | null
          tenant_id: string
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          valor_estimado: number | null
          version: number
        }
        Insert: {
          assigned_to?: string | null
          consent_at?: string | null
          consent_lgpd?: boolean
          corretor_id?: string | null
          created_at?: string
          descartado_at?: string | null
          discard_reason_id?: string | null
          email?: string | null
          fbclid?: string | null
          ganho_at?: string | null
          gclid?: string | null
          id?: string
          imovel_id?: string | null
          landing_url?: string | null
          launch_project_id?: string | null
          lost_reason_id?: string | null
          mensagem?: string | null
          nome: string
          origem?: string | null
          perdido_at?: string | null
          proposta_at?: string | null
          referrer?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor_estimado?: number | null
          version?: number
        }
        Update: {
          assigned_to?: string | null
          consent_at?: string | null
          consent_lgpd?: boolean
          corretor_id?: string | null
          created_at?: string
          descartado_at?: string | null
          discard_reason_id?: string | null
          email?: string | null
          fbclid?: string | null
          ganho_at?: string | null
          gclid?: string | null
          id?: string
          imovel_id?: string | null
          landing_url?: string | null
          launch_project_id?: string | null
          lost_reason_id?: string | null
          mensagem?: string | null
          nome?: string
          origem?: string | null
          perdido_at?: string | null
          proposta_at?: string | null
          referrer?: string | null
          status?: string
          telefone?: string | null
          tenant_id?: string
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          valor_estimado?: number | null
          version?: number
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
          {
            foreignKeyName: "leads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          arquivo: string
          arquivo_medium: string | null
          arquivo_thumbnail: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          height: number | null
          id: string
          mime_type: string
          nome: string
          tags: string[]
          tamanho: number
          tenant_id: string
          tipo: string
          updated_at: string
          width: number | null
        }
        Insert: {
          arquivo: string
          arquivo_medium?: string | null
          arquivo_thumbnail?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          height?: number | null
          id?: string
          mime_type: string
          nome: string
          tags?: string[]
          tamanho?: number
          tenant_id?: string
          tipo: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          arquivo?: string
          arquivo_medium?: string | null
          arquivo_thumbnail?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          height?: number | null
          id?: string
          mime_type?: string
          nome?: string
          tags?: string[]
          tamanho?: number
          tenant_id?: string
          tipo?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      media_usage: {
        Row: {
          campo: string | null
          created_at: string
          entidade: string
          entidade_id: string | null
          id: string
          media_id: string
          tenant_id: string
        }
        Insert: {
          campo?: string | null
          created_at?: string
          entidade: string
          entidade_id?: string | null
          id?: string
          media_id: string
          tenant_id?: string
        }
        Update: {
          campo?: string | null
          created_at?: string
          entidade?: string
          entidade_id?: string | null
          id?: string
          media_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_usage_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_library"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_connectors: {
        Row: {
          ativo: boolean
          config: Json
          created_at: string
          feed_token: string
          feed_url: string | null
          id: string
          portal_nome: string
          portal_slug: string
          status: string
          tenant_id: string
          ultimo_erro: string | null
          ultimo_sync_at: string | null
          updated_at: string
          webhook_secret: string
          webhook_url: string | null
        }
        Insert: {
          ativo?: boolean
          config?: Json
          created_at?: string
          feed_token?: string
          feed_url?: string | null
          id?: string
          portal_nome: string
          portal_slug: string
          status?: string
          tenant_id: string
          ultimo_erro?: string | null
          ultimo_sync_at?: string | null
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
        }
        Update: {
          ativo?: boolean
          config?: Json
          created_at?: string
          feed_token?: string
          feed_url?: string | null
          id?: string
          portal_nome?: string
          portal_slug?: string
          status?: string
          tenant_id?: string
          ultimo_erro?: string | null
          ultimo_sync_at?: string | null
          updated_at?: string
          webhook_secret?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_connectors_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_sync_dlq: {
        Row: {
          acao: string
          created_at: string
          erro: string | null
          id: string
          payload: Json
          portal_slug: string
          proxima_tentativa_at: string
          resolvido_at: string | null
          status: string
          tenant_id: string | null
          tentativas: number
          ultimo_erro_at: string | null
          updated_at: string
        }
        Insert: {
          acao: string
          created_at?: string
          erro?: string | null
          id?: string
          payload?: Json
          portal_slug: string
          proxima_tentativa_at?: string
          resolvido_at?: string | null
          status?: string
          tenant_id?: string | null
          tentativas?: number
          ultimo_erro_at?: string | null
          updated_at?: string
        }
        Update: {
          acao?: string
          created_at?: string
          erro?: string | null
          id?: string
          payload?: Json
          portal_slug?: string
          proxima_tentativa_at?: string
          resolvido_at?: string | null
          status?: string
          tenant_id?: string | null
          tentativas?: number
          ultimo_erro_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      portal_sync_logs: {
        Row: {
          acao: string
          created_at: string
          duration_ms: number | null
          erro: string | null
          id: string
          imovel_id: string | null
          lead_id: string | null
          payload: Json | null
          portal_slug: string
          status: string
          tenant_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          duration_ms?: number | null
          erro?: string | null
          id?: string
          imovel_id?: string | null
          lead_id?: string | null
          payload?: Json | null
          portal_slug: string
          status: string
          tenant_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          duration_ms?: number | null
          erro?: string | null
          id?: string
          imovel_id?: string | null
          lead_id?: string | null
          payload?: Json | null
          portal_slug?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "portal_sync_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_buckets: {
        Row: {
          count: number
          id: string
          key: string
          scope: string
          updated_at: string
          window_start: string
        }
        Insert: {
          count?: number
          id?: string
          key: string
          scope: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          count?: number
          id?: string
          key?: string
          scope?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
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
          tenant_id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings_versions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          key: string
          notes: string | null
          published_at: string | null
          status: string
          tenant_id: string
          value: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          key: string
          notes?: string | null
          published_at?: string | null
          status: string
          tenant_id?: string
          value: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          key?: string
          notes?: string | null
          published_at?: string | null
          status?: string
          tenant_id?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      spr02_managed_secret_ceremonies: {
        Row: {
          annotation: string | null
          canary_version_id: string | null
          ceremony_id: string
          classification: string | null
          created_at: string
          expected_git_head: string
          expected_source_digest: string | null
          expected_source_version_id: string | null
          expected_worker_id: string
          final_version_id: string | null
          id: string
          lease_expires_at: string
          lease_started_at: string
          state: string
          updated_at: string
        }
        Insert: {
          annotation?: string | null
          canary_version_id?: string | null
          ceremony_id: string
          classification?: string | null
          created_at?: string
          expected_git_head: string
          expected_source_digest?: string | null
          expected_source_version_id?: string | null
          expected_worker_id: string
          final_version_id?: string | null
          id?: string
          lease_expires_at?: string
          lease_started_at?: string
          state?: string
          updated_at?: string
        }
        Update: {
          annotation?: string | null
          canary_version_id?: string | null
          ceremony_id?: string
          classification?: string | null
          created_at?: string
          expected_git_head?: string
          expected_source_digest?: string | null
          expected_source_version_id?: string | null
          expected_worker_id?: string
          final_version_id?: string | null
          id?: string
          lease_expires_at?: string
          lease_started_at?: string
          state?: string
          updated_at?: string
        }
        Relationships: []
      }
      storage_migration_log: {
        Row: {
          action: string
          batch_id: string
          bucket: string
          created_at: string
          dry_run: boolean
          entity: string
          entity_id: string
          error_message: string | null
          file_size: number | null
          id: string
          metadata: Json
          new_path: string
          old_path: string | null
          operator_id: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          action: string
          batch_id: string
          bucket: string
          created_at?: string
          dry_run?: boolean
          entity: string
          entity_id: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json
          new_path: string
          old_path?: string | null
          operator_id?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          action?: string
          batch_id?: string
          bucket?: string
          created_at?: string
          dry_run?: boolean
          entity?: string
          entity_id?: string
          error_message?: string | null
          file_size?: number | null
          id?: string
          metadata?: Json
          new_path?: string
          old_path?: string | null
          operator_id?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
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
      system_events: {
        Row: {
          category: string
          created_at: string
          error_message: string | null
          event: string
          id: string
          ip: string | null
          latency_ms: number | null
          meta: Json
          severity: string
          source: string
          status_code: number | null
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          error_message?: string | null
          event: string
          id?: string
          ip?: string | null
          latency_ms?: number | null
          meta?: Json
          severity?: string
          source: string
          status_code?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          error_message?: string | null
          event?: string
          id?: string
          ip?: string | null
          latency_ms?: number | null
          meta?: Json
          severity?: string
          source?: string
          status_code?: number | null
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          team_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          team_id: string
          tenant_id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          team_id?: string
          tenant_id?: string
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
          {
            foreignKeyName: "team_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_user_id?: string | null
          nome: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          lider_user_id?: string | null
          nome?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_billing_provider_mappings: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          provider_code: string
          provider_customer_ref: string | null
          provider_subscription_ref: string | null
          status: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json
          provider_code: string
          provider_customer_ref?: string | null
          provider_subscription_ref?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          provider_code?: string
          provider_customer_ref?: string | null
          provider_subscription_ref?: string | null
          status?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_billing_provider_mappings_provider_code_fkey"
            columns: ["provider_code"]
            isOneToOne: false
            referencedRelation: "billing_provider_definitions"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "tenant_billing_provider_mappings_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_billing_provider_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          activated_at: string | null
          created_at: string
          enabled: boolean
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code: string | null
          failure_detail_sanitized: Json
          generation: number
          hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after: string | null
          id: string
          incumbent_domain_id: string | null
          lock_version: number
          metadata: Json
          normalized_hostname: string
          registrable_domain: string
          replacement_of: string | null
          requested_by: string
          resume_state:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          created_at?: string
          enabled?: boolean
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code?: string | null
          failure_detail_sanitized?: Json
          generation: number
          hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after?: string | null
          id?: string
          incumbent_domain_id?: string | null
          lock_version?: number
          metadata?: Json
          normalized_hostname: string
          registrable_domain: string
          replacement_of?: string | null
          requested_by: string
          resume_state?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          created_at?: string
          enabled?: boolean
          execution_mode?: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code?: string | null
          failure_detail_sanitized?: Json
          generation?: number
          hostname_kind?: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after?: string | null
          id?: string
          incumbent_domain_id?: string | null
          lock_version?: number
          metadata?: Json
          normalized_hostname?: string
          registrable_domain?: string
          replacement_of?: string | null
          requested_by?: string
          resume_state?:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_incumbent_same_tenant_fk"
            columns: ["incumbent_domain_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tenant_domains_replacement_same_tenant_fk"
            columns: ["replacement_of", "tenant_id"]
            isOneToOne: false
            referencedRelation: "tenant_domains"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_entitlements: {
        Row: {
          created_at: string
          effective_from: string
          effective_until: string | null
          entitlement_key: string
          id: string
          metadata: Json
          source: string
          subscription_id: string | null
          tenant_id: string
          updated_at: string
          value_bool: boolean | null
          value_decimal: number | null
          value_int: number | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          entitlement_key: string
          id?: string
          metadata?: Json
          source?: string
          subscription_id?: string | null
          tenant_id: string
          updated_at?: string
          value_bool?: boolean | null
          value_decimal?: number | null
          value_int?: number | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          effective_from?: string
          effective_until?: string | null
          entitlement_key?: string
          id?: string
          metadata?: Json
          source?: string
          subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
          value_bool?: boolean | null
          value_decimal?: number | null
          value_int?: number | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_entitlements_entitlement_key_fkey"
            columns: ["entitlement_key"]
            isOneToOne: false
            referencedRelation: "commercial_entitlement_definitions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "tenant_entitlements_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "tenant_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_entitlements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          accepted_at: string | null
          invited_at: string | null
          is_default: boolean
          is_owner: boolean
          joined_at: string
          membership_status: Database["public"]["Enums"]["membership_status"]
          revoked_at: string | null
          suspended_at: string | null
          tenant_id: string
          tenant_role: Database["public"]["Enums"]["tenant_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          invited_at?: string | null
          is_default?: boolean
          is_owner?: boolean
          joined_at?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          revoked_at?: string | null
          suspended_at?: string | null
          tenant_id: string
          tenant_role?: Database["public"]["Enums"]["tenant_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          invited_at?: string | null
          is_default?: boolean
          is_owner?: boolean
          joined_at?: string
          membership_status?: Database["public"]["Enums"]["membership_status"]
          revoked_at?: string | null
          suspended_at?: string | null
          tenant_id?: string
          tenant_role?: Database["public"]["Enums"]["tenant_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          canceled_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          metadata: Json
          plan_id: string | null
          started_at: string | null
          status: string
          status_reason: string | null
          suspended_at: string | null
          tenant_id: string
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string | null
          started_at?: string | null
          status: string
          status_reason?: string | null
          suspended_at?: string | null
          tenant_id: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          canceled_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          metadata?: Json
          plan_id?: string | null
          started_at?: string | null
          status?: string
          status_reason?: string | null
          suspended_at?: string | null
          tenant_id?: string
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          dominio_principal: string | null
          id: string
          metadata: Json
          nome: string
          owner_user_id: string | null
          plano_codigo: string | null
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dominio_principal?: string | null
          id?: string
          metadata?: Json
          nome: string
          owner_user_id?: string | null
          plano_codigo?: string | null
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dominio_principal?: string | null
          id?: string
          metadata?: Json
          nome?: string
          owner_user_id?: string | null
          plano_codigo?: string | null
          slug?: string
          status?: string
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
      website_menu_items: {
        Row: {
          created_at: string
          id: string
          label: string
          location: string
          ordem: number
          parent_id: string | null
          target: string
          tenant_id: string
          tipo: string
          updated_at: string
          url: string
          visivel: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          location?: string
          ordem?: number
          parent_id?: string | null
          target?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          url: string
          visivel?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          location?: string
          ordem?: number
          parent_id?: string | null
          target?: string
          tenant_id?: string
          tipo?: string
          updated_at?: string
          url?: string
          visivel?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "website_menu_items_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "website_menu_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_menu_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      activate_authoritative_domain_resolution: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _expected_lock_version: number
        }
        Returns: {
          activated_at: string | null
          activated_by: string | null
          authority_mode: string
          created_at: string
          expected_legacy_domain_count: number
          lock_version: number
          singleton: boolean
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_authority_control"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      activate_domain_replacement: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _candidate_domain_id: string
          _candidate_evidence: Json
          _candidate_expected_lock_version: number
          _incumbent_domain_id: string
          _incumbent_expected_lock_version: number
          _tenant_id: string
        }
        Returns: Json
      }
      bcr01_apply_provider_invoice_observation: {
        Args: {
          _event_id: string
          _provider_code: string
          _provider_invoice_ref: string
          _provider_observed_at: string
          _provider_payment_ref: string
          _target_status: string
        }
        Returns: Json
      }
      bcr01_apply_provider_subscription_observation: {
        Args: {
          _canceled_at?: string
          _current_period_end?: string
          _current_period_start?: string
          _event_id: string
          _internal_status: string
          _provider_code: string
          _provider_customer_ref: string
          _provider_observed_at: string
          _provider_price_ref: string
          _provider_subscription_ref: string
          _requires_reconciliation: boolean
        }
        Returns: Json
      }
      bcr01_bind_charge_provider_invoice: {
        Args: {
          _charge_intent_id: string
          _provider_code: string
          _provider_customer_ref: string
          _provider_invoice_ref: string
        }
        Returns: Json
      }
      bcr01_bind_provider_customer: {
        Args: {
          _provider_code: string
          _provider_customer_ref: string
          _tenant_id: string
        }
        Returns: Json
      }
      bcr01_create_commercial_charge: {
        Args: {
          _charge_type: string
          _correlation_ref: string
          _currency: string
          _idempotency_key: string
          _items: Json
          _metadata_sanitized: Json
          _tenant_id: string
        }
        Returns: Json
      }
      bcr01_mark_billing_event_terminal: {
        Args: { _event_id: string; _reason: string; _to_status: string }
        Returns: Json
      }
      bcr01_reserve_reconciliation_event: {
        Args: {
          _event_type: string
          _occurred_at?: string
          _payload_hash: string
          _payload_sanitized: Json
          _provider_code: string
          _provider_event_id: string
        }
        Returns: Json
      }
      bcr01_reserve_verified_billing_event: {
        Args: {
          _event_type: string
          _occurred_at?: string
          _payload_hash: string
          _payload_sanitized: Json
          _provider_code: string
          _provider_event_id: string
        }
        Returns: Json
      }
      change_tenant_domain_execution_mode: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _domain_id: string
          _execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          _expected_lock_version: number
          _tenant_id: string
        }
        Returns: {
          activated_at: string | null
          created_at: string
          enabled: boolean
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code: string | null
          failure_detail_sanitized: Json
          generation: number
          hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after: string | null
          id: string
          incumbent_domain_id: string | null
          lock_version: number
          metadata: Json
          normalized_hostname: string
          registrable_domain: string
          replacement_of: string | null
          requested_by: string
          resume_state:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tenant_domains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      complete_domain_operation_job: {
        Args: {
          _job_id: string
          _lease_owner: string
          _outcome: Database["public"]["Enums"]["domain_job_status"]
          _result_sanitized: Json
          _retry_after_seconds: number
          _terminal_error_code: string
        }
        Returns: {
          attempt_count: number
          authority_origin: string
          created_at: string
          domain_id: string
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          generation: number
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          operation_type: Database["public"]["Enums"]["domain_operation_type"]
          payload: Json
          requested_by: string
          result_sanitized: Json
          status: Database["public"]["Enums"]["domain_job_status"]
          tenant_id: string
          terminal_error_code: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_operation_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_manual_lead: {
        Args: {
          p_assigned_to?: string
          p_email?: string
          p_imovel_id?: string
          p_nome: string
          p_observacoes?: string
          p_telefone?: string
        }
        Returns: Json
      }
      create_tenant_domain_request: {
        Args: {
          _authority_origin: string
          _correlation_id: string
          _execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          _hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          _incumbent_domain_id: string
          _metadata: Json
          _normalized_hostname: string
          _registrable_domain: string
          _requested_by: string
          _tenant_id: string
        }
        Returns: {
          activated_at: string | null
          created_at: string
          enabled: boolean
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code: string | null
          failure_detail_sanitized: Json
          generation: number
          hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after: string | null
          id: string
          incumbent_domain_id: string | null
          lock_version: number
          metadata: Json
          normalized_hostname: string
          registrable_domain: string
          replacement_of: string | null
          requested_by: string
          resume_state:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tenant_domains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dca01_active_evidence_complete: {
        Args: { _evidence: Json }
        Returns: boolean
      }
      dca01_hostname_request_available: {
        Args: {
          _normalized_hostname: string
          _replacement_of: string
          _tenant_id: string
        }
        Returns: boolean
      }
      dca01_hostname_reservation_valid: {
        Args: { _domain_id: string }
        Returns: boolean
      }
      dca01_transition_allowed: {
        Args: {
          _from: Database["public"]["Enums"]["domain_activation_status"]
          _to: Database["public"]["Enums"]["domain_activation_status"]
        }
        Returns: boolean
      }
      dca02_bind_domain_provider_object_identity: {
        Args: {
          _custom_hostname_id: string
          _domain_id: string
          _expected_generation: number
          _expected_lock_version: number
          _provider_account_id: string
          _provider_detail_sanitized: Json
          _provider_status: string
          _provider_version: string
          _provisioning_key: string
          _ssl_status: string
          _tenant_id: string
          _zone_id: string
        }
        Returns: {
          binding_state: string
          created_at: string
          custom_hostname_id: string | null
          domain_id: string
          generation: number
          id: string
          identity_bound_at: string | null
          observed_at: string | null
          provider_account_id: string
          provider_detail_sanitized: Json
          provider_status: string | null
          provider_version: string | null
          provisioning_key: string
          ssl_status: string | null
          tenant_id: string
          updated_at: string
          zone_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_provider_bindings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dca02_claim_domain_provider_binding: {
        Args: {
          _domain_id: string
          _expected_generation: number
          _expected_lock_version: number
          _provider_account_id: string
          _provisioning_key: string
          _tenant_id: string
          _zone_id: string
        }
        Returns: {
          binding_state: string
          created_at: string
          custom_hostname_id: string | null
          domain_id: string
          generation: number
          id: string
          identity_bound_at: string | null
          observed_at: string | null
          provider_account_id: string
          provider_detail_sanitized: Json
          provider_status: string | null
          provider_version: string | null
          provisioning_key: string
          ssl_status: string | null
          tenant_id: string
          updated_at: string
          zone_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_provider_bindings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dca02_mark_domain_provider_claim_ambiguous: {
        Args: {
          _detail_sanitized: Json
          _domain_id: string
          _expected_generation: number
          _provisioning_key: string
          _tenant_id: string
        }
        Returns: {
          binding_state: string
          created_at: string
          custom_hostname_id: string | null
          domain_id: string
          generation: number
          id: string
          identity_bound_at: string | null
          observed_at: string | null
          provider_account_id: string
          provider_detail_sanitized: Json
          provider_status: string | null
          provider_version: string | null
          provisioning_key: string
          ssl_status: string | null
          tenant_id: string
          updated_at: string
          zone_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_provider_bindings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      dca02_release_domain_provider_claim: {
        Args: {
          _domain_id: string
          _expected_generation: number
          _provisioning_key: string
          _tenant_id: string
        }
        Returns: boolean
      }
      dca02_update_domain_provider_observation: {
        Args: {
          _custom_hostname_id: string
          _domain_id: string
          _expected_generation: number
          _provider_account_id: string
          _provider_detail_sanitized: Json
          _provider_status: string
          _provider_version: string
          _ssl_status: string
          _tenant_id: string
          _zone_id: string
        }
        Returns: {
          binding_state: string
          created_at: string
          custom_hostname_id: string | null
          domain_id: string
          generation: number
          id: string
          identity_bound_at: string | null
          observed_at: string | null
          provider_account_id: string
          provider_detail_sanitized: Json
          provider_status: string | null
          provider_version: string | null
          provisioning_key: string
          ssl_status: string | null
          tenant_id: string
          updated_at: string
          zone_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_provider_bindings"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_canonical_redirect_for_active_alias: {
        Args: { _hostname: string }
        Returns: {
          alias_hostname: string
          canonical_hostname: string
          generation: number
          tenant_id: string
        }[]
      }
      get_current_tenant_id: { Args: never; Returns: string }
      has_any_permission: {
        Args: { _module_codigo: string; _user_id: string }
        Returns: boolean
      }
      has_cms_permission: {
        Args: {
          _action: Database["public"]["Enums"]["rbac_action"]
          _module_codigo: string
          _user_id: string
        }
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
      is_super_admin: { Args: never; Returns: boolean }
      issue_domain_ownership_challenge: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _correlation_id: string
          _domain_id: string
          _expected_generation: number
          _expires_at: string
          _record_name: string
          _tenant_id: string
          _value_digest: string
          _value_reference: string
        }
        Returns: {
          attempt_count: number
          challenge_kind: string
          challenge_version: number
          created_at: string
          domain_id: string
          expires_at: string
          generation: number
          id: string
          observed_value_hash: string | null
          opaque_nonce_reference: string
          record_name: string
          status: Database["public"]["Enums"]["domain_challenge_status"]
          tenant_id: string
          updated_at: string
          value_digest: string
          verified_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_verification_challenges"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      lease_domain_operation_jobs: {
        Args: { _lease_owner: string; _lease_seconds: number; _limit: number }
        Returns: {
          attempt_count: number
          authority_origin: string
          created_at: string
          domain_id: string
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          generation: number
          id: string
          idempotency_key: string
          lease_expires_at: string | null
          lease_owner: string | null
          max_attempts: number
          next_attempt_at: string
          operation_type: Database["public"]["Enums"]["domain_operation_type"]
          payload: Json
          requested_by: string
          result_sanitized: Json
          status: Database["public"]["Enums"]["domain_job_status"]
          tenant_id: string
          terminal_error_code: string | null
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "domain_operation_jobs"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      log_system_event: {
        Args: {
          _category: string
          _error_message?: string
          _event: string
          _ip?: string
          _latency_ms?: number
          _meta?: Json
          _severity?: string
          _source: string
          _status_code?: number
          _tenant_id?: string
          _user_id?: string
        }
        Returns: string
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
      mutate_tenant_membership: {
        Args: {
          _actor_user_id: string
          _operation: string
          _target_role?: string
          _target_user_id: string
          _tenant_id: string
          _tenant_origin: string
        }
        Returns: Json
      }
      portal_dlq_enqueue: {
        Args: {
          _acao: string
          _erro: string
          _payload: Json
          _portal: string
          _tenant: string
        }
        Returns: string
      }
      portal_dlq_mark_resolved: { Args: { _id: string }; Returns: undefined }
      portal_dlq_mark_retry: {
        Args: { _erro: string; _id: string }
        Returns: undefined
      }
      rate_limit_hit: {
        Args: {
          _key: string
          _limit: number
          _scope: string
          _window_seconds?: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          retry_after_seconds: number
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      register_domain_provider_account: {
        Args: {
          _account_identifier: string
          _actor_user_id: string
          _authority_origin: string
          _credential_reference: string
          _zones: Json
        }
        Returns: {
          account_identifier: string
          capabilities: Json
          enabled: boolean
          health_status: string
          id: string
          provider_code: string
        }[]
      }
      resolve_commercial_seat_decision: {
        Args: {
          _actor_user_id: string
          _requested_increment: number
          _tenant_id: string
          _tenant_origin: string
        }
        Returns: Json
      }
      resolve_public_tenant_by_host: {
        Args: { _hostname: string }
        Returns: {
          authority_mode: string
          canonical_hostname: string
          domain_id: string
          generation: number
          hostname: string
          hostname_kind: string
          tenant_id: string
          tenant_name: string
          tenant_slug: string
        }[]
      }
      rotate_domain_provider_credential_reference: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _credential_reference: string
          _provider_account_id: string
        }
        Returns: {
          id: string
        }[]
      }
      seed_default_lead_reasons: {
        Args: { _tenant: string }
        Returns: undefined
      }
      seed_default_portal_connectors: {
        Args: { _tenant: string }
        Returns: undefined
      }
      set_domain_provider_account_availability: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _enabled: boolean
          _provider_account_id: string
        }
        Returns: {
          enabled: boolean
          id: string
        }[]
      }
      super_observabilidade: { Args: { _hours?: number }; Returns: Json }
      transition_lead_status: {
        Args: {
          _expected_version: number
          _lead_id: string
          _metadata?: Json
          _reason_id?: string
          _to_status: string
        }
        Returns: Json
      }
      transition_tenant_domain: {
        Args: {
          _active_evidence: Json
          _actor_user_id: string
          _authority_origin: string
          _domain_id: string
          _expected_lock_version: number
          _failure_code: string
          _failure_detail_sanitized: Json
          _from_status: Database["public"]["Enums"]["domain_activation_status"]
          _resume_state: Database["public"]["Enums"]["domain_activation_status"]
          _tenant_id: string
          _to_status: Database["public"]["Enums"]["domain_activation_status"]
        }
        Returns: {
          activated_at: string | null
          created_at: string
          enabled: boolean
          execution_mode: Database["public"]["Enums"]["domain_execution_mode"]
          failure_code: string | null
          failure_detail_sanitized: Json
          generation: number
          hostname_kind: Database["public"]["Enums"]["domain_hostname_kind"]
          hostname_reusable_after: string | null
          id: string
          incumbent_domain_id: string | null
          lock_version: number
          metadata: Json
          normalized_hostname: string
          registrable_domain: string
          replacement_of: string | null
          requested_by: string
          resume_state:
            | Database["public"]["Enums"]["domain_activation_status"]
            | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["domain_activation_status"]
          tenant_id: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tenant_domains"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      user_belongs_to_tenant: { Args: { _tenant: string }; Returns: boolean }
      user_has_active_membership: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      user_team_ids: { Args: { _user_id: string }; Returns: string[] }
      verify_domain_ownership_challenge: {
        Args: {
          _actor_user_id: string
          _authority_origin: string
          _challenge_id: string
          _challenge_version: number
          _correlation_id: string
          _domain_id: string
          _expected_generation: number
          _observation_digest: string
          _observed_digests: string[]
          _tenant_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "corretor"
        | "secretaria"
        | "gerente"
        | "captador"
        | "super_admin"
      blog_post_status: "rascunho" | "publicado"
      domain_activation_status:
        | "draft"
        | "pending_ownership_verification"
        | "ownership_verified"
        | "pending_dns_configuration"
        | "pending_cloudflare_provisioning"
        | "pending_ssl"
        | "active"
        | "degraded"
        | "replacement_pending"
        | "removal_pending"
        | "failed"
        | "revoked"
      domain_challenge_status: "active" | "verified" | "expired" | "revoked"
      domain_execution_mode: "manual_assisted" | "api_automated"
      domain_hostname_kind: "canonical" | "alias"
      domain_job_status:
        | "pending"
        | "leased"
        | "retry_wait"
        | "succeeded"
        | "failed"
        | "cancelled"
      domain_operation_type:
        | "issue_ownership_challenge"
        | "observe_ownership_dns"
        | "prepare_dns_configuration"
        | "observe_required_dns"
        | "provision_provider_binding"
        | "observe_ssl_lifecycle"
        | "activate_domain_generation"
        | "reconcile_domain"
        | "replace_domain"
        | "remove_domain"
        | "cleanup_domain"
        | "activate_authoritative_domain_resolution"
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
      membership_status: "active" | "invited" | "suspended" | "revoked"
      rbac_action:
        | "visualizar"
        | "criar"
        | "editar"
        | "excluir"
        | "exportar"
        | "importar"
        | "aprovar"
        | "gerenciar"
        | "publicar"
      rbac_scope: "proprio" | "equipe" | "global"
      tenant_role:
        | "owner"
        | "admin"
        | "manager"
        | "broker"
        | "captador"
        | "secretaria"
        | "viewer"
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
      app_role: [
        "admin",
        "corretor",
        "secretaria",
        "gerente",
        "captador",
        "super_admin",
      ],
      blog_post_status: ["rascunho", "publicado"],
      domain_activation_status: [
        "draft",
        "pending_ownership_verification",
        "ownership_verified",
        "pending_dns_configuration",
        "pending_cloudflare_provisioning",
        "pending_ssl",
        "active",
        "degraded",
        "replacement_pending",
        "removal_pending",
        "failed",
        "revoked",
      ],
      domain_challenge_status: ["active", "verified", "expired", "revoked"],
      domain_execution_mode: ["manual_assisted", "api_automated"],
      domain_hostname_kind: ["canonical", "alias"],
      domain_job_status: [
        "pending",
        "leased",
        "retry_wait",
        "succeeded",
        "failed",
        "cancelled",
      ],
      domain_operation_type: [
        "issue_ownership_challenge",
        "observe_ownership_dns",
        "prepare_dns_configuration",
        "observe_required_dns",
        "provision_provider_binding",
        "observe_ssl_lifecycle",
        "activate_domain_generation",
        "reconcile_domain",
        "replace_domain",
        "remove_domain",
        "cleanup_domain",
        "activate_authoritative_domain_resolution",
      ],
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
      membership_status: ["active", "invited", "suspended", "revoked"],
      rbac_action: [
        "visualizar",
        "criar",
        "editar",
        "excluir",
        "exportar",
        "importar",
        "aprovar",
        "gerenciar",
        "publicar",
      ],
      rbac_scope: ["proprio", "equipe", "global"],
      tenant_role: [
        "owner",
        "admin",
        "manager",
        "broker",
        "captador",
        "secretaria",
        "viewer",
      ],
      user_status: ["ativo", "inativo", "bloqueado", "pendente"],
    },
  },
} as const
