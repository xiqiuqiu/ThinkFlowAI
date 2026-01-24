<script setup lang="ts">
/**
 * AuthModal - 登录/注册弹窗组件
 * 支持邮箱密码登录、注册及 OAuth 登录
 */
import { ref, computed } from "vue";
import { useAuth } from "@/composables/useAuth";
import { X, Mail, Lock, LogIn, UserPlus, AlertCircle } from "lucide-vue-next";

const props = defineProps<{
  show: boolean;
  t: (key: string) => string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { signInWithEmail, signUpWithEmail, signInWithOAuth, loading } =
  useAuth();

// 表单状态
const mode = ref<"login" | "register">("login");
const email = ref("");
const password = ref("");
const confirmPassword = ref("");
const error = ref("");

const isLogin = computed(() => mode.value === "login");

const toggleMode = () => {
  mode.value = isLogin.value ? "register" : "login";
  error.value = "";
};

const handleSubmit = async () => {
  error.value = "";

  if (!email.value || !password.value) {
    error.value = props.t("auth.fillAllFields");
    return;
  }

  if (!isLogin.value && password.value !== confirmPassword.value) {
    error.value = props.t("auth.passwordMismatch");
    return;
  }

  try {
    if (isLogin.value) {
      await signInWithEmail(email.value, password.value);
    } else {
      await signUpWithEmail(email.value, password.value);
    }
    emit("close");
  } catch (err: any) {
    error.value = err.message || props.t("auth.unknownError");
  }
};

const handleOAuth = async (provider: "google" | "github") => {
  try {
    await signInWithOAuth(provider);
  } catch (err: any) {
    error.value = err.message || props.t("auth.unknownError");
  }
};
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        @click.self="emit('close')"
      >
        <div
          class="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-300"
        >
          <!-- Header -->
          <div
            class="bg-gradient-to-r from-orange-400 to-rose-400 px-6 py-5 relative"
          >
            <h2 class="text-white font-black text-lg tracking-wide">
              {{ isLogin ? t("auth.login") : t("auth.register") }}
            </h2>
            <p class="text-white/70 text-xs mt-1">
              {{ isLogin ? t("auth.loginDesc") : t("auth.registerDesc") }}
            </p>
            <button
              @click="emit('close')"
              class="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSubmit" class="p-6 space-y-4">
            <!-- Error Message -->
            <div
              v-if="error"
              class="flex items-center gap-2 px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-xs"
            >
              <AlertCircle class="w-4 h-4 flex-shrink-0" />
              <span>{{ error }}</span>
            </div>

            <!-- Email -->
            <div class="relative">
              <Mail
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <input
                v-model="email"
                type="email"
                :placeholder="t('auth.email')"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            <!-- Password -->
            <div class="relative">
              <Lock
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <input
                v-model="password"
                type="password"
                :placeholder="t('auth.password')"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            <!-- Confirm Password (Register only) -->
            <div v-if="!isLogin" class="relative">
              <Lock
                class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              />
              <input
                v-model="confirmPassword"
                type="password"
                :placeholder="t('auth.confirmPassword')"
                class="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
              />
            </div>

            <!-- Submit Button -->
            <button
              type="submit"
              :disabled="loading"
              class="w-full py-3 bg-gradient-to-r from-orange-400 to-rose-400 text-white font-bold text-sm rounded-xl hover:from-orange-500 hover:to-rose-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <component :is="isLogin ? LogIn : UserPlus" class="w-4 h-4" />
              {{ isLogin ? t("auth.loginBtn") : t("auth.registerBtn") }}
            </button>

            <!-- Divider -->
            <div class="flex items-center gap-3 my-4">
              <div class="flex-1 h-px bg-slate-200"></div>
              <span class="text-xs text-slate-400">{{ t("auth.or") }}</span>
              <div class="flex-1 h-px bg-slate-200"></div>
            </div>

            <!-- OAuth Buttons -->
            <div class="flex gap-3">
              <button
                type="button"
                @click="handleOAuth('google')"
                class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </button>
              <button
                type="button"
                @click="handleOAuth('github')"
                class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                  />
                </svg>
                GitHub
              </button>
            </div>

            <!-- Toggle Mode -->
            <p class="text-center text-xs text-slate-500 mt-4">
              {{ isLogin ? t("auth.noAccount") : t("auth.hasAccount") }}
              <button
                type="button"
                @click="toggleMode"
                class="text-orange-500 font-bold hover:underline"
              >
                {{ isLogin ? t("auth.registerNow") : t("auth.loginNow") }}
              </button>
            </p>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
