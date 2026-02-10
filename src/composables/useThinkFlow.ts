/**
 * ThinkFlow 核心业务 composable
 * - 统一管理：画布状态（节点/边）、交互状态、API 调用、错误处理与导出能力
 * - 对外提供：页面与组件可直接调用的状态与动作（expand / deepDive / image / summary 等）
 */

import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  toRaw,
  watch,
  type Ref,
} from "vue";
import { MarkerType, Position, useVueFlow } from "@vue-flow/core";
import { BackgroundVariant } from "@vue-flow/background";
import { DEFAULT_CONFIG, API_KEY } from "../services/config";
import MarkdownIt from "markdown-it";

/**
 * i18n 翻译函数类型（等价于 vue-i18n 的 t）
 */
type Translate = (key: string, params?: any) => string;

/**
 * 工具函数：清理节点数据以供 localStorage 存储
 * 移除 imageUrl 字段以节省空间，图片数据仅由云端保存
 */
const sanitizeNodesForLocalStorage = (nodes: any[]) => {
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      imageUrl: undefined, // 移除图片数据
    },
  }));
};

/**
 * 工具函数：清理文件名，移除不合法字符
 */
const sanitizeFilename = (name: string) => {
  return (name || "untitled")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");
};

/**
 * 创建 ThinkFlow 的业务上下文。
 * @param t 国际化翻译函数
 * @param locale 当前语言（用于持久化语言选择）
 */
