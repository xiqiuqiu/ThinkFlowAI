/**
 * useAuth - 用户认证 Composable
 * 管理登录、注册、登出及认证状态
 */
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

// 全局单例状态
const user = ref<User | null>(null);
const loading = ref(true);
const initialized = ref(false);

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value);
  const userId = computed(() => user.value?.id ?? null);

  /**
   * 邮箱密码登录
   */
  const signInWithEmail = async (email: string, password: string) => {
    loading.value = true;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    loading.value = false;
    if (error) throw error;
    return data;
  };

  /**
   * 邮箱密码注册
   * @returns { user, session, needsEmailConfirmation }
   */
  const signUpWithEmail = async (email: string, password: string) => {
    loading.value = true;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    loading.value = false;
    if (error) throw error;

    // 判断是否需要邮箱确认：有user但无session表示需要确认邮箱
    const needsEmailConfirmation = !!data.user && !data.session;
    return { ...data, needsEmailConfirmation };
  };

  /**
   * OAuth 登录（Google/GitHub）
   */
  const signInWithOAuth = async (provider: "google" | "github") => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) throw error;
    return data;
  };

  /**
   * 登出
   */
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    user.value = null;
  };

  /**
   * 初始化认证状态
   * 应在应用启动时调用一次
   */
  const initAuth = async () => {
    if (initialized.value) return;

    try {
      const { data } = await supabase.auth.getSession();
      user.value = data.session?.user ?? null;

      // 监听认证状态变化
      supabase.auth.onAuthStateChange(
        (_event: string, session: { user: User | null } | null) => {
          user.value = session?.user ?? null;
        },
      );
    } catch (error) {
      console.error("初始化认证失败:", error);
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  };

  return {
    user,
    userId,
    loading,
    initialized,
    isAuthenticated,
    signInWithEmail,
    signUpWithEmail,
    signInWithOAuth,
    signOut,
    initAuth,
  };
}
