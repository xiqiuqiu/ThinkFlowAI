<script setup lang="ts">
/**
 * 自定义节点：WindowNode
 * - 展示节点标题、描述、错误态、图片、深挖内容、followUp 输入
 * - 将用户交互（深挖/配图/继续扩展）转发给 useThinkFlow 的动作函数
 * - 使用 activePath 对非路径节点做弱化处理，突出当前上下文
 */

// 组件状态
import { ref, onMounted, onUnmounted } from "vue";

// VueFlow：连接点
import { Handle, Position, useVueFlow } from "@vue-flow/core";

// 图标：节点 UI
import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Image as ImageIcon,
  Lightbulb,
  Maximize2,
  RefreshCw,
  Shield,
  Sparkles,
  Terminal,
  Trash2,
  X,
} from "lucide-vue-next";

// Markdown 渲染
import MarkdownIt from "markdown-it";

/**
 * props：
 * - id/data/selected：VueFlow 提供的节点数据
 * - t/config：全局翻译与样式配置
 * - activeNodeId/activePath：用于路径高亮与节点弱化
 * - flowNodes/updateNode/deepDive/generateNodeImage/expandIdea：由 App/useThinkFlow 传入的能力
 */
const props = defineProps<{
  id: string;
  data: any;
  selected: boolean;
  t: any;
  config: any;
  fitView: (options?: any) => void;
  activeNodeId: string | null;
  activePath: { nodeIds: Set<string>; edgeIds: Set<string> };
  flowNodes: any[];
  updateNode: (id: string, payload: any) => void;
  deepDive: (id: string, topic: string) => void;
  generateNodeImage: (id: string, prompt: string) => void;
  expandIdea: (param?: any, customInput?: string) => void;
  toggleSubtreeCollapse: (id: string) => void;
  isSubtreeCollapsed: (id: string) => boolean;
  deleteNode: (id: string) => void;
  generateDerivedQuestions: (id: string) => void;
  // 游客模式限制
  isAuthenticated: boolean;
  onShowAuthModal: () => void;
}>();

/**
 * 检查功能是否允许使用（非根节点需登录）
 */
const checkAccess = () => {
  if (props.isAuthenticated) return true;
  if (props.data.type === "root") return true;
  props.onShowAuthModal();
  return false;
};

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

/**
 * preview：请求 App 打开图片预览弹窗
 */
const emit = defineEmits<{
  (e: "preview", url: string): void;
}>();

/**
 * followUp 输入框是否聚焦（用于边框高亮）
 */
const isFocused = ref(false);

/**
 * 节点宽度与拖拽逻辑
 */
const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const nodeWidth = ref(props.data.nodeWidth || 340);
const isResizing = ref(false);

const startResize = (e: MouseEvent) => {
  e.stopPropagation();
  e.preventDefault();
  isResizing.value = true;
  const startX = e.clientX;
  const startWidth = nodeWidth.value;
  const zoom = viewport.value.zoom || 1;

  const onMouseMove = (moveEvt: MouseEvent) => {
    const delta = (moveEvt.clientX - startX) / zoom;
    nodeWidth.value = Math.min(
      MAX_WIDTH,
      Math.max(MIN_WIDTH, startWidth + delta),
    );
  };

  const onMouseUp = () => {
    isResizing.value = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
    // 持久化宽度
    props.updateNode(props.id, {
      data: { ...props.data, nodeWidth: nodeWidth.value },
    });
  };

  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mouseup", onMouseUp);
};

/**
 * 文字选择相关状态
 */
const selectedText = ref("");
const showSelectionAction = ref(false);
const selectionPosition = ref({ x: 0, y: 0, transformX: "-50%" });
const { viewport } = useVueFlow();

/**

 * 处理文字选择事件
 * 实现边界检测：水平限制不溢出容器，垂直方向如靠近顶部则翻转到选区下方
 */
