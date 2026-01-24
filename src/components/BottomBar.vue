<script setup lang="ts">
/**
 * 底部输入条
 * - 接收 v-model（modelValue）作为输入内容
 * - 触发 expand 事件，由 App/useThinkFlow 执行“生成/扩展”
 */

import { ref, computed } from "vue";
// 图标：输入提示与执行态
import {
  Github,
  RefreshCw,
  Terminal,
  Zap,
  Sparkles,
  Brain,
} from "lucide-vue-next";

/**
 * props：
 * - t：i18n 翻译函数
 * - modelValue：输入框内容（由 v-model 驱动）
 * - isLoading：是否正在生成（用于禁用按钮并显示 loading 图标）
 * - aiStyle: AI 思考风格
 * - onToggleAiStyle: 切换 AI 思考风格的回调
 * - forceExpanded: 强制展开输入框（新项目时使用）
 */
const props = defineProps<{
  t: any;
  modelValue: string;
  isLoading: boolean;
  aiStyle: string;
  onToggleAiStyle: () => void;
  forceExpanded?: boolean;
}>();

/**
 * 事件：
 * - update:modelValue：更新输入框内容
 * - expand：触发一次生成/扩展
 */
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
  (e: "expand"): void;
}>();

// 输入框状态管理
const isInputFocused = ref(false);
const isHovering = ref(false);
const inputRef = ref<HTMLInputElement>();

// 计算输入框是否应该展开
const isExpanded = computed(
  () =>
    props.forceExpanded ||
    isInputFocused.value ||
    isHovering.value ||
    props.modelValue.trim().length > 0,
);

// 处理输入框焦点
const handleInputFocus = () => {
  isInputFocused.value = true;
};

const handleInputBlur = () => {
  // 延迟失焦，避免点击按钮时输入框立即收起
  setTimeout(() => {
    isInputFocused.value = false;
  }, 200);
};

// 处理模式切换按钮点击
const handleStyleToggle = (e: MouseEvent) => {
  e.stopPropagation(); // 阻止事件冒泡
  e.preventDefault(); // 阻止默认行为
  props.onToggleAiStyle();
  // 保持输入框展开状态
  if (inputRef.value) {
    inputRef.value.focus();
  }
};

// 处理容器悬停
const handleContainerMouseEnter = () => {
  isHovering.value = true;
};

const handleContainerMouseLeave = () => {
  isHovering.value = false;
};

// 点击圆形球时聚焦输入框
const handleBallClick = () => {
  if (inputRef.value) {
    inputRef.value.focus();
  }
};
</script>

<template>
  <div
    class="fixed bottom-4 md:bottom-4 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3 w-full max-w-2xl px-4 md:px-6"
  >
    <div class="flex items-center gap-2 md:gap-3 w-full relative">
      <div
        :class="[
          'flex items-center gap-2 md:gap-3 bg-slate-50 border border-slate-200 px-3 md:px-5 py-2 md:py-3 focus-within:bg-white focus-within:shadow-xl focus-within:shadow-slate-100',
          'transition-all duration-500 ease-out transform-gpu',
          isExpanded
            ? 'opacity-100 scale-100 rounded-xl md:rounded-2xl w-full'
            : 'opacity-0 scale-95 rounded-full w-0 pointer-events-none',
        ]"
      >
        <Terminal class="w-4 h-4 md:w-5 h-5 text-slate-400 flex-shrink-0" />
        <input
          ref="inputRef"
          :value="props.modelValue"
          :placeholder="props.t('nav.placeholder')"
          class="flex-grow bg-transparent border-none outline-none text-xs md:text-sm font-bold text-slate-700 placeholder:text-slate-400 min-w-0"
          @input="
            emit('update:modelValue', ($event.target as HTMLInputElement).value)
          "
          @keyup.enter="emit('expand')"
          @focus="handleInputFocus"
          @blur="handleInputBlur"
        />
        <!-- 思考风格切换按钮 -->
        <button
          @click="handleStyleToggle"
          @mousedown.prevent
          type="button"
          class="flex items-center gap-1 md:gap-1.5 px-2 md:px-3 py-1.5 md:py-2 rounded-lg border text-[9px] md:text-[10px] font-bold tracking-widest uppercase transition-all shadow-sm flex-shrink-0 hover:scale-105 active:scale-95"
          :class="
            props.aiStyle === 'creative'
              ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-amber-100/50 hover:bg-amber-100'
              : 'bg-cyan-50 border-cyan-200 text-cyan-700 shadow-cyan-100/50 hover:bg-cyan-100'
          "
        >
          <component
            :is="props.aiStyle === 'creative' ? Sparkles : Brain"
            class="w-3 h-3 md:w-3.5 md:h-3.5"
          />
          <span class="hidden sm:inline">{{
            props.aiStyle === "creative"
              ? props.t("nav.styleCreative")
              : props.t("nav.stylePrecise")
          }}</span>
        </button>
        <!-- 提交按钮 -->
        <button
          @click="emit('expand')"
          @mousedown.prevent
          type="button"
          :disabled="props.isLoading || !props.modelValue.trim()"
          class="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-2 md:py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg md:rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group/btn flex-shrink-0"
        >
          <span
            class="text-[9px] md:text-[10px] font-black tracking-widest uppercase"
            >{{ props.t("nav.execute") }}</span
          >
          <Zap
            v-if="!props.isLoading"
            class="w-3.5 h-3.5 md:w-4 h-4 text-orange-400 group-hover/btn:scale-110 transition-transform"
          />
          <RefreshCw v-else class="w-3.5 h-3.5 md:w-4 h-4 animate-spin" />
        </button>
      </div>

      <!-- 收缩状态的圆形球 -->
      <div
        :class="[
          'absolute left-1/2 -translate-x-1/2 -bottom-2',
          'w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-300',
          'rounded-full cursor-pointer shadow-lg hover:shadow-xl',
          'transition-all duration-500 ease-out transform-gpu',
          'flex items-center justify-center group',
          !isExpanded
            ? 'opacity-100 scale-100 hover:scale-110'
            : 'opacity-0 scale-75 pointer-events-none',
        ]"
        @click="handleBallClick"
      >
        <!-- 球内的图标 -->
        <div class="relative">
          <Terminal
            :class="[
              'w-5 h-5 md:w-6 md:h-6 text-slate-600 transition-all duration-300',
              'group-hover:text-orange-500 group-hover:scale-110',
            ]"
          />
          <!-- 悬停时的光晕效果 -->
          <div
            class="absolute inset-0 w-5 h-5 md:w-6 md:h-6 bg-orange-400/20 rounded-full blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          ></div>
        </div>

        <!-- 球的呼吸光环 -->
        <div
          class="absolute inset-0 rounded-full bg-gradient-to-br from-orange-200/30 to-slate-200/30 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        ></div>
      </div>
    </div>

    <!-- 底部信息 -->
    <div
      class="flex items-center gap-2 px-3 py-1 bg-white/60 backdrop-blur-sm border border-slate-200/50 rounded-full text-[10px] font-black tracking-widest uppercase select-none shadow-sm"
    >
      <a
        href="https://github.com/liu-ziting/ThinkFlowAI"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-1.5 text-slate-500 hover:text-orange-500 transition-colors"
      >
        <Github class="w-3 h-3" />
        <span>ThinkFlowAI</span>
      </a>
      <span class="w-[1px] h-2 bg-slate-300 mx-1"></span>
      <span class="text-slate-400">By:Liuziting</span>
    </div>
  </div>
</template>
