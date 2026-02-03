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

// 面板宽度调整
const panelWidth = ref(400);
const startX = ref(0);
const startWidth = ref(0);
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  isResizing.value = true;
  startX.value = e.clientX;
  startWidth.value = panelWidth.value;
  document.addEventListener("mousemove", resize);
  document.addEventListener("mouseup", stopResize);
  document.body.style.cursor = "ew-resize";
  document.body.style.userSelect = "none"; // 防止拖拽时选中文本
};

const resize = (e: MouseEvent) => {
  if (!isResizing.value) return;
  const dx = startX.value - e.clientX; // 向左拖拽增加宽度
  let newWidth = startWidth.value + dx;

  // 限制宽度范围
  if (newWidth < 300) newWidth = 300;
  if (newWidth > 800) newWidth = 800;

  panelWidth.value = newWidth;
};

const stopResize = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", resize);
  document.removeEventListener("mouseup", stopResize);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
};

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
  const buttonHeight = 20;
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
    class="h-full min-h-0 flex-shrink-0 bg-stone-50 border-l-2 border-stone-100 z-50 flex flex-col overflow-hidden relative transition-[width] duration-0"
    :style="{ width: panelWidth + 'px' }"
  >
    <!-- Resize Handle -->
    <div
      class="absolute left-0 top-0 bottom-0 w-5 cursor-ew-resize flex justify-center z-[100] -translate-x-1/2 group/resize touch-none select-none"
      @mousedown.prevent="startResize"
    >
      <!-- Interactive Highlight Line -->
      <div
        class="w-0.5 h-full bg-transparent group-hover/resize:bg-orange-400/30 transition-colors duration-200"
      ></div>

      <!-- Visual Grip Handle -->
      <div
        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-10 bg-stone-300/80 rounded-full shadow-sm backdrop-blur-sm group-hover/resize:bg-orange-500 group-hover/resize:w-1.5 group-hover/resize:h-14 transition-all duration-200 ease-out border border-white/50"
      ></div>
    </div>

    <!-- Header -->
    <div
      class="p-4 border-b border-stone-100 flex items-center justify-between flex-shrink-0 bg-white z-10"
    >
      <div class="min-w-0">
        <h2 class="text-sm font-black text-slate-900">
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

    <!-- Content (Scrollable) -->
    <div
      class="flex-grow overflow-y-auto min-h-0 p-4 text-[14px] space-y-4 bg-slate-50/50 custom-scrollbar"
    >
      <div v-if="!nodeData" class="h-full flex items-center justify-center">
        <span class="text-slate-400">{{ t("node.view") }}</span>
      </div>

      <template v-else>
        <!-- Image -->
        <div
          v-if="nodeData.data.imageUrl || nodeData.data.isImageLoading"
          class="rounded-xl overflow-hidden bg-slate-50 border border-slate-100 aspect-video flex items-center justify-center relative group/img cursor-pointer flex-shrink-0"
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
        <!-- <div v-if="nodeDescription" class="text-slate-600 leading-relaxed">
          {{ nodeDescription }}
        </div> -->

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
            class="markdown-body text-slate-700 leading-relaxed font-medium"
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
      </template>
    </div>

    <!-- Derived Questions (AI Generated) -->
    <div
      v-if="
        nodeData?.data?.detailedContent &&
        (nodeData.data.derivedQuestions?.length ||
          nodeData.data.isGeneratingQuestions)
      "
      class="border-t border-slate-100 bg-slate-50/50 p-4 max-h-[190px] custom-scrollbar flex-shrink-0"
    >
      <div
        class="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center justify-between"
      >
        <span>{{ t("node.derivedQuestions") }}</span>
        <div
          v-if="nodeData.data.isGeneratingQuestions"
          class="flex items-center gap-2"
        >
          <Sparkles
            class="w-3 h-3 text-orange-400 animate-ai-glow"
            :stroke-width="1.5"
          />
          <span class="text-[9px] font-medium text-orange-400 animate-pulse">
            {{ t("common.generating") }}
          </span>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div
        v-if="
          nodeData.data.isGeneratingQuestions &&
          !nodeData.data.derivedQuestions?.length
        "
        class="flex flex-col gap-2"
      >
        <div
          v-for="i in 3"
          :key="'skeleton-' + i"
          class="h-10 bg-slate-200/50 rounded-lg animate-pulse"
        ></div>
      </div>

      <!-- Actual Questions -->
      <div v-else class="flex flex-wrap gap-2">
        <button
          v-for="(question, idx) in nodeData.data.derivedQuestions"
          :key="idx"
          @click.stop="handleQuestionClick(question)"
          class="px-3 py-2 text-[11px] font-medium rounded-lg text-left transition-all bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300 hover:shadow-sm active:scale-[0.98] w-full"
        >
          {{ question }}
        </button>
      </div>
    </div>

    <!-- User Input Area -->
    <div class="p-4 border-t border-slate-100 bg-white flex-shrink-0 z-20">
      <!-- Status Indicators -->
      <div
        v-if="
          nodeData?.data?.isExpanding ||
          nodeData?.data?.isDeepDiving ||
          nodeData?.data?.isImageLoading
        "
        class="flex items-center gap-2 mb-2 px-1"
      >
        <Sparkles class="w-3 h-3 text-orange-400 animate-ai-glow" />
        <span
          class="text-[9px] font-black uppercase tracking-widest text-orange-400 animate-pulse"
        >
          {{ t("common.processing") }}
        </span>
      </div>

      <div
        class="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-orange-400/20 focus-within:border-orange-400 transition-all shadow-sm"
      >
        <!-- Action Buttons in Input -->
        <div
          class="flex items-center gap-0.5 border-r border-slate-200 pr-1 mr-1"
        >
          <button
            @click="handleDeepDive"
            class="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors"
            :class="{
              'text-orange-500 bg-orange-50': nodeData?.data?.isDeepDiving,
            }"
            :disabled="!nodeData || nodeData.data.isDeepDiving"
            :title="t('node.deepDive')"
          >
            <BookOpen class="w-4 h-4" :stroke-width="1.5" />
          </button>
          <button
            @click="handleGenerateImage"
            class="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
            :class="{
              'text-blue-500 bg-blue-50': nodeData?.data?.isImageLoading,
            }"
            :disabled="!nodeData || nodeData.data.isImageLoading"
            :title="t('node.imgAction')"
          >
            <ImageIcon class="w-4 h-4" :stroke-width="1.5" />
          </button>
        </div>

        <input
          v-model="followUp"
          @keyup.enter="handleSendFollowUp"
          :placeholder="t('node.followUp')"
          class="flex-grow bg-transparent border-none outline-none text-xs font-medium text-slate-700 placeholder:text-slate-400 min-w-0"
          :disabled="!nodeData || nodeData.data.isExpanding"
        />

        <button
          @click="handleSendFollowUp"
          :disabled="!followUp.trim() || !nodeData || nodeData.data.isExpanding"
          class="p-1.5 rounded-lg transition-all flex-shrink-0"
          :class="
            followUp.trim()
              ? 'bg-orange-500 text-white shadow-md hover:bg-orange-600'
              : 'text-slate-300'
          "
        >
          <Terminal class="w-3.5 h-3.5" :stroke-width="2" />
        </button>
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
