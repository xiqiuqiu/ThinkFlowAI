/**
 * Supabase 客户端初始化
 * 用于连接 Supabase 后端服务
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase 环境变量未配置，云存储功能将不可用");
}

export const supabase = createClient<Database>(
  supabaseUrl || "",
  supabaseAnonKey || "",
);
