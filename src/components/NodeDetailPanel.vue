<script setup lang="ts">
/**
 * 节点详情面板（右侧抽屉）
 * - 展示节点长文本、图片、衍生问题与追问输入
 * - 与 GraphChatSidebar 互斥，由父级控制显示
 */

import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import {
  BookOpen,
  Image as ImageIcon,
  Lock,
  RefreshCw,
  Sparkles,
  Terminal,
  Unlock,
  X,
} from "lucide-vue-next";
import MarkdownIt from "markdown-it";

const props = defineProps<{
  show: boolean;
  nodeData: any | null;
  locked: boolean;
  t: any;
  isAuthenticated: boolean;
  onShowAuthModal: () => void;
}>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "toggleLock"): void;
  (e: "followUp", nodeId: string, question: string): void;
  (e: "deepDive", nodeId: string, topic: string): void;
  (e: "generateImage", nodeId: string, topic: string): void;
  (e: "preview", url: string): void;
  (e: "clickQuestion", nodeId: string, question: string): void;
}>();

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

const followUp = ref("");
const selectedText = ref("");
const showSelectionAction = ref(false);
const selectionPosition = ref({ x: 0, y: 0, transformX: "-50%" });
const contentRef = ref<HTMLElement | null>(null);

const renderedContent = computed(() => {
  if (!props.nodeData?.data?.detailedContent) return "";
  return md.render(props.nodeData.data.detailedContent);
});

const nodeTitle = computed(() => props.nodeData?.data?.label || "");
const nodeDescription = computed(() => props.nodeData?.data?.description || "");

watch(
  () => props.nodeData?.id,
  () => {
    followUp.value = props.nodeData?.data?.followUp || "";
  },
  { immediate: true },
);

const checkAccess = () => {
  if (props.isAuthenticated) return true;
  if (props.nodeData?.data?.type === "root") return true;
  props.onShowAuthModal();
  return false;
};

const handleSendFollowUp = () => {
  if (!props.nodeData) return;
  const text = followUp.value.trim();
  if (!text) return;
  if (!checkAccess()) return;
  emit("followUp", props.nodeData.id, text);
};

const handleDeepDive = () => {
  if (!props.nodeData) return;
  if (!checkAccess()) return;
  emit("deepDive", props.nodeData.id, nodeTitle.value);
};

const handleGenerateImage = () => {
  if (!props.nodeData) return;
  if (!checkAccess()) return;
  emit("generateImage", props.nodeData.id, nodeTitle.value);
};

const handleQuestionClick = (question: string) => {
  if (!props.nodeData) return;
  followUp.value = question;
  emit("clickQuestion", props.nodeData.id, question);
};

const handleTextSelection = () => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (!text || !contentRef.value) {
    showSelectionAction.value = false;
    return;
  }

  selectedText.value = text;
  showSelectionAction.value = true;

  const range = selection?.getRangeAt(0);
  const rect = range?.getBoundingClientRect();
  const container = contentRef.value.getBoundingClientRect();
  if (!rect) return;

  const buttonWidth = 100;
  const buttonHeight = 30;
  const gap = 12;
  const containerWidth = container.width;

  const diffLeft = rect.left - container.left;
  const diffTop = rect.top - container.top;

  let x = diffLeft + rect.width / 2;
  let y = diffTop - buttonHeight - gap;

  const halfButton = buttonWidth / 2;
  if (x < halfButton) {
    x = halfButton;
  } else if (x > containerWidth - halfButton) {
    x = containerWidth - halfButton;
  }

  if (y < 0) {
    y = diffTop + rect.height + gap;
  }

  let transformX = "-50%";
  if (x <= halfButton) {
    transformX = "0%";
  } else if (x >= containerWidth - halfButton) {
    transformX = "-100%";
  }

  selectionPosition.value = { x, y, transformX };
};

const checkSelection = () => {
  // 延迟检测，避免点击Spawn按钮时选区瞬间清空导致按钮消失
  setTimeout(() => {
    const selection = window.getSelection();
    if (!selection || selection.toString().trim().length === 0) {
      showSelectionAction.value = false;
    }
  }, 100);
};

onMounted(() => {
  document.addEventListener("selectionchange", checkSelection);
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", checkSelection);
});