const handleTextSelection = (e: MouseEvent) => {
  const selection = window.getSelection();
  const text = selection?.toString().trim();

  if (text && text.length > 0) {
    selectedText.value = text;
    showSelectionAction.value = true;

    // 获取选区位置，相对于触发事件的容器
    const range = selection?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    const container = (e.currentTarget as HTMLElement)?.getBoundingClientRect();

    if (rect && container) {
      const zoom = viewport.value.zoom || 1;

      // 按钮尺寸估算（实际宽度约100px，高度约30px）
      // 所有屏幕像素计算需除以 zoom 以转回内部相对坐标
      const buttonWidth = 100;
      const buttonHeight = 30;
      const gap = 12;
      const containerWidth = container.width / zoom;

      // 计算差值（屏幕像素）并转为内部CSS像素
      const diffLeft = rect.left - container.left;
      const diffTop = rect.top - container.top;

      let x = (diffLeft + rect.width / 2) / zoom;
      let y = diffTop / zoom - buttonHeight - gap;

      // 水平边界限制
      const halfButton = buttonWidth / 2;
      if (x < halfButton) {
        x = halfButton;
      } else if (x > containerWidth - halfButton) {
        x = containerWidth - halfButton;
      }

      // 垂直边界检测
      if (y < 0) {
        y = (diffTop + rect.height) / zoom + gap;
      }

      // 根据水平位置决定变换方式
      let transformX = "-50%";
      if (x <= halfButton) {
        transformX = "0%";
      } else if (x >= containerWidth - halfButton) {
        transformX = "-100%";
      }

      selectionPosition.value = { x, y, transformX };
    }
  } else {
    showSelectionAction.value = false;
  }
};

/**
 * 监听全局点击或 selectionchange 以隐藏按钮
 */
const checkSelection = () => {
  const selection = window.getSelection();
  if (!selection || selection.toString().trim().length === 0) {
    showSelectionAction.value = false;
  }
};

onMounted(() => {
  document.addEventListener("selectionchange", checkSelection);
});

onUnmounted(() => {
  document.removeEventListener("selectionchange", checkSelection);
});

/**
 * 直接基于选中文字进行扩展（Spawn）
 */
const handleSpawn = () => {
  // 游客模式限制：非根节点需登录
  if (!checkAccess()) return;

  // 直接调用 expandIdea，传入选中文字作为 customInput
  props.expandIdea(
    {
      id: props.id,
      data: props.data,
      position: getNodePosition(props.id),
    },
    selectedText.value,
  );

  showSelectionAction.value = false;
  window.getSelection()?.removeAllRanges();
};

/**
 * 从 flowNodes 中找到节点当前位置，用于扩展时定位新节点生成的参考坐标
 */

const getNodePosition = (id: string) =>
  props.flowNodes.find((n) => n.id === id)?.position;

/**
 * 输入框聚焦处理：放大节点并居中视图
 */
const handleFocus = () => {
  isFocused.value = true;
  // 聚焦时将视图中心对准该节点，并给予适当的 padding 确保放大后完整可见
  props.fitView({ nodes: [props.id], padding: 1.5, duration: 600 });
};

/**
 * 输入框失去焦点处理
 */
const handleBlur = () => {
  isFocused.value = false;
};

/**
 * 调试：记录按钮点击时的状态
 */
const handleExpandClick = () => {
  console.log("[WindowNode Debug] 回答按钮点击:", {
    nodeId: props.id,
    followUp: props.data.followUp,
    isExpanding: props.data.isExpanding,
    dataSnapshot: JSON.stringify(props.data),
    flowNodeData: props.flowNodes.find((n: any) => n.id === props.id)?.data,
  });

  if (!checkAccess()) {
    console.log("[WindowNode Debug] checkAccess 返回 false");
    return;
  }

  console.log("[WindowNode Debug] 调用 expandIdea...");
  props.expandIdea(
    {
      id: props.id,
      data: props.data,
      position: getNodePosition(props.id),
    },
    props.data.followUp,
  );
};
</script>

