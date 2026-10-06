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
          archetype: string
          created_at: string
          fitness: number
          generation: number
          genome_entry_logic: number
          genome_exit_discipline: number
          genome_indicator_weight: number
          genome_position_sizing: number
          genome_risk_tolerance: number
          id: string
          max_drawdown: number
          name: string
          parent_ids: string[] | null
          sharpe: number
          status: string
          total_return: number
          trades: number
          updated_at: string
          win_rate: number
        }
        Insert: {
          archetype: string
          created_at?: string
          fitness?: number
          generation?: number
          genome_entry_logic?: number
          genome_exit_discipline?: number
          genome_indicator_weight?: number
          genome_position_sizing?: number
          genome_risk_tolerance?: number
          id: string
          max_drawdown?: number
          name: string
          parent_ids?: string[] | null
          sharpe?: number
          status?: string
          total_return?: number
          trades?: number
          updated_at?: string
          win_rate?: number
        }
        Update: {
          archetype?: string
          created_at?: string
          fitness?: number
          generation?: number
          genome_entry_logic?: number
          genome_exit_discipline?: number
          genome_indicator_weight?: number
          genome_position_sizing?: number
          genome_risk_tolerance?: number
          id?: string
          max_drawdown?: number
          name?: string
          parent_ids?: string[] | null
          sharpe?: number
          status?: string
          total_return?: number
          trades?: number
          updated_at?: string
          win_rate?: number
        }
        Relationships: []
      }
      behavioral_genome: {
        Row: {
          drawdown_sensitivity: number
          earnings_avoidance: number
          holding_patience: number
          id: number
          momentum_bias: number
          risk_tolerance: number
          updated_at: string
        }
        Insert: {
          drawdown_sensitivity?: number
          earnings_avoidance?: number
          holding_patience?: number
          id?: number
          momentum_bias?: number
          risk_tolerance?: number
          updated_at?: string
        }
        Update: {
          drawdown_sensitivity?: number
          earnings_avoidance?: number
          holding_patience?: number
          id?: number
          momentum_bias?: number
          risk_tolerance?: number
          updated_at?: string
        }
        Relationships: []
      }
      environment_state: {
        Row: {
          earnings_active: boolean
          id: number
          macro_event: boolean
          regime: string
          sentiment: number
          updated_at: string
          volatility: string
        }
        Insert: {
          earnings_active?: boolean
          id?: number
          macro_event?: boolean
          regime?: string
          sentiment?: number
          updated_at?: string
          volatility?: string
        }
        Update: {
          earnings_active?: boolean
          id?: number
          macro_event?: boolean
          regime?: string
          sentiment?: number
          updated_at?: string
          volatility?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          avg_fitness: number
          created_at: string
          diversity: number
          gen: number
          id: number
          population: number
          top_fitness: number
        }
        Insert: {
          avg_fitness?: number
          created_at?: string
          diversity?: number
          gen: number
          id?: number
          population?: number
          top_fitness?: number
        }
        Update: {
          avg_fitness?: number
          created_at?: string
          diversity?: number
          gen?: number
          id?: number
          population?: number
          top_fitness?: number
        }
        Relationships: []
      }
      market_snapshots: {
        Row: {
          created_at: string
          data: Json
          id: number
          source: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: number
          source?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: number
          source?: string
        }
        Relationships: []
      }
      portfolio: {
        Row: {
          avg_fitness_after: number | null
          avg_fitness_before: number | null
          capital: number
          created_at: string
          diversity_after: number | null
          diversity_before: number | null
          generation: number
          id: number
          pnl: number
          pnl_percent: number
          top_agent_id: string | null
          top_agent_name: string | null
        }
        Insert: {
          avg_fitness_after?: number | null
          avg_fitness_before?: number | null
          capital?: number
          created_at?: string
          diversity_after?: number | null
          diversity_before?: number | null
          generation?: number
          id?: number
          pnl?: number
          pnl_percent?: number
          top_agent_id?: string | null
          top_agent_name?: string | null
        }
        Update: {
          avg_fitness_after?: number | null
          avg_fitness_before?: number | null
          capital?: number
          created_at?: string
          diversity_after?: number | null
          diversity_before?: number | null
          generation?: number
          id?: number
          pnl?: number
          pnl_percent?: number
          top_agent_id?: string | null
          top_agent_name?: string | null
        }
        Relationships: []
      }
      post_mortems: {
        Row: {
          agent_id: string
          agent_name: string
          cause: string
          created_at: string
          fitness_at_death: number
          generation: number
          id: string
          inherited_by: string[]
        }
        Insert: {
          agent_id: string
          agent_name: string
          cause: string
          created_at?: string
          fitness_at_death?: number
          generation: number
          id: string
          inherited_by?: string[]
        }
        Update: {
          agent_id?: string
          agent_name?: string
          cause?: string
          created_at?: string
          fitness_at_death?: number
          generation?: number
          id?: string
          inherited_by?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "post_mortems_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          action: string
          agent_id: string
          agent_name: string
          asset: string
          created_at: string
          entry_price: number
          exit_price: number | null
          generation: number
          id: number
          pnl: number | null
          pnl_percent: number | null
          quantity: number
          rationale: string | null
        }
        Insert: {
          action?: string
          agent_id: string
          agent_name: string
          asset?: string
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          generation: number
          id?: number
          pnl?: number | null
          pnl_percent?: number | null
          quantity?: number
          rationale?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          agent_name?: string
          asset?: string
          created_at?: string
          entry_price?: number
          exit_price?: number | null
          generation?: number
          id?: number
          pnl?: number | null
          pnl_percent?: number | null
          quantity?: number
          rationale?: string | null
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