const handleSpawn = () => {
  if (!props.nodeData) return;
  const text = selectedText.value.trim();
  if (!text) return;
  if (!checkAccess()) return;
  console.log("[NodeDetailPanel] spawn selection", {
    nodeId: props.nodeData.id,
    text,
  });
  followUp.value = text;
  emit("clickQuestion", props.nodeData.id, text);
  emit("followUp", props.nodeData.id, text);
  showSelectionAction.value = false;
  window.getSelection()?.removeAllRanges();
};
</script>

<template>
  <div
    class="h-full w-[400px] flex-shrink-0 bg-white border border-slate-200 rounded-xl z-50 flex flex-col shadow-xl"
  >
    <!-- Header -->
    <div
      class="p-4 border-b border-slate-100 flex items-center justify-between"
    >
      <div class="min-w-0">
        <div
          class="text-[9px] font-black uppercase tracking-widest text-slate-400"
        >
          {{ t("node.view") }}
        </div>
        <h2 class="text-sm font-black text-slate-900 truncate">
          {{ nodeTitle || t("node.coreIdea") }}
        </h2>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="emit('toggleLock')"
          class="p-1.5 rounded-md transition-colors"
          :class="
            locked
              ? 'text-orange-500 bg-orange-50'
              : 'text-slate-400 hover:bg-slate-100'
          "
          :title="locked ? 'Lock' : 'Unlock'"
        >
          <Lock v-if="locked" class="w-4 h-4" :stroke-width="1.5" />
          <Unlock v-else class="w-4 h-4" :stroke-width="1.5" />
        </button>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-colors"
          :title="t('common.close')"
        >
          <X class="w-4 h-4" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-grow overflow-y-auto p-4 space-y-4 custom-scrollbar">
      <div v-if="!nodeData" class="h-full flex items-center justify-center">
        <span class="text-xs text-slate-400">{{ t("node.view") }}</span>
      </div>

      <template v-else>
        <!-- Image -->
        <div
          v-if="nodeData.data.imageUrl || nodeData.data.isImageLoading"
          class="rounded-xl overflow-hidden bg-slate-50 border border-slate-100 aspect-video flex items-center justify-center relative group/img cursor-pointer"
          @click="
            nodeData.data.imageUrl
              ? emit('preview', nodeData.data.imageUrl)
              : null
          "
        >
          <img
            v-if="nodeData.data.imageUrl"
            :src="nodeData.data.imageUrl"
            class="w-full h-full object-cover"
          />
          <div
            v-if="nodeData.data.isImageLoading"
            class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md cursor-default"
          >
            <Sparkles
              class="w-6 h-6 text-orange-500 animate-ai-glow mb-2"
              :stroke-width="1.5"
            />
            <span
              class="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse"
              >{{ t("common.generating") }}</span
            >
          </div>
          <div
            v-if="nodeData.data.imageUrl"
            class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2"
          >
            <button
              class="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
            >
              <ImageIcon class="w-4 h-4 text-white" :stroke-width="1.5" />
            </button>
            <button
              @click.stop="handleGenerateImage"
              class="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
            >
              <RefreshCw class="w-4 h-4 text-white" :stroke-width="1.5" />
            </button>
          </div>
        </div>

        <!-- Description -->
        <div
          v-if="nodeDescription"
          class="text-xs text-slate-600 leading-relaxed"
        >
          {{ nodeDescription }}
        </div>

        <!-- Error -->
        <div
          v-if="nodeData.data.error"
          class="p-3 bg-red-50 border border-red-100 rounded-lg"
        >
          <div class="text-[10px] font-black text-red-600">
            {{ t("common.error.title") }}
          </div>
          <div class="text-[10px] text-red-500 mt-1">
            {{ nodeData.data.error }}
          </div>
        </div>

        <!-- Detail Content -->
        <div
          v-if="nodeData.data.isDeepDiving"
          class="flex flex-col items-center py-6"
        >
          <Sparkles
            class="w-6 h-6 text-orange-400 animate-ai-glow"
            :stroke-width="1.5"
          />
          <span
            class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 animate-pulse"
            >{{ t("common.loading") }}</span
          >
        </div>
        <div v-else-if="nodeData.data.detailedContent" class="relative">
          <div
            ref="contentRef"
            class="markdown-body text-[12px] text-slate-700 leading-relaxed font-medium"
            v-html="renderedContent"
            @mouseup="handleTextSelection"
          ></div>

          <!-- 选择文字后出现的衍生按钮 -->
          <div
            v-if="showSelectionAction"
            class="absolute z-50 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl cursor-pointer hover:bg-slate-800 transition-all animate-in fade-in zoom-in-95 duration-200 whitespace-nowrap"
            :style="{
              left: selectionPosition.x + 'px',
              top: selectionPosition.y + 'px',
              transform: `translateX(${selectionPosition.transformX})`,
            }"
            @click.stop="handleSpawn"
          >
            <span class="flex items-center gap-1.5">
              <Sparkles class="w-3 h-3 animate-ai-glow" :stroke-width="2" />
              {{ t("node.spawn") }}
            </span>
          </div>
        </div>

        <!-- Derived Questions -->
        <div
          v-if="
            nodeData.data.detailedContent &&
            (nodeData.data.derivedQuestions?.length ||
              nodeData.data.isGeneratingQuestions)
          "
          class="pt-2"
        >
          <div
            class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2"
          >
            {{ t("node.derivedQuestions") }}
          </div>

          <div
            v-if="nodeData.data.isGeneratingQuestions"
            class="flex items-center gap-2"
          >
            <Sparkles
              class="w-4 h-4 text-orange-400 animate-ai-glow"
              :stroke-width="1.5"
            />
            <span class="text-[10px] font-bold text-slate-400 animate-pulse">{{
              t("common.generating")
            }}</span>
          </div>

          <div v-else class="flex flex-wrap gap-1.5">
            <button
              v-for="(question, idx) in nodeData.data.derivedQuestions"
              :key="idx"
              @click.stop="handleQuestionClick(question)"
              class="px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-all hover:scale-105 active:scale-95 border border-slate-200 text-slate-600 hover:text-slate-800"
            >
              {{ question }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- Footer -->
    <div class="p-4 border-t border-slate-100 bg-slate-50/40">
      <div
        class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-orange-400/20 focus-within:border-orange-400 transition-all"
      >
        <Terminal class="w-3.5 h-3.5 text-orange-500" />
        <input
          v-model="followUp"
          @keyup.enter="handleSendFollowUp"
          :placeholder="t('node.followUp')"
          class="flex-grow bg-transparent border-none outline-none text-xs font-mono text-slate-700 placeholder:text-slate-300"
          :disabled="!nodeData || nodeData.data.isExpanding"
        />
        <button
          @click="handleSendFollowUp"
          :disabled="!followUp.trim() || !nodeData || nodeData.data.isExpanding"
          class="p-1.5 rounded-lg transition-all"
          :class="
            followUp.trim()
              ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
              : 'text-slate-300'
          "
        >
          <Sparkles class="w-3.5 h-3.5" />
        </button>
      </div>

      <div class="mt-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button
            @click="handleDeepDive"
            class="text-[10px] font-black uppercase tracking-widest text-orange-500 hover:text-orange-600 flex items-center gap-1 transition-colors"
            :disabled="!nodeData || nodeData.data.isDeepDiving"
          >
            <BookOpen class="w-3 h-3" />
            {{ t("node.deepDive") }}
          </button>
          <button
            @click="handleGenerateImage"
            class="text-[10px] font-black uppercase tracking-widest text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            :disabled="!nodeData || nodeData.data.isImageLoading"
          >
            <ImageIcon class="w-3 h-3" />
            {{ t("node.imgAction") }}
          </button>
        </div>
        <div
          v-if="nodeData?.data?.isExpanding"
          class="flex items-center gap-1.5"
        >
          <Sparkles class="w-3 h-3 text-orange-400 animate-ai-glow" />
          <span
            class="text-[9px] font-black uppercase tracking-widest text-orange-400 animate-pulse"
          >
            {{ t("common.loading") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-slate-200 rounded-full;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  @apply bg-slate-300;
}

@keyframes ai-glow {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}
.animate-ai-glow {
  animation: ai-glow 2s ease-in-out infinite;
}
</style>