export function useThinkFlow({
  t,
  locale,
}: {
  t: Translate;
  locale: Ref<string>;
}) {
  /**
   * API 配置（支持默认/自定义两种模式）
   * - 自定义模式写入 localStorage，刷新后仍保留
   */
  const apiConfig = reactive({
    mode: localStorage.getItem("api_mode") || "default",
    chat: {
      baseUrl: localStorage.getItem("chat_baseUrl") || "",
      model: localStorage.getItem("chat_model") || "",
      apiKey: localStorage.getItem("chat_apiKey") || "",
    },
    image: {
      baseUrl: localStorage.getItem("image_baseUrl") || "",
      model: localStorage.getItem("image_model") || "",
      apiKey: localStorage.getItem("image_apiKey") || "",
    },
  });

  /**
   * 语言选择持久化（与 i18n/index.ts 中的初始化配合）
   */
  watch(
    () => locale.value,
    (newVal) => {
      localStorage.setItem("language", newVal);
    },
  );

  /**
   * API 配置持久化：任何字段变化都会更新 localStorage
   */
  watch(
    () => apiConfig,
    (newVal) => {
      localStorage.setItem("api_mode", newVal.mode);
      localStorage.setItem("chat_baseUrl", newVal.chat.baseUrl);
      localStorage.setItem("chat_model", newVal.chat.model);
      localStorage.setItem("chat_apiKey", newVal.chat.apiKey);
      localStorage.setItem("image_baseUrl", newVal.image.baseUrl);
      localStorage.setItem("image_model", newVal.image.model);
      localStorage.setItem("image_apiKey", newVal.image.apiKey);
    },
    { deep: true },
  );

  /**
   * 设置弹窗开关（由顶部导航触发）
   */
  const showSettings = ref(false);

  /**
   * VueFlow 实例能力集合：节点/边增删改与视图控制
   */
  const {
    addNodes,
    addEdges,
    setNodes,
    setEdges,
    nodes: flowNodes,
    edges: flowEdges,
    updateNode,
    removeNodes,
    removeEdges,
    fitView,
    viewport,
    onNodeDragStart,
    onNodeDrag,
    onNodeDragStop,
    project,
  } = useVueFlow();

  /**
   * 全局输入与对话状态
   */
  const ideaInput = ref("");
  const isLoading = ref(false);
  const previewImageUrl = ref<string | null>(null);
  const showResetConfirm = ref(false);
  const showSummaryModal = ref(false);
  const isSummarizing = ref(false);
  const summaryContent = ref("");

  /**
   * AI 思考风格
   * - creative: 发散模式 (默认)
   * - precise: 严谨模式
   */
  const aiStyle = ref(localStorage.getItem("ai_style") || "creative");

  watch(aiStyle, (val) => {
    localStorage.setItem("ai_style", val);
  });

  /**
   * 演示模式状态
   */
  const isPresenting = ref(false);
  const presentationIndex = ref(-1);
  const presentationNodes = ref<string[]>([]); // 存储排序后的节点ID列表

  /**
   * 计算演示模式的节点逻辑顺序 (DFS + Y轴排序)
   * 规则：
   * 1. 从根节点开始
   * 2. 深度优先遍历
   * 3. 同级节点按 Y 轴坐标从上到下排序
   * 4. 孤立节点按 Y 轴排序追加在其后
   */
  const getPresentationOrder = (): string[] => {
    const nodes = flowNodes.value;
    const edges = flowEdges.value;
    if (nodes.length === 0) return [];

    // 1. 构建邻接表
    const childrenMap = new Map<string, string[]>();
    // 记录所有作为 target 的节点，用于寻找根
    const targetNodeIds = new Set<string>();

    edges.forEach((edge) => {
      if (!childrenMap.has(edge.source)) {
        childrenMap.set(edge.source, []);
      }
      childrenMap.get(edge.source)!.push(edge.target);
      targetNodeIds.add(edge.target);
    });

    // 2. 寻找根节点 (type === 'root' 或 没有入边的节点)
    // 优先处理明确标记为 root 的节点
    let rootNodes = nodes.filter(
      (n) => n.data.type === "root" || n.id.startsWith("root"),
    );

    // 如果没有明确的 root，则寻找没有入边的节点
    if (rootNodes.length === 0) {
      rootNodes = nodes.filter((n) => !targetNodeIds.has(n.id));
    }

    // 对根节点也按 Y 轴排序
    rootNodes.sort((a, b) => a.position.y - b.position.y);

    // 记录已访问节点，防止循环引用
    const visited = new Set<string>();
    const sortedIds: string[] = [];

    const dfs = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      sortedIds.push(nodeId);

      const childrenIds = childrenMap.get(nodeId) || [];
      if (childrenIds.length > 0) {
        // 获取子节点实例并按 Y 轴排序
        const children = childrenIds
          .map((id) => nodes.find((n) => n.id === id))
          .filter((n): n is (typeof nodes)[0] => !!n) // 过滤掉找不到的
          .sort((a, b) => a.position.y - b.position.y);

        children.forEach((child) => dfs(child.id));
      }
    };

    // 3. 从每个根开始 DFS
    rootNodes.forEach((root) => dfs(root.id));

    // 4. 处理孤立/未连接的节点 (如果有漏网之鱼)
    if (visited.size < nodes.length) {
      const remainingNodes = nodes
        .filter((n) => !visited.has(n.id))
        .sort((a, b) => a.position.y - b.position.y);
      remainingNodes.forEach((n) => sortedIds.push(n.id));
    }

    return sortedIds;
  };

  /**
   * 搜索状态
   */
  const searchQuery = ref("");
  const searchResults = computed(() => {
    if (!searchQuery.value.trim()) return [];
    const q = searchQuery.value.toLowerCase();
    return flowNodes.value.filter(
      (n) =>
        n.data.label?.toLowerCase().includes(q) ||
        n.data.description?.toLowerCase().includes(q),
    );
  });

  const focusNode = (nodeId: string) => {
    const node = flowNodes.value.find((n) => n.id === nodeId);
    if (node) {
      setNodes(
        flowNodes.value.map((n) => ({ ...n, selected: n.id === nodeId })),
      );
      fitView({ nodes: [nodeId], padding: 2, duration: 800 });
    }
  };

  const nextPresentationNode = () => {
    if (presentationNodes.value.length === 0) return;
    presentationIndex.value =
      (presentationIndex.value + 1) % presentationNodes.value.length;
    focusNode(presentationNodes.value[presentationIndex.value]);
  };

  const prevPresentationNode = () => {
    if (presentationNodes.value.length === 0) return;
    presentationIndex.value =
      (presentationIndex.value - 1 + presentationNodes.value.length) %
      presentationNodes.value.length;
    focusNode(presentationNodes.value[presentationIndex.value]);
  };

  const togglePresentation = () => {
    isPresenting.value = !isPresenting.value;
    if (isPresenting.value) {
      // 进入演示模式：计算排序
      presentationNodes.value = getPresentationOrder();
      presentationIndex.value = 0;

      if (presentationNodes.value.length > 0) {
        focusNode(presentationNodes.value[0]);
      }
    } else {
      presentationIndex.value = -1;
      presentationNodes.value = [];
    }
  };

  const draggingNodeId = ref<string | null>(null);
  const dragLastPositionByNodeId = new Map<string, { x: number; y: number }>();
  const alignmentGuides = ref<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  /**
   * 交互：按住 Space 启用“抓手拖拽画布”
   * - isSpacePressed 用于在 UI 层展示手型光标
   * - panOnDrag 控制 VueFlow 的拖拽行为（按 Space 时总是允许拖拽画布）
   */
  const panOnDrag = ref(true);
  const isSpacePressed = ref(false);

  window.addEventListener("keydown", (e) => {
    if (
      e.code === "Space" &&
      !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)
    ) {
      isSpacePressed.value = true;
      panOnDrag.value = true;
    }
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "Space") {
      isSpacePressed.value = false;
    }
  });

  /**
   * 用拖拽节点作为“当前激活节点”的一种来源，便于高亮路径/聚焦
   */
  onNodeDragStart((e) => {
    draggingNodeId.value = e.node.id;
    dragLastPositionByNodeId.set(e.node.id, {
      x: e.node.position.x,
      y: e.node.position.y,
    });
  });

  /**
   * 处理节点拖拽事件 (联动移动子节点)
   */
  const handleNodeDrag = (payload: any) => {
    const node = payload?.node ?? payload;
    if (!node?.id || !node?.position) return;

    const draggedStoreNode = flowNodes.value.find((n) => n.id === node.id);
    if (!draggedStoreNode) return;

    if (config.snapToAlignment) {
      const snapThreshold = 8;

      const getNodeVisualInfo = (
        n: any,
        currentPos?: { x: number; y: number },
      ) => {
        const width = n.dimensions?.width ?? n.measured?.width ?? 280;
        const height = n.dimensions?.height ?? n.measured?.height ?? 180;

        // 核心逻辑：计算视觉缩放比例，与 WindowNode.vue 中的逻辑保持一致
        let scale = 1.0;
        if (activeNodeId.value) {
          if (activePath.value.nodeIds.has(n.id)) {
            // 在拖拽或处于活跃路径时，节点会放大 1.05
            // 注意：WindowNode 中 focus 时是 1.1，但拖拽时通常 input 不会处于 focus 状态
            scale = 1.05;
          } else {
            // 非活跃路径节点会缩小并变淡
            scale = 0.98;
          }
        }

        const x = currentPos?.x ?? n.position.x;
        const y = currentPos?.y ?? n.position.y;

        // 因为 CSS transform: scale 默认是从中心缩放，所以视觉上的起始点 (top-left) 会发生偏移
        const visualWidth = width * scale;
        const visualHeight = height * scale;
        const offsetX = (visualWidth - width) / 2;
        const offsetY = (visualHeight - height) / 2;

        return {
          width: visualWidth,
          height: visualHeight,
          x: x - offsetX,
          y: y - offsetY,
          scale,
        };
      };

      const draggedInfo = getNodeVisualInfo(draggedStoreNode, {
        x: node.position.x,
        y: node.position.y,
      });
      const proposedX = node.position.x;
      const proposedY = node.position.y;

      // 使用视觉坐标进行对齐计算
      const draggedAnchorsX = [
        draggedInfo.x,
        draggedInfo.x + draggedInfo.width / 2,
        draggedInfo.x + draggedInfo.width,
      ];
      const draggedAnchorsY = [
        draggedInfo.y,
        draggedInfo.y + draggedInfo.height / 2,
        draggedInfo.y + draggedInfo.height,
      ];

      let bestX: { delta: number; guide: number } | null = null;
      let bestY: { delta: number; guide: number } | null = null;

      for (const other of flowNodes.value) {
        if (other.id === node.id) continue;
        if (other.hidden) continue;

        const otherInfo = getNodeVisualInfo(other);
        const otherAnchorsX = [
          otherInfo.x,
          otherInfo.x + otherInfo.width / 2,
          otherInfo.x + otherInfo.width,
        ];
        const otherAnchorsY = [
          otherInfo.y,
          otherInfo.y + otherInfo.height / 2,
          otherInfo.y + otherInfo.height,
        ];

        for (const ox of otherAnchorsX) {
          for (const ax of draggedAnchorsX) {
            const delta = ox - ax;
            const absDelta = Math.abs(delta);
            if (
              absDelta <= snapThreshold &&
              (!bestX || absDelta < Math.abs(bestX.delta))
            ) {
              bestX = { delta, guide: ox };
            }
          }
        }

        for (const oy of otherAnchorsY) {
          for (const ay of draggedAnchorsY) {
            const delta = oy - ay;
            const absDelta = Math.abs(delta);
            if (
              absDelta <= snapThreshold &&
              (!bestY || absDelta < Math.abs(bestY.delta))
            ) {
              bestY = { delta, guide: oy };
            }
          }
        }
      }

      const snappedX = bestX ? proposedX + bestX.delta : proposedX;
      const snappedY = bestY ? proposedY + bestY.delta : proposedY;

      alignmentGuides.value = config.showAlignmentGuides
        ? { x: bestX?.guide ?? null, y: bestY?.guide ?? null }
        : { x: null, y: null };

      if (snappedX !== proposedX || snappedY !== proposedY) {
        draggedStoreNode.position = { x: snappedX, y: snappedY };
        node.position = { x: snappedX, y: snappedY };
      }
    } else {
      alignmentGuides.value = { x: null, y: null };
    }

    if (!config.hierarchicalDragging) return;

    const lastPosition = dragLastPositionByNodeId.get(node.id);
    if (!lastPosition) {
      const fallbackDelta = payload?.delta;
      dragLastPositionByNodeId.set(node.id, {
        x: node.position.x,
        y: node.position.y,
      });
      if (
        fallbackDelta &&
        typeof fallbackDelta.x === "number" &&
        typeof fallbackDelta.y === "number"
      ) {
        const descendantIds = getDescendantIds(node.id);
        if (descendantIds.size === 0) return;

        const selectedNodeIds = new Set(
          flowNodes.value.filter((n) => n.selected).map((n) => n.id),
        );
        descendantIds.forEach((id) => {
          if (!selectedNodeIds.has(id)) {
            const targetNode = flowNodes.value.find((n) => n.id === id);
            if (targetNode) {
              targetNode.position = {
                x: targetNode.position.x + fallbackDelta.x,
                y: targetNode.position.y + fallbackDelta.y,
              };
            }
          }
        });
      }
      return;
    }

    const dx = node.position.x - lastPosition.x;
    const dy = node.position.y - lastPosition.y;
    if (dx === 0 && dy === 0) return;

    dragLastPositionByNodeId.set(node.id, {
      x: node.position.x,
      y: node.position.y,
    });

    const descendantIds = getDescendantIds(node.id);
    if (descendantIds.size === 0) return;

    // 获取当前所有选中的节点，避免重复位移
    const selectedNodeIds = new Set(
      flowNodes.value.filter((n) => n.selected).map((n) => n.id),
    );

    // 批量更新子节点位置
    descendantIds.forEach((id) => {
      if (!selectedNodeIds.has(id)) {
        const targetNode = flowNodes.value.find((n) => n.id === id);
        if (targetNode) {
          // 直接更新位置对象，确保 Vue 能够检测到深层变化
          targetNode.position = {
            x: targetNode.position.x + dx,
            y: targetNode.position.y + dy,
          };
        }
      }
    });
  };

  onNodeDrag(handleNodeDrag);

  onNodeDragStop((e) => {
    draggingNodeId.value = null;
    if (e?.node?.id) {
      dragLastPositionByNodeId.delete(e.node.id);
    }
    alignmentGuides.value = { x: null, y: null };
  });

  /**
   * 当前激活节点 id
   * 优先级：选中的节点 > 正在展开的节点 > 正在拖拽的节点
   * 改动原因：允许用户在 expanding 期间点击其他节点切换面板
   */
  const activeNodeId = computed(() => {
    const selectedNode = flowNodes.value.find((n) => n.selected);
    const expandingNode = flowNodes.value.find((n) => n.data.isExpanding);
    return selectedNode?.id || expandingNode?.id || draggingNodeId.value;
  });

  /**
   * 节点选中监听：打开/切换节点详情面板
   * - 锁定模式下不自动切换
   * - 取消选中时自动收起面板
   */
  watch(
    () => activeNodeId.value,
    (newId, oldId) => {
      // 点击空白处（newId 为 null）时，不关闭面板，保留显示上一个选中节点的内容
      if (!newId) return;

      if (isDetailPanelLocked.value && oldId) return;

      selectedNodeForPanel.value = newId;
      activeRightPanel.value = "nodeDetail";
    },
  );

  /**
   * 获取节点的所有后代节点 ID (迭代实现，更健壮)
   */
  const getDescendantIds = (nodeId: string): Set<string> => {
    const descendants = new Set<string>();
    const stack = [nodeId];
    const edges = flowEdges.value;

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      for (const edge of edges) {
        if (edge.source === currentId) {
          if (!descendants.has(edge.target)) {
            descendants.add(edge.target);
            stack.push(edge.target);
          }
        }
      }
    }
    return descendants;
  };

  /**
   * 删除指定节点的所有后代节点
   * 用于在重新扩展某个节点时，清空其原有的子树
   */
  const removeDescendants = (nodeId: string) => {
    const descendantIds = getDescendantIds(nodeId);
    if (descendantIds.size > 0) {
      removeNodes(Array.from(descendantIds));
    }
  };

  /**
   * 删除指定节点及其所有后代节点
   * 用于用户手动删除子节点
   */
  const deleteNode = async (nodeId: string) => {
    // 不允许删除根节点
    const node = flowNodes.value.find((n) => n.id === nodeId);
    if (!node || node.data.type === "root" || node.id.startsWith("root"))
      return;

    // 先删除所有后代节点
    removeDescendants(nodeId);
    // 再删除自身
    removeNodes([nodeId]);

    if (selectedNodeForPanel.value === nodeId) {
      selectedNodeForPanel.value = null;
      if (activeRightPanel.value === "nodeDetail") {
        activeRightPanel.value = "none";
      }
    }

    // 关键：立即保存到云端（删除操作）
    await immediateCloudSave();
  };

  /**
   * 当前激活路径（节点集合 + 边集合）
   * - 向上：从激活节点回溯到根
   * - 向下：包含激活节点的所有后代
   * 用于：
   * - 节点高亮/弱化
   * - 边高亮/动画
   */
  const activePath = computed(() => {
    const nodeIds = new Set<string>();
    const edgeIds = new Set<string>();

    if (!activeNodeId.value) return { nodeIds, edgeIds };

    const targetId = activeNodeId.value;
    nodeIds.add(targetId);

    let currentId = targetId;
    while (currentId) {
      const edge = flowEdges.value.find((e) => e.target === currentId);
      if (edge) {
        edgeIds.add(edge.id);
        nodeIds.add(edge.source);
        currentId = edge.source;
      } else {
        break;
      }
    }

    const descendantIds = getDescendantIds(targetId);
    descendantIds.forEach((id) => nodeIds.add(id));

    flowEdges.value.forEach((edge) => {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        edgeIds.add(edge.id);
      }
    });

    return { nodeIds, edgeIds };
  });

  const savedConfig = localStorage.getItem("thinkflow_config");
  const config = reactive(
    savedConfig
      ? JSON.parse(savedConfig)
      : {
          edgeColor: "#fed7aa",
          edgeType: "default",
          backgroundVariant: BackgroundVariant.Lines,
          showControls: true,
          showMiniMap: true,
          hierarchicalDragging: false,
          snapToGrid: true,
          snapGrid: [16, 16] as [number, number],
          snapToAlignment: true,
          showAlignmentGuides: true,
        },
  );

  const collapsedNodeIds = ref<string[]>([]);
  const isInitialLoad = ref(true);
  const showIdeaInput = ref(false); // 显示想法输入框（新项目时）

  // 云存储同步
  const cloudSyncEnabled = ref(false);
  let debouncedCloudSave: (() => void) | null = null;
  let saveToCloudFn: ((nodes: any[], edges: any[]) => Promise<void>) | null =
    null;

  /**
   * 初始化云存储同步
   * 使用 3 秒防抖避免频繁 API 调用
   */
  const initCloudSync = (
    saveToCloud: (nodes: any[], edges: any[]) => Promise<void>,
  ) => {
    cloudSyncEnabled.value = true;
    saveToCloudFn = saveToCloud;

    // 创建防抖保存函数（3秒内多次调用只执行最后一次）
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    debouncedCloudSave = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(async () => {
        if (!saveToCloudFn) return;
        try {
          console.log("[CloudSync] 同步数据到云端...");
          await saveToCloudFn(toRaw(flowNodes.value), toRaw(flowEdges.value));
          console.log("[CloudSync] 同步完成");
        } catch (error) {
          console.error("[CloudSync] 云端同步失败:", error);
        }
      }, 3000); // 3秒防抖
    };
  };

  /**
   * 立即触发云端同步（跳过防抖）
   * 用于关键操作（如生图、回答）完成后立即保存，防止刷新丢失
   */
  const immediateCloudSave = async () => {
    if (cloudSyncEnabled.value && saveToCloudFn) {
      try {
        console.log("[CloudSync] 立即同步数据到云端...");
        await saveToCloudFn(toRaw(flowNodes.value), toRaw(flowEdges.value));
        console.log("[CloudSync] 立即同步完成");
      } catch (error) {
        console.error("[CloudSync] 立即同步失败:", error);
      }
    }
  };

  /**
   * 画布状态持久化 (Nodes, Edges, Collapsed)
   * - 按项目隔离保存到 localStorage
   * - 如启用云存储，同时防抖同步到云端
   */
  watch(
    [
      () => flowNodes.value,
      () => flowEdges.value,
      () => collapsedNodeIds.value,
    ],
    () => {
      if (isInitialLoad.value) return;

      // 按项目隔离保存到 localStorage
      if (currentProjectId.value) {
        const projectId = currentProjectId.value;
        try {
          localStorage.setItem(
            `thinkflow_${projectId}_nodes`,
            JSON.stringify(
              sanitizeNodesForLocalStorage(toRaw(flowNodes.value)),
            ),
          );
          localStorage.setItem(
            `thinkflow_${projectId}_edges`,
            JSON.stringify(toRaw(flowEdges.value)),
          );
          localStorage.setItem(
            `thinkflow_${projectId}_collapsed`,
            JSON.stringify(toRaw(collapsedNodeIds.value)),
          );
        } catch (error: any) {
          if (error.name === "QuotaExceededError") {
            console.warn("[ThinkFlow] localStorage 存储已满，仅同步到云端");
          } else {
            console.error("[ThinkFlow] 本地存储失败:", error);
          }
        }
      }

      // 如果启用了云存储，触发防抖云端保存
      if (cloudSyncEnabled.value && debouncedCloudSave) {
        debouncedCloudSave();
      }
    },
    { deep: true },
  );

  /**
   * UI 配置持久化
   */
  watch(
    () => config,
    (newConfig) => {
      if (isInitialLoad.value) return;
      localStorage.setItem(
        "thinkflow_config",
        JSON.stringify(toRaw(newConfig)),
      );
    },
    { deep: true },
  );

  /**
   * 监听连线类型配置变化，实时更新所有已存在的连线
   */
  watch(
    () => config.edgeType,
    (newType) => {
      if (isInitialLoad.value) return;
      const updatedEdges = flowEdges.value.map((edge) => ({
        ...edge,
        type: newType,
      }));
      setEdges(updatedEdges);
    },
  );

  /**
   * 监听连线颜色配置变化，实时更新所有已存在的连线
   */
  watch(
    () => config.edgeColor,
    (newColor) => {
      if (isInitialLoad.value) return;
      const updatedEdges = flowEdges.value.map((edge) => ({
        ...edge,
        style: { ...edge.style, stroke: newColor },
      }));
      setEdges(updatedEdges);
    },
  );

  /**
   * 初始化时从本地存储恢复状态
   */
  onMounted(async () => {
    // 优先读取项目隔离的数据（游客模式或已登录用户）
    let savedNodes: string | null = null;
    let savedEdges: string | null = null;
    let savedCollapsed: string | null = null;

    if (currentProjectId.value) {
      // 有项目ID（游客或已登录），读取项目隔离数据
      const projectId = currentProjectId.value;
      savedNodes = localStorage.getItem(`thinkflow_${projectId}_nodes`);
      savedEdges = localStorage.getItem(`thinkflow_${projectId}_edges`);
      savedCollapsed = localStorage.getItem(`thinkflow_${projectId}_collapsed`);
      console.log(`[ThinkFlow] 尝试从项目 ${projectId} 恢复数据`);
    } else {
      // 兼容旧版本：读取非项目隔离的数据
      savedNodes = localStorage.getItem("thinkflow_nodes");
      savedEdges = localStorage.getItem("thinkflow_edges");
      savedCollapsed = localStorage.getItem("thinkflow_collapsed");
      console.log("[ThinkFlow] 尝试从旧版格式恢复数据");
    }

    if (savedNodes && savedEdges) {
      try {
        const nodes = JSON.parse(savedNodes);
        const edges = JSON.parse(savedEdges);
        const collapsed = savedCollapsed ? JSON.parse(savedCollapsed) : [];

        if (nodes.length > 0) {
          // 必须先清空当前可能存在的默认节点（如果有）
          setNodes([]);
          setEdges([]);

          await nextTick();

          // 恢复节点和边
          // 修复：重置所有临时状态，防止刷新后停留在“生成中”
          const sanitizedNodes = nodes.map((n: any) => ({
            ...n,
            data: {
              ...n.data,
              imageUrl: null, // localStorage 不含图片，从云端恢复时再加载
              isImageLoading: false,
              isExpanding: false,
              isDeepDiving: false,
              isGeneratingQuestions: false,
            },
          }));
          setNodes(sanitizedNodes);
          setEdges(edges);
          collapsedNodeIds.value = collapsed;

          console.log(`[ThinkFlow] 成功恢复 ${nodes.length} 个节点`);

          // 恢复后自适应一次视图
          setTimeout(() => {
            fitView({ padding: 0.2, duration: 800 });
          }, 150);
        }
      } catch (e) {
        console.error("[ThinkFlow] 恢复状态失败:", e);
      }
    } else {
      console.log("[ThinkFlow] 未找到可恢复的数据");
    }

    // 确保在所有初始化操作（包括可能的 setNodes）完成后再开启保存
    await nextTick();
    setTimeout(() => {
      isInitialLoad.value = false;
      // 若画布无节点，展开输入框供用户首次输入
      if (flowNodes.value.length === 0) {
        showIdeaInput.value = true;
      }
    }, 300);
  });

  const isSubtreeCollapsed = (nodeId: string) =>
    collapsedNodeIds.value.includes(nodeId);

  const toggleSubtreeCollapse = (nodeId: string) => {
    if (isSubtreeCollapsed(nodeId)) {
      collapsedNodeIds.value = collapsedNodeIds.value.filter(
        (id) => id !== nodeId,
      );
    } else {
      collapsedNodeIds.value = [...collapsedNodeIds.value, nodeId];
    }
  };

  // 当前项目 ID（用于 localStorage 隔离）
  const currentProjectId = ref<string | null>(null);

  // 游客模式默认项目ID初始化
  // 确保游客也有projectId，使持久化逻辑正常工作
  if (!currentProjectId.value) {
    const guestProjectId = localStorage.getItem("thinkflow_guest_project_id");
    if (guestProjectId) {
      currentProjectId.value = guestProjectId;
      console.log(`[ThinkFlow] 恢复游客项目ID: ${guestProjectId}`);
    } else {
      // 为游客生成唯一项目ID
      const newGuestId = `guest-${Date.now()}`;
      currentProjectId.value = newGuestId;
      localStorage.setItem("thinkflow_guest_project_id", newGuestId);
      console.log(`[ThinkFlow] 创建游客项目ID: ${newGuestId}`);
    }
  }

  /**
   * 清空画布
   */
  const clearCanvas = async () => {
    setNodes([]);
    setEdges([]);
    collapsedNodeIds.value = [];
    await nextTick();
  };

  /**
   * 创建默认根节点
   */
  const createDefaultRoot = () => {
    const rootNode = {
      id: "root",
      type: "window",
      position: { x: 400, y: 100 },
      data: {
        label: t("node.mainTitle"),
        title: t("node.mainTitle"),
        description: "",
        detailedContent: "",
        imageUrl: null,
        childrenCount: 0,
        isExpanding: false,
        followUp: "",
        type: "root",
      },
    };
    setNodes([rootNode]);
    setEdges([]);
    collapsedNodeIds.value = [];
  };

  /**
   * 加载项目数据
   * @param projectId 项目 ID
   * @param loadFromCloudFn 从云端加载的函数
   */
  const loadProjectData = async (
    projectId: string,
    loadFromCloudFn: (
      id: string,
    ) => Promise<{ nodes: any[]; edges: any[] } | null>,
  ) => {
    console.log(`[ThinkFlow] 加载项目: ${projectId}`);

    // 切换项目前先将 currentProjectId 置空，防止 clearCanvas 触发 watch 保存空数据到旧项目
    const previousProjectId = currentProjectId.value;
    currentProjectId.value = null;

    // 清空画布，防止旧数据残留
    await clearCanvas();

    // 清理旧项目缓存（仅保留当前项目缓存，避免 localStorage 溢出）
    if (previousProjectId && previousProjectId !== projectId) {
      localStorage.removeItem(`thinkflow_${previousProjectId}_nodes`);
      localStorage.removeItem(`thinkflow_${previousProjectId}_edges`);
      localStorage.removeItem(`thinkflow_${previousProjectId}_collapsed`);
      console.log(`[ThinkFlow] 已清理旧项目缓存: ${previousProjectId}`);
    }

    // 清除旧版通用缓存（非项目隔离的遗留数据）
    localStorage.removeItem("thinkflow_nodes");
    localStorage.removeItem("thinkflow_edges");
    localStorage.removeItem("thinkflow_collapsed");

    // 更新当前项目 ID
    currentProjectId.value = projectId;
    localStorage.setItem("thinkflow_current_project_id", projectId);

    // 云端优先策略：直接从云端加载，避免 localStorage 缓存满时的问题
    const cloudData = await loadFromCloudFn(projectId);

    if (cloudData && cloudData.nodes.length > 0) {
      await clearCanvas();
      // 修复：重置所有临时状态
      const sanitizedNodes = cloudData.nodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          isImageLoading: false,
          isExpanding: false,
          isDeepDiving: false,
          isGeneratingQuestions: false,
        },
      }));
      setNodes(sanitizedNodes);
      setEdges(cloudData.edges);
      collapsedNodeIds.value = [];
      showIdeaInput.value = false; // 有数据则收起输入框
      console.log(`[ThinkFlow] 从云端加载 ${cloudData.nodes.length} 个节点`);

      // 缓存到 localStorage
      localStorage.setItem(
        `thinkflow_${projectId}_nodes`,
        JSON.stringify(sanitizeNodesForLocalStorage(cloudData.nodes)),
      );
      localStorage.setItem(
        `thinkflow_${projectId}_edges`,
        JSON.stringify(cloudData.edges),
      );

      setTimeout(() => {
        fitView({ padding: 0.2, duration: 500 });
      }, 100);
    } else {
      // 云端也没有数据，显示想法输入界面（产品核心机制）
      console.log("[ThinkFlow] 项目无数据，展示想法输入框");
      await clearCanvas();
      showIdeaInput.value = true;
    }
  };

  /**
   * 保存当前项目到 localStorage（按项目隔离）
   */
  const saveToLocalStorage = () => {
    if (!currentProjectId.value) return;

    const projectId = currentProjectId.value;
    try {
      localStorage.setItem(
        `thinkflow_${projectId}_nodes`,
        JSON.stringify(sanitizeNodesForLocalStorage(toRaw(flowNodes.value))),
      );
      localStorage.setItem(
        `thinkflow_${projectId}_edges`,
        JSON.stringify(toRaw(flowEdges.value)),
      );
      localStorage.setItem(
        `thinkflow_${projectId}_collapsed`,
        JSON.stringify(toRaw(collapsedNodeIds.value)),
      );
    } catch (error: any) {
      if (error.name === "QuotaExceededError") {
        console.warn("[ThinkFlow] localStorage 存储已满");
      } else {
        console.error("[ThinkFlow] 本地存储失败:", error);
      }
    }
  };

  const applyCollapsedVisibility = () => {
    const hiddenIds = new Set<string>();
    const childrenCountById = new Map<string, number>();

    for (const e of flowEdges.value) {
      childrenCountById.set(
        e.source,
        (childrenCountById.get(e.source) ?? 0) + 1,
      );
    }

    for (const id of collapsedNodeIds.value) {
      const descendants = getDescendantIds(id);
      descendants.forEach((d) => hiddenIds.add(d));
    }

    setNodes(
      flowNodes.value.map((n) => {
        const isHidden = hiddenIds.has(n.id);
        const isCollapsed = isSubtreeCollapsed(n.id);
        const hiddenDescendantCount = isCollapsed
          ? getDescendantIds(n.id).size
          : 0;
        const childrenCount = childrenCountById.get(n.id) ?? 0;
        const nextData =
          n.data?.hiddenDescendantCount !== hiddenDescendantCount ||
          n.data?.childrenCount !== childrenCount
            ? { ...n.data, hiddenDescendantCount, childrenCount }
            : n.data;

        return {
          ...n,
          hidden: isHidden,
          data: nextData,
        };
      }),
    );

    setEdges(
      flowEdges.value.map((e) => ({
        ...e,
        hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target),
      })),
    );
  };

  watch(
    [
      () => collapsedNodeIds.value.join(","),
      () => flowNodes.value.length,
      () => flowEdges.value.length,
    ],
    applyCollapsedVisibility,
    { immediate: true },
  );

  const lastAppliedStatus = ref("");

  /**
   * 根据激活路径与配置，动态更新边的样式（高亮/透明度/动画）
   * - 通过 lastAppliedStatus 避免无效重复 setEdges
   */
  watch(
    [
      () => activeNodeId.value,
      () => config.edgeColor,
      () => config.edgeType,
      () => flowEdges.value.length,
      () => flowNodes.value.some((n) => n.data.isExpanding),
    ],
    ([, newColor, newType, , anyExpanding]) => {
      const { edgeIds } = activePath.value;
      const edgeIdsStr = Array.from(edgeIds).sort().join(",");

      const currentStatus = `${edgeIdsStr}-${newColor}-${newType}-${anyExpanding}`;
      if (lastAppliedStatus.value === currentStatus) return;
      lastAppliedStatus.value = currentStatus;

      setEdges(
        flowEdges.value.map((edge) => {
          const isHighlighted = edgeIds.has(edge.id);
          const isExpanding = !!flowNodes.value.find(
            (n) => n.id === edge.source,
          )?.data.isExpanding;

          return {
            ...edge,
            type: newType,
            animated: isHighlighted || isExpanding,
            style: {
              ...edge.style,
              stroke: isHighlighted ? newColor : `${newColor}33`,
              strokeWidth: isHighlighted ? 3 : 2,
              transition: "all 0.3s ease",
            },
          };
        }),
      );
    },
    { immediate: true },
  );

  /**
   * 将网络/接口异常转换为用户可读的错误文案
   */
  const getErrorMessage = (error: any) => {
    if (error.name === "TypeError" && error.message === "Failed to fetch") {
      return t("common.error.cors");
    }
    if (error.status === 429) return t("common.error.rateLimit");
    if (error.status === 400) return t("common.error.badRequest");
    if (error.status >= 500) return t("common.error.serverError");
    return error.message || t("common.error.unknown");
  };

  /**
   * 视图：将根节点居中显示
   */
  const centerRoot = () => {
    const rootNode = flowNodes.value.find(
      (n) => n.id.startsWith("root") || n.data.type === "root",
    );
    if (rootNode) {
      fitView({ nodes: [rootNode.id], padding: 2, duration: 800 });
    }
  };

  /**
   * 布局：从根节点开始按“横向树形”重新排布节点位置
   * - 动态计算节点宽高与子树高度，确保在节点展开（回答/生图）后仍能整齐排布
   */
  const resetLayout = () => {
    const rootNode = flowNodes.value.find(
      (n) => n.id.startsWith("root") || n.data.type === "root",
    );
    if (!rootNode) return;

    const nodeGapX = 150; // 节点层级间的横向间距
    const nodeGapY = 40; // 同级节点间的纵向间距

    /**
     * 获取节点的实际尺寸，优先使用已测量尺寸，否则使用默认值
     */
    const getNodeSize = (node: any) => ({
      width: node.dimensions?.width ?? node.measured?.width ?? 280,
      height: node.dimensions?.height ?? node.measured?.height ?? 180,
    });

    // 存储每个节点及其子树所需的总高度
    const subtreeHeights = new Map<string, number>();

    /**
     * 第一遍遍历：递归计算每个节点及其子树占用的总高度
     */
    const calculateSubtreeHeight = (nodeId: string): number => {
      const node = flowNodes.value.find((n) => n.id === nodeId);
      if (!node || node.hidden) return 0;

      const size = getNodeSize(node);
      const children = flowEdges.value
        .filter((e) => e.source === nodeId)
        .map((e) => e.target)
        .filter((id) => {
          const childNode = flowNodes.value.find((n) => n.id === id);
          return childNode && !childNode.hidden;
        });

      if (children.length === 0) {
        subtreeHeights.set(nodeId, size.height);
        return size.height;
      }

      let childrenTotalHeight = 0;
      children.forEach((childId, index) => {
        childrenTotalHeight += calculateSubtreeHeight(childId);
        if (index < children.length - 1) {
          childrenTotalHeight += nodeGapY;
        }
      });

      // 节点自身高度与子树高度取较大值
      const totalHeight = Math.max(size.height, childrenTotalHeight);
      subtreeHeights.set(nodeId, totalHeight);
      return totalHeight;
    };

    // 开始计算
    calculateSubtreeHeight(rootNode.id);

    const visited = new Set<string>();

    /**
     * 第二遍遍历：根据计算出的子树高度，递归设置节点位置
     * @param nodeId 当前节点 ID
     * @param x 当前起始 X 坐标
     * @param ySubtreeTop 当前子树顶部的 Y 坐标
     */
    const layoutNode = (nodeId: string, x: number, ySubtreeTop: number) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = flowNodes.value.find((n) => n.id === nodeId);
      if (!node || node.hidden) return;

      const size = getNodeSize(node);
      const subtreeHeight = subtreeHeights.get(nodeId) || size.height;

      // 将节点放置在子树区域的垂直中心
      node.position = {
        x,
        y: ySubtreeTop + (subtreeHeight - size.height) / 2,
      };

      const children = flowEdges.value
        .filter((e) => e.source === nodeId)
        .map((e) => e.target)
        .filter((id) => {
          const childNode = flowNodes.value.find((n) => n.id === id);
          return childNode && !childNode.hidden;
        });

      if (children.length > 0) {
        const nextX = x + size.width + nodeGapX;
        let currentY = ySubtreeTop;

        children.forEach((childId) => {
          const childSubtreeHeight = subtreeHeights.get(childId) || 0;
          layoutNode(childId, nextX, currentY);
          currentY += childSubtreeHeight + nodeGapY;
        });
      }
    };

    // 从根节点开始排版
    layoutNode(rootNode.id, 50, 100);

    // 延迟执行 fitView 确保位置更新已应用
    setTimeout(() => {
      fitView({ padding: 0.2, duration: 800 });
    }, 100);
  };

  /**
   * 导出：将当前树形结构导出为 Markdown
   * - 以 root 为标题
   * - 子节点按缩进列表输出
   * - 回答内容（deepDive）以引用块输出
   * - 节点描述（description）紧随标题输出
   */
  const exportMarkdown = () => {
    if (flowNodes.value.length === 0) return;

    const rootNode = flowNodes.value.find(
      (n) => n.id.startsWith("root") || n.data.type === "root",
    );
    if (!rootNode) return;

    let markdown = `# ${rootNode.data.label}\n\n`;

    if (rootNode.data.description) {
      markdown += `> ${rootNode.data.description}\n\n`;
    }

    if (rootNode.data.detailedContent) {
      markdown += `## ${t("node.deepDive")}\n\n${rootNode.data.detailedContent}\n\n---\n\n`;
    }

    const buildMarkdown = (parentId: string, level: number) => {
      const children = flowEdges.value
        .filter((e) => e.source === parentId)
        .map((e) => flowNodes.value.find((n) => n.id === e.target))
        .filter((n) => n !== undefined);

      children.forEach((child) => {
        const indent = "  ".repeat(level - 1);
        const detailIndent = "  ".repeat(level);

        // 写入节点标题与描述
        markdown += `${indent}- **${child!.data.label}**`;
        if (child!.data.description) {
          markdown += `: ${child!.data.description}`;
        }
        markdown += "\n";

        // 如果有深挖回答，以引用块形式展示
        if (child!.data.detailedContent) {
          markdown += `${detailIndent}> **[${t("node.deepDive")}]**\n`;
          markdown += `${detailIndent}> ${child!.data.detailedContent.replace(/\n/g, `\n${detailIndent}> `)}\n`;
        }

        buildMarkdown(child!.id, level + 1);
      });
    };

    buildMarkdown(rootNode.id, 1);

    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = sanitizeFilename(rootNode.data.label);
    const filename = `omnimind-${safeName}-${Date.now()}.md`;
    console.log("[Export Debug] Generated Markdown filename:", filename);
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 导出：将当前树形结构导出为 HTML
   * - 复用 Markdown 生成逻辑
   * - 使用 markdown-it 转换为 HTML
   */
  const exportHTML = () => {
    if (flowNodes.value.length === 0) return;

    const rootNode = flowNodes.value.find(
      (n) => n.id.startsWith("root") || n.data.type === "root",
    );
    if (!rootNode) return;

    // 复用 Markdown 生成逻辑
    let markdown = `# ${rootNode.data.label}\n\n`;

    if (rootNode.data.description) {
      markdown += `> ${rootNode.data.description}\n\n`;
    }

    if (rootNode.data.detailedContent) {
      markdown += `## ${t("node.deepDive")}\n\n${rootNode.data.detailedContent}\n\n---\n\n`;
    }

    const buildMarkdownContent = (parentId: string, level: number) => {
      const children = flowEdges.value
        .filter((e) => e.source === parentId)
        .map((e) => flowNodes.value.find((n) => n.id === e.target))
        .filter((n) => n !== undefined);

      children.forEach((child) => {
        const indent = "  ".repeat(level - 1);
        const detailIndent = "  ".repeat(level);

        markdown += `${indent}- **${child!.data.label}**`;
        if (child!.data.description) {
          markdown += `: ${child!.data.description}`;
        }
        markdown += "\n";

        if (child!.data.detailedContent) {
          markdown += `${detailIndent}> **[${t("node.deepDive")}]**\n`;
          markdown += `${detailIndent}> ${child!.data.detailedContent.replace(/\n/g, `\n${detailIndent}> `)}\n`;
        }

        buildMarkdownContent(child!.id, level + 1);
      });
    };

    buildMarkdownContent(rootNode.id, 1);

    // 使用 markdown-it 转换
    const md = new MarkdownIt();
    const htmlBody = md.render(markdown);

    // 包装完整 HTML 文档
    const fullHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${rootNode.data.label} - OmniMind</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.8;
      color: #1a1a1a;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 2rem;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: rgba(255, 255, 255, 0.95);
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      padding: 3rem;
    }
    h1 {
      font-size: 2.2rem;
      color: #2d3748;
      margin-bottom: 1.5rem;
      border-bottom: 3px solid #667eea;
      padding-bottom: 0.75rem;
    }
    h2 {
      font-size: 1.5rem;
      color: #4a5568;
      margin-top: 2rem;
      margin-bottom: 1rem;
    }
    p { margin-bottom: 1rem; }
    blockquote {
      border-left: 4px solid #667eea;
      background: #f7fafc;
      padding: 1rem 1.5rem;
      margin: 1rem 0;
      border-radius: 0 8px 8px 0;
      color: #4a5568;
    }
    ul {
      list-style: none;
      padding-left: 1.5rem;
    }
    li {
      position: relative;
      margin-bottom: 0.75rem;
    }
    li::before {
      content: "●";
      color: #667eea;
      font-size: 0.6rem;
      position: absolute;
      left: -1rem;
      top: 0.5rem;
    }
    strong { color: #2d3748; }
    hr {
      border: none;
      height: 1px;
      background: linear-gradient(to right, #667eea, #764ba2);
      margin: 2rem 0;
    }
    .footer {
      text-align: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid #e2e8f0;
      color: #718096;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    ${htmlBody}
    <div class="footer">Generated by OmniMind</div>
  </div>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeName = sanitizeFilename(rootNode.data.label);
    const filename = `omnimind-${safeName}-${Date.now()}.html`;
    console.log("[Export Debug] Generated HTML filename:", filename);
    link.download = filename;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  /**
   * 右侧面板状态管理
   * - 'none': 无面板显示
   * - 'nodeDetail': 节点详情面板
   * - 'graphChat': 图谱对话面板
   * 两个面板互斥，打开一个自动关闭另一个
   */
  type RightPanelType = "none" | "nodeDetail" | "graphChat";
  const activeRightPanel = ref<RightPanelType>("none");

  // 节点详情面板相关状态
  const selectedNodeForPanel = ref<string | null>(null);
  const isDetailPanelLocked = ref(false);

  // 计算属性：各面板是否显示
  const showNodeDetailPanel = computed(
    () => activeRightPanel.value === "nodeDetail",
  );
  const showChatSidebar = computed(
    () => activeRightPanel.value === "graphChat",
  );

  // 当前面板节点的完整数据
  const panelNodeData = computed(() => {
    if (!selectedNodeForPanel.value) return null;
    return flowNodes.value.find((n) => n.id === selectedNodeForPanel.value);
  });

  /**
   * 打开节点详情面板
   */
  const openNodeDetailPanel = (nodeId: string) => {
    selectedNodeForPanel.value = nodeId;
    activeRightPanel.value = "nodeDetail";
  };

  /**
   * 打开图谱对话面板
   */
  const openGraphChat = () => {
    activeRightPanel.value = "graphChat";
  };

  /**
   * 关闭右侧面板
   */
  const closeRightPanel = () => {
    activeRightPanel.value = "none";
  };

  /**
   * 切换面板锁定状态
   */
  const togglePanelLock = () => {
    isDetailPanelLocked.value = !isDetailPanelLocked.value;
  };

  /**
   * 图谱对话状态
   */
  const isChatting = ref(false);
  const graphChatMessages = ref<
    { role: "user" | "assistant"; content: string }[]
  >([]);

  /**
   * 添加便签 (Sticky Note)
   */
  const addStickyNote = (pos?: { x: number; y: number }) => {
    const id = "sticky-" + Date.now();
    const position =
      pos ||
      project({
        x: window.innerWidth / 2 - 100,
        y: window.innerHeight / 2 - 50,
      });

    addNodes({
      id,
      type: "sticky",
      position,
      data: {
        label: "",
        type: "sticky",
      },
    });
  };

  /**
   * 与图谱对话 (Chat with Graph)
   */
  const sendGraphChatMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isChatting.value) return;

    if (activeRightPanel.value !== "graphChat") {
      openGraphChat();
    }

    graphChatMessages.value.push({ role: "user", content: userMessage });
    isChatting.value = true;

    // 构建图谱上下文
    const buildGraphContext = () => {
      const nodesText = flowNodes.value
        .map((n) => {
          if (n.type === "sticky") return `[Note]: ${n.data.label}`;
          return `[Node]: ${n.data.label} - ${n.data.description || ""}`;
        })
        .join("\n");
      return nodesText;
    };

    const graphContext = buildGraphContext();
    const useConfig =
      apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
    const finalApiKey =
      apiConfig.mode === "default"
        ? useConfig.apiKey || API_KEY
        : useConfig.apiKey;

    try {
      const response = await fetch(useConfig.baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${finalApiKey}`,
        },
        body: JSON.stringify({
          model: useConfig.model,
          stream: true,
          messages: [
            {
              role: "system",
              content: `You are an AI assistant helping the user explore their knowledge graph. 
                            The current graph contains the following information:
                            ${graphContext}
                            
                            Please answer the user's questions based on this context. Be concise and insightful.`,
            },
            ...graphChatMessages.value,
          ],
        }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      // 处理流式响应
      const reader = response.body?.getReader();
      if (!reader) throw new Error("ReadableStream not supported");

      const decoder = new TextDecoder("utf-8");
      let assistantMessage = "";

      // 先添加一个空的 assistant 消息占位
      graphChatMessages.value.push({ role: "assistant", content: "" });
      const lastIdx = graphChatMessages.value.length - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") break;

            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content || "";
              if (content) {
                assistantMessage += content;
                graphChatMessages.value[lastIdx].content = assistantMessage;
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Graph Chat Error:", error);
      graphChatMessages.value.push({
        role: "assistant",
        content: `Error: ${getErrorMessage(error)}`,
      });
    } finally {
      isChatting.value = false;
    }
  };

  /**
   * 构建请求头：OpenRouter 需额外添加 HTTP-Referer 与 X-Title
   */
  const buildHeaders = (
    baseUrl: string,
    apiKey: string,
  ): Record<string, string> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (baseUrl.includes("openrouter.ai")) {
      headers["HTTP-Referer"] = window.location.origin;
      headers["X-Title"] = "ThinkFlowAI";
    }
    return headers;
  };

  /**
   * 剥离 Markdown 围栏（```json ... ```），使原始文本可被 JSON.parse
   * 支持流式处理：即使没有结尾围栏，只要有开头也剥离
   */
  const stripJsonFences = (raw: string): string => {
    const trimmed = raw.trim();
    // 匹配开头
    const startMatch = trimmed.match(/^```(?:json)?\s*\n?/i);
    if (startMatch) {
      let content = trimmed.slice(startMatch[0].length);
      // 尝试匹配结尾
      const endMatch = content.match(/\n?```$/);
      if (endMatch) {
        content = content.slice(0, endMatch.index);
      }
      return content.trim();
    }
    return trimmed;
  };

  /**
   * 读取 OpenAI 兼容 SSE 流，逐 token 回调
   */
  const readSSEStream = async (
    response: Response,
    onDelta: (
      delta: string,
      fullContent: string,
      reasoningDelta?: string,
    ) => void,
  ): Promise<string> => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let sseBuffer = "";
    let fullContent = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      sseBuffer += decoder.decode(value, { stream: true });

      const lines = sseBuffer.split("\n");
      sseBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") return fullContent;

        try {
          const chunk = JSON.parse(payload);
          const deltaObj = chunk.choices?.[0]?.delta;
          const delta = deltaObj?.content || "";
          const reasoning = deltaObj?.reasoning || "";

          if (delta || reasoning) {
            fullContent += delta;
            onDelta(delta, fullContent, reasoning);
          }
        } catch (e) {
          console.warn("SSE Parse Error:", e);
        }
      }
    }
    return fullContent;
  };

  /**
   * 总结：基于当前所有节点信息生成一段总结文本
   * - 结果展示在 SummaryModal
   */
  const generateSummary = async () => {
    console.log("[Summary Debug] flowNodes:", flowNodes.value);
    console.log("[Summary Debug] flowNodes.length:", flowNodes.value.length);
    console.log(
      "[Summary Debug] flowNodes data.type:",
      flowNodes.value.map((n) => ({
        id: n.id,
        dataType: n.data?.type,
        label: n.data?.label,
      })),
    );
    if (flowNodes.value.length === 0) return;

    showSummaryModal.value = true;
    isSummarizing.value = true;
    summaryContent.value = "";

    // 构建层级结构的文本表示，帮助 AI 更好地理解逻辑关系
    const buildHierarchyText = () => {
      // 使用 id 前缀判定根节点（因 data.type 在存储加载后可能丢失）
      const rootNode = flowNodes.value.find(
        (n) => n.id.startsWith("root-") || n.data.type === "root",
      );
      if (!rootNode) return "";

      let text = `核心主题: ${rootNode.data.label}\n`;
      if (rootNode.data.description)
        text += `核心描述: ${rootNode.data.description}\n`;
      text += `\n思维脉络:\n`;

      const traverse = (parentId: string, level: number) => {
        const children = flowEdges.value
          .filter((e) => e.source === parentId)
          .map((e) => flowNodes.value.find((n) => n.id === e.target))
          .filter((n) => !!n);

        children.forEach((child) => {
          const indent = "  ".repeat(level);
          text += `${indent}- ${child!.data.label}`;
          if (child!.data.description) {
            text += `: ${child!.data.description}`;
          }
          text += "\n";
          traverse(child!.id, level + 1);
        });
      };

      traverse(rootNode.id, 1);
      return text;
    };

    const nodesHierarchy = buildHierarchyText();

    // Debug: 检查节点层级数据和最终 prompt
    console.log("[Summary Debug] nodesHierarchy:", nodesHierarchy);
    const finalPrompt = t("prompts.summaryPrompt", { nodes: nodesHierarchy });
    console.log("[Summary Debug] finalPrompt:", finalPrompt);

    const useConfig =
      apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
    const finalApiKey =
      apiConfig.mode === "default"
        ? useConfig.apiKey || API_KEY
        : useConfig.apiKey;

    try {
      const response = await fetch(useConfig.baseUrl, {
        method: "POST",
        headers: buildHeaders(useConfig.baseUrl, finalApiKey),
        body: JSON.stringify({
          model: useConfig.model,
          messages: [
            {
              role: "user",
              content: t("prompts.summaryPrompt", {
                nodes: nodesHierarchy,
              }),
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Summary request failed");

      const data = await response.json();
      summaryContent.value = data.choices[0].message.content;
    } catch (error) {
      console.error("Summary Generation Error:", error);
      summaryContent.value = t("common.error.unknown");
    } finally {
      isSummarizing.value = false;
    }
  };

  /**
   * 图片：为指定节点生成配图
   * - 节点会进入 isImageLoading 状态
   * - 成功后写入 imageUrl，用于节点卡片与预览弹窗展示
   */
  const generateNodeImage = async (nodeId: string, prompt: string) => {
    const node = flowNodes.value.find((n) => n.id === nodeId);
    if (!node || node.data.isImageLoading) return;

    updateNode(nodeId, ((n: any) => ({
      ...n,
      selected: true,
      zIndex: 1000,
    })) as any);

    updateNode(nodeId, {
      data: { ...node.data, isImageLoading: true, error: null },
    });

    const useConfig =
      apiConfig.mode === "default" ? DEFAULT_CONFIG.image : apiConfig.image;
    const finalApiKey =
      apiConfig.mode === "default"
        ? useConfig.apiKey || API_KEY
        : useConfig.apiKey;

    try {
      const topic = node.data.label || prompt;
      const detail = node.data.description || "";
      const path = findPathToNode(nodeId);
      const context =
        path.length > 5
          ? `... -> ${path.slice(-4).join(" -> ")}`
          : path.join(" -> ");
      const response = await fetch(useConfig.baseUrl, {
        method: "POST",
        headers: buildHeaders(useConfig.baseUrl, finalApiKey),
        body: JSON.stringify({
          model: useConfig.model,
          // prompt: t("prompts.image", { topic, detail, context }),
          messages: [
            {
              role: "user",
              content: t("prompts.image", { topic, detail, context }),
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!response.ok) {
        const error: any = new Error("Image request failed");
        error.status = response.status;
        throw error;
      }
      const data = await response.json();
      // 需要注意不同的生成模型返回的格式可能不同，需要根据实际情况调整
      const imageUrl = data.choices[0].message.images[0].image_url.url;

      updateNode(nodeId, {
        data: { ...node.data, imageUrl, isImageLoading: false, error: null },
      });

      // 关键：立即保存到云端
      await immediateCloudSave();
    } catch (error: any) {
      console.error("Image Generation Error:", error);
      updateNode(nodeId, {
        data: {
          ...node.data,
          isImageLoading: false,
          error: getErrorMessage(error),
        },
      });
    }
  };

  /**
   * 深挖：针对某个节点生成更详细的解释/拓展内容
   * - 若已有 detailedContent 且未展开，则直接展开（避免重复请求）
   */
  const deepDive = async (nodeId: string, topic: string) => {
    const node = flowNodes.value.find((n) => n.id === nodeId);
    if (!node) return;

    updateNode(nodeId, ((n: any) => ({
      ...n,
      selected: true,
      zIndex: 1000,
    })) as any);

    if (node.data.detailedContent && !node.data.isDetailExpanded) {
      updateNode(nodeId, { data: { ...node.data, isDetailExpanded: true } });
      return;
    }

    if (node.data.isDeepDiving) return;

    updateNode(nodeId, {
      data: {
        ...node.data,
        isDeepDiving: true,
        isDetailExpanded: true,
        error: null,
      },
    });

    const useConfig =
      apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
    const finalApiKey =
      apiConfig.mode === "default"
        ? useConfig.apiKey || API_KEY
        : useConfig.apiKey;

    try {
      const rootNode = flowNodes.value.find((n) => n.data.type === "root");
      const rootTopic = rootNode?.data?.label || "";
      const detail = node.data.description || "";
      const path = findPathToNode(nodeId);
      const context = path.join(" -> ");

      const response = await fetch(useConfig.baseUrl, {
        method: "POST",
        headers: buildHeaders(useConfig.baseUrl, finalApiKey),
        body: JSON.stringify({
          model: useConfig.model,
          messages: [
            {
              role: "system",
              content:
                aiStyle.value === "creative"
                  ? t("prompts.styleCreative")
                  : t("prompts.stylePrecise"),
            },
            {
              role: "user",
              content: t("prompts.deepDivePrompt", {
                rootTopic,
                context,
                topic,
                detail,
              }),
            },
          ],
          stream: true,
        }),
      });

      if (!response.ok) {
        const error: any = new Error("Deep dive request failed");
        error.status = response.status;
        throw error;
      }

      // 流式实时更新深挖内容
      let accumulatedReasoning = "";
      const content = await readSSEStream(
        response,
        (_delta, full, reasoning) => {
          const currentNode = flowNodes.value.find((n) => n.id === nodeId);
          if (reasoning) accumulatedReasoning += reasoning;

          if (currentNode) {
            updateNode(nodeId, {
              data: {
                ...currentNode.data,
                detailedContent: full,
                reasoningContent: accumulatedReasoning,
                isDeepDiving: true,
              },
            });
          }
        },
      );

      const finalNode = flowNodes.value.find((n) => n.id === nodeId);
      if (finalNode) {
        updateNode(nodeId, {
          data: {
            ...finalNode.data,
            detailedContent: content,
            isDeepDiving: false,
            error: null,
          },
        });
      }

      // 自动生成衍生问题
      generateDerivedQuestions(nodeId, content);

      // 关键：立即保存到云端（深挖内容）
      await immediateCloudSave();
    } catch (error: any) {
      console.error("Deep Dive Error:", error);
      updateNode(nodeId, {
        data: {
          ...node.data,
          isDeepDiving: false,
          error: getErrorMessage(error),
        },
      });
    }
  };

  /**
   * 生成从根到指定节点的“上下文路径”文本，用于二次扩展时给模型更明确的上下文
   */
  const findPathToNode = (nodeId: string): string[] => {
    const path: string[] = [];
    let currentId = nodeId;

    while (currentId) {
      const node = flowNodes.value.find((n) => n.id === currentId);
      if (node) {
        path.unshift(`${node.data.label} (${node.data.description})`);
        const edge = flowEdges.value.find((e) => e.target === currentId);
        currentId = edge ? edge.source : "";
      } else {
        break;
      }
    }
    return path;
  };

  /**
   * 将模型返回的子节点数组写入画布，并连边到 parentId
   */
  const processSubNodes = (
    subNodes: any[],
    parentId: string,
    baseX: number,
    baseY: number,
  ) => {
    subNodes.forEach((item: any, index: number) => {
      const childId = `node-${Date.now()}-${index}`;
      const offsetX = 450;
      const offsetY = (index - (subNodes.length - 1) / 2) * 280;

      addNodes({
        id: childId,
        type: "window",
        position: { x: baseX + offsetX, y: baseY + offsetY },
        data: {
          label: item.text,
          description: item.description,
          type: "child",
          followUp: "",
          isExpanding: false,
          isImageLoading: false,
          isTitleExpanded: false,
          error: null,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      addEdges({
        id: `e-${parentId}-${childId}`,
        source: parentId,
        target: childId,
        animated: true,
        type: config.edgeType,
        style: { stroke: config.edgeColor, strokeWidth: 2 },
        markerEnd: MarkerType.ArrowClosed,
      });
    });
  };

  /**
   * 生成/扩展节点
   * - 无 parentNode：创建 root 节点并生成概述（不自动生成子节点）
   * - 有 parentNode：基于用户追问生成单个回答节点（塞尔达式探索）
   *
   * 接口约定：
   * - 根节点：返回 { overview: "..." } JSON
   * - 追问节点：返回纯文本回答（使用 answerPrompt）
   */
  const expandIdea = async (param?: any, customInput?: string) => {
    const parentNode = param && param.id ? param : undefined;
    const text =
      customInput || (parentNode ? parentNode.data.label : ideaInput.value);

    // 调试：记录 expandIdea 入口参数
    console.log("[expandIdea Debug] 入口参数:", {
      hasParam: !!param,
      paramId: param?.id,
      customInput,
      text,
      parentNodeExists: !!parentNode,
      parentNodeData: parentNode?.data,
      isExpandingOnParent: parentNode?.data?.isExpanding,
      isLoadingGlobal: isLoading.value,
      followUp: parentNode?.data?.followUp,
    });

    if (!text || (parentNode ? parentNode.data.isExpanding : isLoading.value)) {
      console.log("[expandIdea Debug] 早退条件满足:", {
        textEmpty: !text,
        parentIsExpanding: parentNode?.data?.isExpanding,
        globalLoading: isLoading.value,
      });
      return;
    }

    console.log("[expandIdea Debug] 通过检查，继续执行...");

    let currentParentId = parentNode?.id;

    if (!parentNode) {
      // ========== 根节点：首次探索 ==========
      isLoading.value = true;
      setNodes([]);
      setEdges([]);

      const rootId = "root-" + Date.now();
      currentParentId = rootId;

      addNodes({
        id: rootId,
        type: "window",
        position: project({
          x: window.innerWidth / 2 - 140,
          y: window.innerHeight / 2 - 90,
        }),
        data: {
          label: text,
          description: "",
          type: "root",
          isExpanding: true,
          isTitleExpanded: false,
          followUp: "",
          error: null,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      });

      setTimeout(() => {
        fitView({ nodes: [rootId], padding: 0.4, duration: 600, maxZoom: 1.2 });
      }, 50);

      ideaInput.value = "";
      showIdeaInput.value = false; // 首次提问后，收起输入框

      // 调用AI获取概述
      const systemPrompt =
        t("prompts.system") +
        "\n" +
        (aiStyle.value === "creative"
          ? t("prompts.styleCreative")
          : t("prompts.stylePrecise"));
      const userMessage = `${t("prompts.coreIdeaPrefix")}: ${text}`;

      const useConfig =
        apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
      const finalApiKey =
        apiConfig.mode === "default"
          ? useConfig.apiKey || API_KEY
          : useConfig.apiKey;

      try {
        const response = await fetch(useConfig.baseUrl, {
          method: "POST",
          headers: buildHeaders(useConfig.baseUrl, finalApiKey),
          body: JSON.stringify({
            model: useConfig.model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userMessage },
            ],
            stream: true,
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const error: any = new Error("AI request failed");
          error.status = response.status;
          throw error;
        }

        // 流式增量渲染
        let renderedNodeCount = 0;
        let overviewSet = false;
        const nodeRegex =
          /\{\s*"text"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"description"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}/g;
        const overviewRegex = /"overview"\s*:\s*"((?:[^"\\]|\\.)*)"/;

        const rawContent = await readSSEStream(response, (_delta, full) => {
          const stripped = stripJsonFences(full);

          // 实时更新 overview
          if (!overviewSet) {
            const ovMatch = stripped.match(overviewRegex);
            if (ovMatch) {
              overviewSet = true;
              const rootNode = flowNodes.value.find((n) => n.id === rootId);
              if (rootNode) {
                updateNode(rootId, {
                  data: {
                    ...rootNode.data,
                    description: ovMatch[1]
                      .replace(/\\"/g, '"')
                      .replace(/\\n/g, "\n"),
                    isExpanding: true,
                    error: null,
                  },
                });
              }
            }
          }

          // 逐个检测并渲染子节点
          const matches = [...stripped.matchAll(nodeRegex)];
          if (matches.length > renderedNodeCount) {
            const rootNode = flowNodes.value.find((n) => n.id === rootId);
            const baseX = rootNode ? rootNode.position.x : 50;
            const baseY = rootNode ? rootNode.position.y : 300;

            for (let i = renderedNodeCount; i < matches.length; i++) {
              const nodeText = matches[i][1]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n");
              const nodeDesc = matches[i][2]
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n");
              const childId = `node-${Date.now()}-${i}`;
              const totalEstimate = Math.max(matches.length, 5);
              const offsetX = 450;
              const offsetY = (i - (totalEstimate - 1) / 2) * 280;

              addNodes({
                id: childId,
                type: "window",
                position: { x: baseX + offsetX, y: baseY + offsetY },
                data: {
                  label: nodeText,
                  description: nodeDesc,
                  type: "child",
                  followUp: "",
                  isExpanding: false,
                  isImageLoading: false,
                  isTitleExpanded: false,
                  error: null,
                },
                sourcePosition: Position.Right,
                targetPosition: Position.Left,
              });

              addEdges({
                id: `e-${rootId}-${childId}`,
                source: rootId,
                target: childId,
                animated: true,
                type: config.edgeType,
                style: { stroke: config.edgeColor, strokeWidth: 2 },
                markerEnd: MarkerType.ArrowClosed,
              });
            }
            renderedNodeCount = matches.length;
          }
        });

        // 流结束：最终解析确保数据完整
        const finalResult = JSON.parse(stripJsonFences(rawContent));
        const rootNode = flowNodes.value.find((n) => n.id === rootId);
        if (rootNode) {
          updateNode(rootId, {
            data: {
              ...rootNode.data,
              description:
                finalResult.overview || rootNode.data.description || "",
              isExpanding: false,
              error: null,
            },
          });
        }

        // 若流中有遗漏节点，补充渲染
        const finalNodes = finalResult.nodes || [];
        if (finalNodes.length > renderedNodeCount) {
          const baseX = rootNode ? rootNode.position.x : 50;
          const baseY = rootNode ? rootNode.position.y : 300;
          for (let i = renderedNodeCount; i < finalNodes.length; i++) {
            const item = finalNodes[i];
            const childId = `node-${Date.now()}-${i}`;
            const offsetX = 450;
            const offsetY = (i - (finalNodes.length - 1) / 2) * 280;

            addNodes({
              id: childId,
              type: "window",
              position: { x: baseX + offsetX, y: baseY + offsetY },
              data: {
                label: item.text,
                description: item.description,
                type: "child",
                followUp: "",
                isExpanding: false,
                isImageLoading: false,
                isTitleExpanded: false,
                error: null,
              },
              sourcePosition: Position.Right,
              targetPosition: Position.Left,
            });

            addEdges({
              id: `e-${rootId}-${childId}`,
              source: rootId,
              target: childId,
              animated: true,
              type: config.edgeType,
              style: { stroke: config.edgeColor, strokeWidth: 2 },
              markerEnd: MarkerType.ArrowClosed,
            });
          }
        }

        // 等待响应式更新完成
        await nextTick();
        await immediateCloudSave();

        // 布局 & 画面适配
        await nextTick();
        requestAnimationFrame(() => {
          setTimeout(() => {
            resetLayout();
            const childEdges = flowEdges.value.filter(
              (e) => e.source === rootId,
            );
            const childIds = childEdges.map((e) => e.target);
            const nodesToFit = [rootId, ...childIds];

            fitView({
              nodes: nodesToFit,
              padding: 0.15,
              duration: 1000,
              maxZoom: 1.2,
            });
          }, 200);
        });
      } catch (error: any) {
        console.error("Root Expansion Error:", error);
        const node = flowNodes.value.find((n) => n.id === rootId);
        if (node) {
          updateNode(rootId, {
            data: {
              ...node.data,
              error: getErrorMessage(error),
              isExpanding: false,
            },
          });
        }
      } finally {
        isLoading.value = false;
      }
    } else {
      // ========== 子节点：追问探索 ==========
      const node = flowNodes.value.find((n) => n.id === parentNode.id);
      if (node) {
        updateNode(parentNode.id, {
          data: {
            ...node.data,
            isExpanding: true,
            error: null,
          },
        });
      }

      // 使用 answerPrompt 生成回答
      const rootNode = flowNodes.value.find(
        (n) => n.id.startsWith("root-") || n.data.type === "root",
      );
      const rootTopic = rootNode?.data?.label || "";
      const path = findPathToNode(parentNode.id);
      const context = path.join(" -> ");

      const answerPrompt = t("prompts.answerPrompt", {
        rootTopic,
        context,
        question: customInput || t("prompts.continue"),
      });

      // 调试：检查 answerPrompt 构建参数
      console.log("[expandIdea Debug] answerPrompt 构建参数:", {
        rootNode: rootNode?.id,
        rootTopic,
        context,
        question: customInput || t("prompts.continue"),
        answerPrompt,
      });

      const stylePrompt =
        aiStyle.value === "creative"
          ? t("prompts.styleCreative")
          : t("prompts.stylePrecise");

      const useConfig =
        apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
      const finalApiKey =
        apiConfig.mode === "default"
          ? useConfig.apiKey || API_KEY
          : useConfig.apiKey;

      try {
        // 先创建空子节点，流式填充内容
        const childId = `node-${Date.now()}`;
        const fullLabel = customInput || "追问";
        const shortLabel =
          fullLabel.length > 30 ? fullLabel.slice(0, 30) + "..." : fullLabel;

        const parentNodeObj = flowNodes.value.find(
          (n) => n.id === parentNode.id,
        );
        const startX = parentNodeObj ? parentNodeObj.position.x : 50;
        const startY = parentNodeObj ? parentNodeObj.position.y : 300;

        addNodes({
          id: childId,
          type: "window",
          position: { x: startX + 450, y: startY },
          data: {
            label: shortLabel,
            fullLabel: fullLabel,
            description: "",
            type: "child",
            detailedContent: "",
            isDetailExpanded: true,
            followUp: "",
            isExpanding: true,
            isImageLoading: false,
            isTitleExpanded: false,
            error: null,
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        });

        addEdges({
          id: `e-${parentNode.id}-${childId}`,
          source: parentNode.id,
          target: childId,
          animated: true,
          type: config.edgeType,
          style: { stroke: config.edgeColor, strokeWidth: 2 },
          markerEnd: MarkerType.ArrowClosed,
        });

        // 聚焦新节点
        await nextTick();
        setTimeout(() => {
          resetLayout();
          fitView({ nodes: [childId], padding: 0.5, duration: 800 });
        }, 100);

        const response = await fetch(useConfig.baseUrl, {
          method: "POST",
          headers: buildHeaders(useConfig.baseUrl, finalApiKey),
          body: JSON.stringify({
            model: useConfig.model,
            messages: [
              { role: "system", content: stylePrompt },
              { role: "user", content: answerPrompt },
            ],
            stream: true,
            temperature: 0.8,
          }),
        });

        if (!response.ok) {
          const error: any = new Error("AI request failed");
          error.status = response.status;
          throw error;
        }

        // 流式实时更新子节点内容
        let accumulatedReasoning = "";
        const rawContent = await readSSEStream(
          response,
          (_delta, full, reasoning) => {
            const childNode = flowNodes.value.find((n) => n.id === childId);
            if (reasoning) accumulatedReasoning += reasoning;

            if (childNode) {
              updateNode(childId, {
                data: {
                  ...childNode.data,
                  detailedContent: full,
                  reasoningContent: accumulatedReasoning,
                  isExpanding: true,
                },
              });
            }
          },
        );

        // 流结束：解析最终 JSON
        let answerContent = rawContent;
        let summaryContent = "";
        try {
          const result = JSON.parse(stripJsonFences(rawContent));
          answerContent = result.answer || rawContent;
          summaryContent = result.summary || "";
        } catch {
          // JSON 解析失败，使用原始流文本
        }

        const childNode = flowNodes.value.find((n) => n.id === childId);
        if (childNode) {
          updateNode(childId, {
            data: {
              ...childNode.data,
              detailedContent: answerContent,
              description: summaryContent,
              isExpanding: false,
              error: null,
            },
          });
        }

        // 清空父节点的 followUp 输入
        if (parentNodeObj) {
          updateNode(parentNode.id, {
            data: { ...parentNodeObj.data, followUp: "", isExpanding: false },
          });
        }

        // 自动生成衍生问题
        generateDerivedQuestions(childId, answerContent);

        // 关键：立即保存到云端（追问节点生成）
        await immediateCloudSave();
      } catch (error: any) {
        console.error("Follow-up Error:", error);
        const nodeObj = flowNodes.value.find((n) => n.id === parentNode.id);
        if (nodeObj) {
          updateNode(parentNode.id, {
            data: {
              ...nodeObj.data,
              error: getErrorMessage(error),
              isExpanding: false,
            },
          });
        }
      }
    }
  };

  /**
   * 生成衍生问题：为指定节点生成3条探索性问题
   * - 在 detailedContent 生成后自动调用
   * - 用户可点击问题气泡填入 followUp 输入框进行追问
   */
  const generateDerivedQuestions = async (
    nodeId: string,
    detailedContent?: string,
  ) => {
    const node = flowNodes.value.find((n) => n.id === nodeId);
    if (!node || node.data.isGeneratingQuestions) return;

    // 标记生成状态
    updateNode(nodeId, {
      data: {
        ...node.data,
        isGeneratingQuestions: true,
        derivedQuestions: [],
      },
    });

    const useConfig =
      apiConfig.mode === "default" ? DEFAULT_CONFIG.chat : apiConfig.chat;
    const finalApiKey =
      apiConfig.mode === "default"
        ? useConfig.apiKey || API_KEY
        : useConfig.apiKey;

    try {
      const rootNode = flowNodes.value.find(
        (n) => n.id.startsWith("root-") || n.data.type === "root",
      );
      const rootTopic = rootNode?.data?.label || "";
      const path = findPathToNode(nodeId);
      const context = path.join(" -> ");
      const topic = node.data.label || "";
      // 使用传入的 detailedContent 或节点已有的 detailedContent
      const detail = detailedContent || node.data.detailedContent || "";

      const response = await fetch(useConfig.baseUrl, {
        method: "POST",
        headers: buildHeaders(useConfig.baseUrl, finalApiKey),
        body: JSON.stringify({
          model: useConfig.model,
          messages: [
            {
              role: "user",
              content: t("prompts.derivedQuestionsPrompt", {
                rootTopic,
                context,
                topic,
                detail,
              }),
            },
          ],
          stream: true,
          temperature: 0.9,
        }),
      });

      if (!response.ok) {
        const error: any = new Error("Derived questions request failed");
        error.status = response.status;
        throw error;
      }

      // 流式累积后一次性解析
      const rawContent = await readSSEStream(response, () => {});
      const result = JSON.parse(stripJsonFences(rawContent));
      const questions = result.questions || [];

      const currentNode = flowNodes.value.find((n) => n.id === nodeId);
      if (currentNode) {
        updateNode(nodeId, {
          data: {
            ...currentNode.data,
            derivedQuestions: questions.slice(0, 3),
            isGeneratingQuestions: false,
          },
        });
      }

      // 关键：立即保存到云端（衍生问题）
      await immediateCloudSave();
    } catch (error: any) {
      console.error("Generate Derived Questions Error:", error);
      updateNode(nodeId, {
        data: {
          ...node.data,
          isGeneratingQuestions: false,
          derivedQuestions: [],
        },
      });
    }
  };

  /**
   * 立即清空当前画布与输入，并关闭确认弹窗
   */
  const executeReset = () => {
    ideaInput.value = "";
    setNodes([]);
    setEdges([]);
    collapsedNodeIds.value = [];

    // 清除本地存储
    localStorage.removeItem("thinkflow_nodes");
    localStorage.removeItem("thinkflow_edges");
    localStorage.removeItem("thinkflow_collapsed");

    showResetConfirm.value = false;
  };

  /**
   * 新会话入口
   * - 若当前已有节点：弹出二次确认
   * - 若为空：直接清空（等价 executeReset）
   */
  const startNewSession = () => {
    if (flowNodes.value.length > 0) {
      showResetConfirm.value = true;
      return;
    }
    executeReset();
  };

  return {
    apiConfig,
    DEFAULT_CONFIG,
    showSettings,
    ideaInput,
    isLoading,
    previewImageUrl,
    showResetConfirm,
    showSummaryModal,
    isSummarizing,
    summaryContent,
    panOnDrag,
    isSpacePressed,
    config,
    flowNodes,
    flowEdges,
    activeNodeId,
    activePath,
    updateNode,
    fitView,
    resetLayout,
    centerRoot,
    handleNodeDrag,
    alignmentGuides,
    viewport,
    toggleSubtreeCollapse,
    isSubtreeCollapsed,
    startNewSession,
    executeReset,
    generateSummary,
    exportMarkdown,
    exportHTML,
    generateNodeImage,
    deepDive,
    expandIdea,
    generateDerivedQuestions,
    aiStyle,
    isPresenting,
    togglePresentation,
    nextPresentationNode,
    prevPresentationNode,
    searchQuery,
    searchResults,
    focusNode,
    showChatSidebar,
    showNodeDetailPanel,
    panelNodeData,
    openNodeDetailPanel,
    openGraphChat,
    closeRightPanel,
    togglePanelLock,
    isDetailPanelLocked,
    activeRightPanel,
    isChatting,
    graphChatMessages,
    addStickyNote,
    sendGraphChatMessage,
    removeNodes,
    deleteNode,
    // 云存储相关
    initCloudSync,
    cloudSyncEnabled,
    // 项目数据隔离
    loadProjectData,
    clearCanvas,
    createDefaultRoot,
    currentProjectId,
    showIdeaInput,
  };
}
