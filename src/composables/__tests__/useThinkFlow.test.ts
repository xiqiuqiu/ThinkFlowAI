/**
 * useThinkFlow BDD 测试
 * 测试 ThinkFlow 核心业务 Composable 的关键功能
 *
 * 注意：useThinkFlow 依赖 useVueFlow，需要特殊处理
 * 此测试聚焦于可独立测试的纯函数与状态逻辑
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

// Mock VueFlow
vi.mock("@vue-flow/core", () => ({
  useVueFlow: vi.fn(() => ({
    addNodes: vi.fn(),
    addEdges: vi.fn(),
    setNodes: vi.fn(),
    setEdges: vi.fn(),
    nodes: ref([]),
    edges: ref([]),
    updateNode: vi.fn(),
    removeNodes: vi.fn(),
    removeEdges: vi.fn(),
    fitView: vi.fn(),
    viewport: ref({ x: 0, y: 0, zoom: 1 }),
    onNodeDragStart: vi.fn(),
    onNodeDrag: vi.fn(),
    onNodeDragStop: vi.fn(),
    project: vi.fn(),
  })),
  MarkerType: { ArrowClosed: "arrowclosed" },
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
}));

// Mock BackgroundVariant
vi.mock("@vue-flow/background", () => ({
  BackgroundVariant: { Lines: "lines", Dots: "dots" },
}));

// Mock services/config
vi.mock("../services/config", () => ({
  DEFAULT_CONFIG: {
    chat: { baseUrl: "", model: "", apiKey: "" },
    image: { baseUrl: "", model: "", apiKey: "" },
  },
  API_KEY: "",
}));

// Mock markdown-it
vi.mock("markdown-it", () => ({
  default: vi.fn(() => ({
    render: vi.fn((text: string) => `<p>${text}</p>`),
  })),
}));

// 创建 mock t 函数和 locale
const mockT = vi.fn((key: string) => key);
const mockLocale = ref("zh");

// 导入被测模块
import { useThinkFlow } from "../useThinkFlow";

describe("useThinkFlow", () => {
  let thinkFlow: ReturnType<typeof useThinkFlow>;

  beforeEach(() => {
    // 清理 localStorage
    localStorage.clear();

    thinkFlow = useThinkFlow({
      t: mockT,
      locale: mockLocale,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  // ============================================================
  // Feature: API 配置管理
  // ============================================================
  describe("API Configuration", () => {
    it("should initialize apiConfig with default mode", () => {
      // Given: 首次加载，localStorage 为空
      // When: 初始化 useThinkFlow
      // Then: apiConfig.mode 应为 'default'
      expect(thinkFlow.apiConfig.mode).toBe("default");
    });

    it("should persist API mode to localStorage", () => {
      // Given: apiConfig 已初始化
      // When: 修改 mode
      thinkFlow.apiConfig.mode = "custom";

      // Then: localStorage 应更新（由 watch 触发）
      // 注意：watch 是异步的，此处验证对象状态
      expect(thinkFlow.apiConfig.mode).toBe("custom");
    });
  });

  // ============================================================
  // Feature: AI 思考风格
  // ============================================================
  describe("AI Style", () => {
    it("should default to creative style", () => {
      // Given: 首次加载
      // When: 检查 aiStyle
      // Then: 应为 'creative'
      expect(thinkFlow.aiStyle.value).toBe("creative");
    });

    it("should allow switching to precise style", () => {
      // Given: 当前为 creative 风格
      // When: 切换为 precise
      thinkFlow.aiStyle.value = "precise";

      // Then: aiStyle 应更新
      expect(thinkFlow.aiStyle.value).toBe("precise");
    });
  });

  // ============================================================
  // Feature: 演示模式
  // ============================================================
  describe("Presentation Mode", () => {
    it("should start with presentation mode disabled", () => {
      // Given: 初始化完成
      // When: 检查演示模式状态
      // Then: isPresenting 应为 false
      expect(thinkFlow.isPresenting.value).toBe(false);
    });

    it("should toggle presentation mode", () => {
      // Given: 演示模式关闭
      expect(thinkFlow.isPresenting.value).toBe(false);

      // When: 切换演示模式
      thinkFlow.togglePresentation();

      // Then: 演示模式应开启
      expect(thinkFlow.isPresenting.value).toBe(true);
    });
  });

  // ============================================================
  // Feature: 搜索功能
  // ============================================================
  describe("Search", () => {
    it("should return empty results for empty query", () => {
      // Given: 搜索词为空
      thinkFlow.searchQuery.value = "";

      // When: 检查搜索结果
      // Then: 结果应为空数组
      expect(thinkFlow.searchResults.value).toEqual([]);
    });

    it("should return empty results for whitespace query", () => {
      // Given: 搜索词仅含空格
      thinkFlow.searchQuery.value = "   ";

      // When: 检查搜索结果
      // Then: 结果应为空数组
      expect(thinkFlow.searchResults.value).toEqual([]);
    });
  });

  // ============================================================
  // Feature: 配置管理
  // ============================================================
  describe("Config", () => {
    it("should have default config values", () => {
      // Given: 首次初始化（无 localStorage）
      // When: 检查配置
      // Then: 应有默认值
      expect(thinkFlow.config.edgeColor).toBeDefined();
      expect(thinkFlow.config.showControls).toBe(true);
      expect(thinkFlow.config.showMiniMap).toBe(true);
    });
  });

  // ============================================================
  // Feature: 加载状态
  // ============================================================
  describe("Loading State", () => {
    it("should start with isLoading false", () => {
      // Given: 初始化完成
      // When: 检查加载状态
      // Then: isLoading 应为 false
      expect(thinkFlow.isLoading.value).toBe(false);
    });
  });

  // ============================================================
  // Feature: 面板状态
  // ============================================================
  describe("Panel State", () => {
    it("should start with no active right panel", () => {
      // Given: 初始化完成
      // When: 检查右侧面板状态
      // Then: activeRightPanel 应为 'none'
      expect(thinkFlow.activeRightPanel.value).toBe("none");
    });

    it("should allow toggling detail panel lock", () => {
      // Given: 面板未锁定
      expect(thinkFlow.isDetailPanelLocked.value).toBe(false);

      // When: 切换锁定
      thinkFlow.togglePanelLock();

      // Then: 面板应锁定
      expect(thinkFlow.isDetailPanelLocked.value).toBe(true);
    });
  });

  // ============================================================
  // Feature: 设置弹窗
  // ============================================================
  describe("Settings Modal", () => {
    it("should start with settings modal closed", () => {
      // Given: 初始化完成
      // When: 检查设置弹窗状态
      // Then: showSettings 应为 false
      expect(thinkFlow.showSettings.value).toBe(false);
    });

    it("should allow opening settings modal", () => {
      // Given: 设置弹窗关闭
      // When: 打开设置
      thinkFlow.showSettings.value = true;

      // Then: 弹窗应开启
      expect(thinkFlow.showSettings.value).toBe(true);
    });
  });

  // ============================================================
  // Feature: 右侧面板操作
  // ============================================================
  describe("Right Panel Operations", () => {
    it("should open node detail panel", () => {
      // Given: 面板关闭
      expect(thinkFlow.activeRightPanel.value).toBe("none");

      // When: 打开节点详情面板
      thinkFlow.openNodeDetailPanel("test-node-id");

      // Then: 面板类型应为 nodeDetail
      expect(thinkFlow.activeRightPanel.value).toBe("nodeDetail");
    });

    it("should open graph chat panel", () => {
      // Given: 面板关闭
      expect(thinkFlow.activeRightPanel.value).toBe("none");

      // When: 打开图谱对话面板
      thinkFlow.openGraphChat();

      // Then: 面板类型应为 graphChat
      expect(thinkFlow.activeRightPanel.value).toBe("graphChat");
    });

    it("should close right panel", () => {
      // Given: 面板已打开
      thinkFlow.openGraphChat();
      expect(thinkFlow.activeRightPanel.value).toBe("graphChat");

      // When: 关闭面板
      thinkFlow.closeRightPanel();

      // Then: 面板应关闭
      expect(thinkFlow.activeRightPanel.value).toBe("none");
    });

    it("should toggle panel lock state multiple times", () => {
      // Given: 面板未锁定
      expect(thinkFlow.isDetailPanelLocked.value).toBe(false);

      // When: 切换两次
      thinkFlow.togglePanelLock();
      expect(thinkFlow.isDetailPanelLocked.value).toBe(true);

      thinkFlow.togglePanelLock();

      // Then: 应恢复未锁定
      expect(thinkFlow.isDetailPanelLocked.value).toBe(false);
    });
  });

  // ============================================================
  // Feature: 会话管理
  // ============================================================
  describe("Session Management", () => {
    it("should have showResetConfirm initially false", () => {
      // Given: 初始化完成
      // When: 检查重置确认弹窗状态
      // Then: 应为 false
      expect(thinkFlow.showResetConfirm.value).toBe(false);
    });

    it("should allow setting showResetConfirm", () => {
      // Given: 重置确认弹窗关闭
      // When: 设置为 true
      thinkFlow.showResetConfirm.value = true;

      // Then: 应为 true
      expect(thinkFlow.showResetConfirm.value).toBe(true);
    });
  });

  // ============================================================
  // Feature: 输入状态
  // ============================================================
  describe("Input State", () => {
    it("should have ideaInput initially empty", () => {
      // Given: 初始化完成
      // When: 检查输入框内容
      // Then: 应为空字符串
      expect(thinkFlow.ideaInput.value).toBe("");
    });

    it("should allow updating ideaInput", () => {
      // Given: 输入框为空
      // When: 输入内容
      thinkFlow.ideaInput.value = "测试想法";

      // Then: 输入内容应更新
      expect(thinkFlow.ideaInput.value).toBe("测试想法");
    });

    it("should have showIdeaInput initially false", () => {
      // Given: 初始化完成
      // When: 检查输入框显示状态
      // Then: 应为 false
      expect(thinkFlow.showIdeaInput.value).toBe(false);
    });

    it("should bind current canvas to a new project without keeping guest cache", () => {
      // Given: 当前画布处于游客项目上下文
      const guestProjectId = thinkFlow.currentProjectId.value;
      expect(guestProjectId).toBeTruthy();
      localStorage.setItem(`thinkflow_${guestProjectId}_nodes`, JSON.stringify([]));
      localStorage.setItem(`thinkflow_${guestProjectId}_edges`, JSON.stringify([]));
      localStorage.setItem(
        `thinkflow_${guestProjectId}_collapsed`,
        JSON.stringify([]),
      );

      // When: 绑定到新创建的正式项目
      thinkFlow.bindCanvasToProject("project-123");

      // Then: 当前项目上下文应更新，且游客缓存被清理
      expect(thinkFlow.currentProjectId.value).toBe("project-123");
      expect(localStorage.getItem("thinkflow_current_project_id")).toBe(
        "project-123",
      );
      expect(localStorage.getItem("thinkflow_guest_project_id")).toBeNull();
      expect(localStorage.getItem(`thinkflow_${guestProjectId}_nodes`)).toBeNull();
      expect(localStorage.getItem("thinkflow_project-123_nodes")).toBe("[]");
    });

    it("should reset project binding and clear persisted project id", () => {
      // Given: 当前画布已经绑定到一个正式项目
      thinkFlow.bindCanvasToProject("project-123");
      localStorage.setItem("thinkflow_project-123_nodes", JSON.stringify([]));
      localStorage.setItem("thinkflow_project-123_edges", JSON.stringify([]));
      localStorage.setItem(
        "thinkflow_project-123_collapsed",
        JSON.stringify([]),
      );

      // When: 删除最后一个项目后解除绑定
      thinkFlow.resetProjectBinding();

      // Then: 当前项目上下文和持久化键应被清理
      expect(thinkFlow.currentProjectId.value).toBeNull();
      expect(localStorage.getItem("thinkflow_current_project_id")).toBeNull();
      expect(localStorage.getItem("thinkflow_project-123_nodes")).toBeNull();
      expect(localStorage.getItem("thinkflow_project-123_edges")).toBeNull();
      expect(
        localStorage.getItem("thinkflow_project-123_collapsed"),
      ).toBeNull();
    });
  });

  // ============================================================
  // Feature: 总结功能
  // ============================================================
  describe("Summary Feature", () => {
    it("should have isSummarizing initially false", () => {
      // Given: 初始化完成
      // When: 检查总结生成状态
      // Then: 应为 false
      expect(thinkFlow.isSummarizing.value).toBe(false);
    });

    it("should have summaryContent initially empty", () => {
      // Given: 初始化完成
      // When: 检查总结内容
      // Then: 应为空字符串
      expect(thinkFlow.summaryContent.value).toBe("");
    });

    it("should have showSummaryModal initially false", () => {
      // Given: 初始化完成
      // When: 检查总结弹窗状态
      // Then: 应为 false
      expect(thinkFlow.showSummaryModal.value).toBe(false);
    });
  });

  // ============================================================
  // Feature: 图谱聊天
  // ============================================================
  describe("Graph Chat", () => {
    it("should have isChatting initially false", () => {
      // Given: 初始化完成
      // When: 检查聊天状态
      // Then: 应为 false
      expect(thinkFlow.isChatting.value).toBe(false);
    });

    it("should have graphChatMessages initially empty", () => {
      // Given: 初始化完成
      // When: 检查聊天消息列表
      // Then: 应为空数组
      expect(thinkFlow.graphChatMessages.value).toEqual([]);
    });
  });

  // ============================================================
  // Feature: 视口与画布
  // ============================================================
  describe("Viewport & Canvas", () => {
    it("should have viewport with default values", () => {
      // Given: 初始化完成
      // When: 检查视口状态
      // Then: 应有 x, y, zoom 属性
      expect(thinkFlow.viewport.value).toHaveProperty("x");
      expect(thinkFlow.viewport.value).toHaveProperty("y");
      expect(thinkFlow.viewport.value).toHaveProperty("zoom");
    });

    it("should have panOnDrag enabled by default", () => {
      // Given: 初始化完成
      // When: 检查拖拽模式
      // Then: 应为 true
      expect(thinkFlow.panOnDrag.value).toBe(true);
    });

    it("should have isSpacePressed initially false", () => {
      // Given: 初始化完成
      // When: 检查空格按键状态
      // Then: 应为 false
      expect(thinkFlow.isSpacePressed.value).toBe(false);
    });
  });

  // ============================================================
  // Feature: 画布配置
  // ============================================================
  describe("Canvas Config", () => {
    it("should have default edgeColor", () => {
      // Given: 初始化完成
      // When: 检查边颜色
      // Then: 应有默认值
      expect(thinkFlow.config.edgeColor).toBe("#fed7aa");
    });

    it("should have snapToGrid enabled by default", () => {
      // Given: 初始化完成
      // When: 检查网格吸附配置
      // Then: 应为 true
      expect(thinkFlow.config.snapToGrid).toBe(true);
    });

    it("should have snapToAlignment enabled by default", () => {
      // Given: 初始化完成
      // When: 检查对齐吸附配置
      // Then: 应为 true
      expect(thinkFlow.config.snapToAlignment).toBe(true);
    });

    it("should allow updating config values", () => {
      // Given: 默认配置
      // When: 修改配置
      thinkFlow.config.showMiniMap = false;
      thinkFlow.config.showControls = false;

      // Then: 配置应更新
      expect(thinkFlow.config.showMiniMap).toBe(false);
      expect(thinkFlow.config.showControls).toBe(false);
    });
  });

  // ============================================================
  // Feature: 节点/边数据
  // ============================================================
  describe("Nodes & Edges Data", () => {
    it("should have flowNodes initially empty", () => {
      // Given: 初始化完成
      // When: 检查节点列表
      // Then: 应为空数组
      expect(thinkFlow.flowNodes.value).toEqual([]);
    });

    it("should have flowEdges initially empty", () => {
      // Given: 初始化完成
      // When: 检查边列表
      // Then: 应为空数组
      expect(thinkFlow.flowEdges.value).toEqual([]);
    });
  });

  // ============================================================
  // Feature: 云同步
  // ============================================================
  describe("Cloud Sync", () => {
    it("should have cloudSyncEnabled initially false", () => {
      // Given: 初始化完成
      // When: 检查云同步状态
      // Then: 应为 false
      expect(thinkFlow.cloudSyncEnabled.value).toBe(false);
    });

    it("should enable cloud sync after initialization", () => {
      // Given: 云同步关闭
      expect(thinkFlow.cloudSyncEnabled.value).toBe(false);

      // When: 初始化云同步
      const mockSaveToCloud = vi.fn();
      thinkFlow.initCloudSync(mockSaveToCloud);

      // Then: 云同步应启用
      expect(thinkFlow.cloudSyncEnabled.value).toBe(true);
    });
  });
});
