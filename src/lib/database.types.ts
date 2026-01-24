/**
 * Supabase 数据库类型定义
 * 根据数据库表结构自动生成类型
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          preferences: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          preferences?: Json;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      nodes: {
        Row: {
          id: string;
          project_id: string;
          node_id: string;
          type: string;
          position: Json;
          title: string | null;
          description: string | null;
          detailed_content: string | null;
          image_url: string | null;
          children_count: number;
          is_expanding: boolean;
          follow_up: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          node_id: string;
          type?: string;
          position?: Json;
          title?: string | null;
          description?: string | null;
          detailed_content?: string | null;
          image_url?: string | null;
          children_count?: number;
          is_expanding?: boolean;
          follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          node_id?: string;
          type?: string;
          position?: Json;
          title?: string | null;
          description?: string | null;
          detailed_content?: string | null;
          image_url?: string | null;
          children_count?: number;
          is_expanding?: boolean;
          follow_up?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      edges: {
        Row: {
          id: string;
          project_id: string;
          edge_id: string;
          source_node_id: string;
          target_node_id: string;
          type: string;
          style: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          edge_id: string;
          source_node_id: string;
          target_node_id: string;
          type?: string;
          style?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          edge_id?: string;
          source_node_id?: string;
          target_node_id?: string;
          type?: string;
          style?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// 便捷类型别名
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Node = Database["public"]["Tables"]["nodes"]["Row"];
export type Edge = Database["public"]["Tables"]["edges"]["Row"];
