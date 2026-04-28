export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_history: {
        Row: {
          created_at: string
          file_name: string
          id: string
          metrics: Json
          model_type: string
          proxy_features: Json
          report: string | null
          sensitive_col: string
          target_col: string
          user_id: string | null
          verdict: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          metrics?: Json
          model_type?: string
          proxy_features?: Json
          report?: string | null
          sensitive_col: string
          target_col: string
          user_id?: string | null
          verdict: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          metrics?: Json
          model_type?: string
          proxy_features?: Json
          report?: string | null
          sensitive_col?: string
          target_col?: string
          user_id?: string | null
          verdict?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