<template>
  <div
    class="window-node group transition-all duration-500"
    :class="{
      'opacity-40 grayscale-[0.4] blur-[0.5px] scale-[0.98] pointer-events-none':
        props.activeNodeId && !props.activePath.nodeIds.has(props.id),
      'opacity-100 grayscale-0 blur-0 scale-105 z-50 ring-2 ring-offset-4':
        props.activePath.nodeIds.has(props.id) && !isFocused,
      'opacity-100 grayscale-0 blur-0 scale-110 z-[100] shadow-2xl ring-4 ring-offset-8':
        isFocused,
      resizing: isResizing,
    }"
    :style="{
      width: props.data.isDetailExpanded ? '450px' : nodeWidth + 'px',
      borderColor:
        isFocused || props.activePath.nodeIds.has(props.id)
          ? props.config.edgeColor
          : props.config.edgeColor + '40',
      boxShadow: isFocused
        ? `0 25px 50px -12px ${props.config.edgeColor}60`
        : props.activeNodeId === props.id
          ? `0 20px 50px -12px ${props.config.edgeColor}40`
          : '',
      '--tw-ring-color':
        isFocused || props.selected
          ? props.config.edgeColor + '40'
          : 'transparent',
    }"
  >
    <Handle
      type="target"
      :position="Position.Left"
      class="!bg-transparent !border-none"
    />
    <Handle
      type="source"
      :position="Position.Right"
      class="!bg-transparent !border-none"
    />

    <!-- 拖拽手柄 -->
    <div class="resize-handle nodrag" @mousedown="startResize">
      <GripVertical class="w-3 h-3 text-slate-300" :stroke-width="1.5" />
    </div>

    <div
      class="window-header"
      :style="{
        backgroundColor: props.activePath.nodeIds.has(props.id)
          ? props.config.edgeColor + '15'
          : props.config.edgeColor + '05',
      }"
    >
      <div class="flex gap-1.5">
        <div
          class="w-2 h-2 rounded-full"
          :style="{
            backgroundColor: props.activePath.nodeIds.has(props.id)
              ? props.config.edgeColor
              : props.config.edgeColor + '40',
          }"
        ></div>
        <div class="w-2 h-2 rounded-full bg-slate-200"></div>
        <div class="w-2 h-2 rounded-full bg-slate-200"></div>
      </div>
      <span
        class="window-title"
        :style="{
          color: props.activePath.nodeIds.has(props.id)
            ? props.config.edgeColor
            : '',
        }"
      >
        {{
          props.data.type === "root"
            ? props.t("node.mainTitle")
            : props.t("node.moduleTitle")
        }}
      </span>
      <div class="flex items-center gap-1">
        <button
          v-if="props.data.childrenCount > 0"
          type="button"
          class="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors"
          :class="
            props.isSubtreeCollapsed(props.id)
              ? 'text-orange-600 bg-orange-50'
              : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
          "
          @click.stop="props.toggleSubtreeCollapse(props.id)"
        >
          <component
            :is="
              props.isSubtreeCollapsed(props.id) ? ChevronRight : ChevronDown
            "
            class="w-3 h-3"
            :stroke-width="1.5"
          />
          <span
            v-if="
              props.isSubtreeCollapsed(props.id) &&
              props.data.hiddenDescendantCount
            "
            class="text-[9px] font-black"
            >{{ props.data.hiddenDescendantCount }}</span
          >
        </button>
        <button
          v-if="props.data.type !== 'root'"
          type="button"
          class="flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-colors text-rose-400 hover:bg-rose-50 hover:text-rose-600"
          :title="props.t('node.delete')"
          @click.stop="props.deleteNode(props.id)"
        >
          <Trash2 class="w-3 h-3" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <div
      v-if="props.data.isExpanding"
      class="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/60 backdrop-blur-[4px] rounded-2xl transition-all duration-300"
    >
      <div class="relative">
        <div
          class="absolute inset-0 blur-2xl opacity-30 animate-pulse scale-150"
          :style="{ backgroundColor: props.config.edgeColor }"
        ></div>
        <Sparkles
          class="w-10 h-10 text-slate-900 animate-ai-glow mb-3 relative z-10"
          :style="{ color: props.config.edgeColor }"
          :stroke-width="1.5"
        />
      </div>
      <span
        class="text-[10px] font-black tracking-widest uppercase text-slate-600 animate-pulse"
        >{{ props.t("common.expanding") }}</span
      >
    </div>

    <div class="window-content">
      <div
        v-if="props.data.imageUrl || props.data.isImageLoading"
        class="mb-4 rounded-lg overflow-hidden bg-slate-50 border border-slate-100 aspect-video flex items-center justify-center relative group/img cursor-pointer"
        @click.stop="
          props.data.imageUrl ? emit('preview', props.data.imageUrl) : null
        "
      >
        <img
          v-if="props.data.imageUrl"
          :src="props.data.imageUrl"
          class="w-full h-full object-cover"
        />
        <div
          v-if="props.data.isImageLoading"
          class="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md cursor-default"
        >
          <Sparkles
            class="w-6 h-6 text-orange-500 animate-ai-glow mb-2"
            :stroke-width="1.5"
          />
          <span
            class="text-[8px] font-bold text-slate-400 uppercase tracking-widest animate-pulse"
            >{{ props.t("common.generating") }}</span
          >
        </div>
        <div
          v-if="props.data.imageUrl"
          class="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2"
        >
          <button
            class="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
          >
            <Maximize2 class="w-4 h-4 text-white" :stroke-width="1.5" />
          </button>
          <button
            @click.stop="props.generateNodeImage(props.id, props.data.label)"
            class="p-2 bg-white/20 hover:bg-white/40 rounded-full backdrop-blur-md transition-all"
          >
            <RefreshCw class="w-4 h-4 text-white" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <div class="flex items-start gap-2 mb-2">
        <span
          class="font-bold shrink-0 mt-0.5"
          :style="{ color: props.config.edgeColor }"
          >></span
        >
        <h3
          class="font-black text-slate-900 tracking-tight cursor-pointer hover:text-orange-600 transition-colors"
          :class="props.data.isTitleExpanded ? 'whitespace-normal' : 'truncate'"
          @click.stop="
            props.updateNode(props.id, {
              data: {
                ...props.data,
                isTitleExpanded: !props.data.isTitleExpanded,
              },
            })
          "
        >
          {{ props.data.label }}
        </h3>
      </div>

      <p
        class="text-[10px] text-slate-500 leading-relaxed font-medium line-clamp-3"
      >
        {{ props.data.description }}
      </p>

      <div
        v-if="props.data.error"
        class="mt-3 p-2.5 bg-red-50 border border-red-100 rounded-lg animate-in fade-in slide-in-from-top-1 duration-300"
      >
        <div class="flex items-start gap-2">
          <Shield
            class="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5"
            :stroke-width="1.5"
          />
          <div class="flex-grow space-y-1">
            <p class="text-[10px] font-black text-red-600 leading-tight">
              {{ props.t("common.error.title") }}
            </p>
            <p class="text-[9px] text-red-500 leading-relaxed">
              {{ props.data.error }}
            </p>
          </div>
          <button
            @click.stop="
              props.data.imageUrl === null &&
              props.data.isImageLoading === false
                ? props.generateNodeImage(props.id, props.data.label)
                : props.expandIdea({
                    id: props.id,
                    data: props.data,
                    position: getNodePosition(props.id),
                  })
            "
            class="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <RefreshCw class="w-3 h-3 text-red-600" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <div class="pt-3 mt-3 border-t border-slate-50">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-1.5 shrink-0">
            <div
              class="w-1.5 h-1.5 rounded-full animate-pulse"
              :style="{
                backgroundColor: props.data.isExpanding
                  ? props.config.edgeColor
                  : '#34d399',
              }"
            ></div>
            <span
              class="text-[9px] font-bold text-slate-400 uppercase tracking-tighter"
              >{{
                props.data.isExpanding
                  ? props.t("common.expanding")
                  : props.t("common.active")
              }}</span
            >
          </div>

          <div class="flex items-center gap-2">
            <button
              @click.stop="
                checkAccess() && props.deepDive(props.id, props.data.label)
              "
              class="action-btn text-orange-500 hover:bg-orange-50"
            >
              <BookOpen class="w-2.5 h-2.5" :stroke-width="1.5" />
              <span>{{ props.t("node.deepDive") }}</span>
            </button>
            <button
              v-if="!props.data.imageUrl && !props.data.isImageLoading"
              @click.stop="
                checkAccess() &&
                props.generateNodeImage(props.id, props.data.label)
              "
              class="action-btn text-blue-500 hover:bg-blue-50"
            >
              <ImageIcon class="w-2.5 h-2.5" :stroke-width="1.5" />
              <span>{{ props.t("node.imgAction") }}</span>
            </button>
          </div>
        </div>

        <div
          v-if="props.data.isDetailExpanded || props.data.detailedContent"
          class="mb-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-2 duration-300"
        >
          <div class="flex items-center justify-between mb-2">
            <span
              class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
              >{{ props.t("node.deepDive") }}</span
            >
            <button
              @click.stop="
                props.updateNode(props.id, {
                  data: { ...props.data, isDetailExpanded: false },
                })
              "
              class="text-slate-300 hover:text-slate-500"
            >
              <X class="w-3 h-3" :stroke-width="1.5" />
            </button>
          </div>
          <div
            v-if="props.data.isDeepDiving"
            class="flex flex-col items-center py-6"
          >
            <div class="relative mb-3">
              <Sparkles
                class="w-6 h-6 text-orange-400 animate-ai-glow"
                :stroke-width="1.5"
              />
              <div
                class="absolute inset-0 blur-lg bg-orange-200 opacity-50 animate-pulse"
              ></div>
            </div>
            <span
              class="text-[9px] font-black text-slate-400 uppercase tracking-widest animate-pulse"
              >{{ props.t("common.loading") }}</span
            >
          </div>
          <div v-else class="relative">
            <div
              class="markdown-body text-[11px] text-slate-600 leading-relaxed font-medium max-h-[350px] overflow-y-auto custom-scrollbar pr-2 selection:bg-orange-100 nowheel nodrag cursor-text select-text"
              style="pointer-events: auto; user-select: text"
              v-html="md.render(props.data.detailedContent)"
              @mouseup="handleTextSelection"
            ></div>

            <!-- 浮动选择操作按钮 -->
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
                {{ props.t("node.spawn") }}
              </span>
            </div>
          </div>
        </div>

        <!-- AI衍生问题气泡（在 detailedContent 生成后自动显示） -->
        <div
          v-if="
            props.data.detailedContent &&
            (props.data.derivedQuestions?.length ||
              props.data.isGeneratingQuestions)
          "
          class="mb-3"
        >
          <div class="flex items-center mb-2">
            <span
              class="text-[9px] font-black text-slate-400 uppercase tracking-widest"
              >{{ props.t("node.derivedQuestions") }}</span
            >
          </div>

          <!-- 生成中状态 -->
          <div
            v-if="props.data.isGeneratingQuestions"
            class="flex items-center gap-2 py-2"
          >
            <Sparkles
              class="w-4 h-4 text-purple-400 animate-ai-glow"
              :stroke-width="1.5"
            />
            <span class="text-[9px] font-bold text-slate-400 animate-pulse">{{
              props.t("common.generating")
            }}</span>
          </div>

          <!-- 衍生问题气泡 -->
          <div
            v-else-if="props.data.derivedQuestions?.length"
            class="flex flex-wrap gap-1.5"
          >
            <button
              v-for="(question, idx) in props.data.derivedQuestions"
              :key="idx"
              @click.stop="
                props.updateNode(props.id, {
                  data: { ...props.data, followUp: question },
                })
              "
              class="px-2.5 py-1.5 text-[10px] font-bold rounded-full transition-all hover:scale-105 active:scale-95 border"
            >
              {{ question }}
            </button>
          </div>
        </div>

        <div class="relative group/input">
          <div
            class="flex items-center gap-2 bg-slate-50 rounded-lg px-2.5 py-2 border border-slate-100 focus-within:bg-white transition-all"
            :style="{
              borderColor:
                props.data.followUp || isFocused ? props.config.edgeColor : '',
            }"
          >
            <ChevronRight
              v-if="!props.data.followUp"
              class="w-3 h-3 text-slate-400"
              :stroke-width="1.5"
            />
            <Terminal
              v-else
              class="w-3 h-3"
              :style="{ color: props.config.edgeColor }"
              :stroke-width="1.5"
            />
            <input
              v-model="props.data.followUp"
              @focus="handleFocus"
              @blur="handleBlur"
              @keyup.enter="
                checkAccess() &&
                props.expandIdea(
                  {
                    id: props.id,
                    data: props.data,
                    position: getNodePosition(props.id),
                  },
                  props.data.followUp,
                )
              "
              :placeholder="props.t('node.followUp')"
              class="bg-transparent border-none outline-none text-[10px] font-bold text-slate-700 flex-grow placeholder:text-slate-400"
              :disabled="props.data.isExpanding"
            />
            <button
              @click.stop="handleExpandClick"
              :disabled="!props.data.followUp?.trim() || props.data.isExpanding"
              class="transition-all transform active:scale-90"
              :style="{
                color: props.data.followUp?.trim()
                  ? props.config.edgeColor
                  : '#94a3b8',
              }"
            >
              <Sparkles
                v-if="props.data.isExpanding"
                class="w-3.5 h-3.5 animate-ai-glow"
                :stroke-width="1.5"
              />
              <ArrowRight v-else class="w-3.5 h-3.5" :stroke-width="1.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes ai-glow {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    filter: drop-shadow(0 0 5px currentColor);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.1) rotate(10deg);
    filter: drop-shadow(0 0 15px currentColor);
    opacity: 1;
  }
}

.animate-ai-glow {
  animation: ai-glow 2.5s ease-in-out infinite;
}

.window-node {
  @apply relative rounded-2xl overflow-hidden;
  background: var(--bg-glass);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 2px solid var(--border-glass);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.1);
  min-width: 280px;
  max-width: 600px;
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.window-node.resizing {
  transition: none;
}

.resize-handle {
  @apply absolute right-0 top-1/2 -translate-y-1/2 w-4 h-12 flex items-center justify-center cursor-ew-resize opacity-0 transition-opacity;
}

.window-node:hover .resize-handle {
  @apply opacity-100;
}

.window-header {
  @apply flex items-center justify-between px-3 py-2 border-b border-slate-50;
}

.window-title {
  @apply text-[9px] font-black tracking-widest uppercase text-slate-400 select-none;
}

.window-content {
  @apply p-4;
}

.action-btn {
  @apply flex items-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-black tracking-widest uppercase transition-all duration-300;
}

.custom-scrollbar::-webkit-scrollbar {
  width: 3px;
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
</style>
