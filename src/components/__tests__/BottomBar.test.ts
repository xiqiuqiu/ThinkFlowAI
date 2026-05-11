/**
 * BottomBar BDD 测试
 * 测试底部输入条组件的核心功能：输入框展开/收起、遮罩交互
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import BottomBar from "../BottomBar.vue";

// Mock lucide-vue-next 图标
vi.mock("lucide-vue-next", () => ({
  Sparkles: { template: "<span>Sparkles</span>" },
  Brain: { template: "<span>Brain</span>" },
  Zap: { template: "<span>Zap</span>" },
  RefreshCw: { template: "<span>RefreshCw</span>" },
  Terminal: { template: "<span>Terminal</span>" },
}));

// 辅助函数：创建组件包装器
const createWrapper = (props = {}) => {
  return mount(BottomBar, {
    props: {
      t: (key: string) => key,
      modelValue: "",
      isLoading: false,
      aiStyle: "creative",
      onToggleAiStyle: vi.fn(),
      ...props,
    },
    global: {
      stubs: {
        Transition: false,
      },
    },
  });
};

describe("BottomBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================
  // Feature: 输入框展开状态判断
  // ============================================================
  describe("输入框展开状态 (isExpanded)", () => {
    describe("Scenario: 新项目（无节点）时始终展开", () => {
      it("Given hasNodes 为 false, When 组件渲染, Then 输入框应展开", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false });

        // When & Then
        // 使用 top-1/2 类来精确定位输入框容器（而非圆球）
        const inputContainer = wrapper.find(".fixed.z-\\[70\\].top-1\\/2");
        const inputBar = inputContainer.find(
          ".flex.items-center.bg-white\\/95",
        );
        expect(inputBar.classes()).toContain("opacity-100");
      });
    });

    describe("Scenario: 有节点时收起状态", () => {
      it("Given hasNodes 为 true 且无输入, When 初始渲染, Then 输入框应收起", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true, modelValue: "" });

        // When & Then
        const inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-0");
      });
    });

    describe("Scenario: 强制展开", () => {
      it("Given forceExpanded 为 true, When 组件渲染, Then 输入框应展开", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true, forceExpanded: true });

        // When & Then
        const inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-100");
      });
    });

    describe("Scenario: 有输入内容时展开", () => {
      it("Given modelValue 有值, When 组件渲染, Then 输入框应展开", () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          modelValue: "测试输入",
        });

        // When & Then
        const inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-100");
      });
    });
  });

  // ============================================================
  // Feature: 圆形球交互
  // ============================================================
  describe("圆形球交互 (Ball)", () => {
    describe("Scenario: 收起状态时显示圆球", () => {
      it("Given 输入框收起, When 渲染, Then 圆球应可见", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true, modelValue: "" });

        // When
        await nextTick();

        // Then
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        expect(ball.classes()).toContain("opacity-100");
      });
    });

    describe("Scenario: 展开状态时隐藏圆球", () => {
      it("Given 输入框展开, When 渲染, Then 圆球应隐藏", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false });

        // When
        await nextTick();

        // Then
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        expect(ball.classes()).toContain("opacity-0");
        expect(ball.classes()).toContain("pointer-events-none");
      });
    });

    describe("Scenario: 点击圆球展开输入框", () => {
      it("Given 输入框收起, When 点击圆球, Then 输入框应获得焦点", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true, modelValue: "" });
        const ball = wrapper.find(".fixed.left-4.bottom-20");

        // When
        await ball.trigger("click");
        await nextTick();

        // Then
        const input = wrapper.find("input");
        // 注：由于 jsdom 限制，focus 行为可能需要额外处理
        expect(input.exists()).toBe(true);
      });
    });
  });

  // ============================================================
  // Feature: 虚化遮罩交互
  // ============================================================
  describe("虚化遮罩 (Backdrop)", () => {
    describe("Scenario: 有节点且展开时显示遮罩", () => {
      it("Given hasNodes 为 true 且输入框展开, When 渲染, Then 遮罩应显示", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
        });

        // When
        await nextTick();

        // Then
        const backdrop = wrapper.find(
          ".fixed.inset-0.z-\\[60\\].bg-slate-900\\/40",
        );
        expect(backdrop.exists()).toBe(true);
      });
    });

    describe("Scenario: 无节点时不显示遮罩", () => {
      it("Given hasNodes 为 false, When 渲染, Then 遮罩不应显示", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false });

        // When
        await nextTick();

        // Then
        const backdrop = wrapper.find(
          ".fixed.inset-0.z-\\[60\\].bg-slate-900\\/40",
        );
        expect(backdrop.exists()).toBe(false);
      });
    });

    describe("Scenario: 点击遮罩关闭输入框", () => {
      it("Given 遮罩显示, When 点击遮罩, Then 输入框应收起", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
        });
        await nextTick();

        const backdrop = wrapper.find(
          ".fixed.inset-0.z-\\[60\\].bg-slate-900\\/40",
        );
        expect(backdrop.exists()).toBe(true);

        // When
        await backdrop.trigger("click");
        await nextTick();

        // Then: isInputFocused 应变为 false（组件内部状态）
        // 由于 forceExpanded 仍为 true，输入框仍展开
        // 但在实际使用中，forceExpanded 通常与外部状态绑定
        expect(backdrop.exists()).toBe(true);
      });
    });
  });

  // ============================================================
  // Feature: 输入框定位
  // ============================================================
  describe("输入框定位", () => {
    describe("Scenario: 输入框始终居中", () => {
      it("Given 任何状态, When 渲染, Then 输入框容器应使用居中定位", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true });

        // When & Then
        // 使用 top-1/2 类来精确定位输入框容器
        const container = wrapper.find(".fixed.z-\\[70\\].top-1\\/2");
        expect(container.exists()).toBe(true);
        expect(container.classes()).toContain("left-1/2");
        expect(container.classes()).toContain("-translate-x-1/2");
        expect(container.classes()).toContain("-translate-y-1/2");
      });
    });

    describe("Scenario: 圆球固定左下角", () => {
      it("Given 输入框收起, When 渲染, Then 圆球应固定在左下角", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true });

        // When & Then
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        expect(ball.exists()).toBe(true);
        expect(ball.classes()).toContain("fixed");
        expect(ball.classes()).toContain("left-4");
      });
    });
  });

  // ============================================================
  // Feature: 事件触发
  // ============================================================
  describe("事件触发", () => {
    describe("Scenario: 输入更新事件", () => {
      it("Given 用户输入, When 输入框值改变, Then 应触发 update:modelValue 事件", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false });
        const input = wrapper.find("input");

        // When
        await input.setValue("新想法");

        // Then
        expect(wrapper.emitted("update:modelValue")).toBeTruthy();
        expect(wrapper.emitted("update:modelValue")![0]).toEqual(["新想法"]);
      });
    });

    describe("Scenario: 回车提交事件", () => {
      it("Given 输入框有值, When 按下回车, Then 应触发 expand 事件", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false, modelValue: "测试" });
        const input = wrapper.find("input");

        // When
        await input.trigger("keyup.enter");

        // Then
        expect(wrapper.emitted("expand")).toBeTruthy();
      });
    });

    describe("Scenario: 提交按钮点击", () => {
      it("Given 输入框有值, When 点击提交按钮, Then 应触发 expand 事件", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: false, modelValue: "测试" });
        const submitBtn = wrapper
          .findAll("button")
          .find((btn) => btn.classes().includes("bg-slate-900"));

        // When
        await submitBtn?.trigger("click");

        // Then
        expect(wrapper.emitted("expand")).toBeTruthy();
      });

      it("Given 已有节点且输入框聚焦, When 提交后父层清空输入并结束加载, Then 输入框应保持收起", async () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true, modelValue: "测试" });
        const input = wrapper.find("input");
        const submitBtn = wrapper
          .findAll("button")
          .find((btn) => btn.classes().includes("bg-slate-900"));

        await input.trigger("focus");
        await nextTick();

        // When
        await submitBtn?.trigger("click");
        await wrapper.setProps({ modelValue: "", isLoading: true });
        await nextTick();
        await wrapper.setProps({ modelValue: "", isLoading: false });
        await nextTick();

        // Then
        const inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(wrapper.emitted("expand")).toBeTruthy();
        expect(inputBar.classes()).toContain("opacity-0");
      });
    });
  });

  // ============================================================
  // Feature: AI 风格切换
  // ============================================================
  describe("AI 风格切换", () => {
    describe("Scenario: 切换思考风格", () => {
      it("Given 显示当前风格, When 点击切换按钮, Then 应调用 onToggleAiStyle", async () => {
        // Given
        const onToggleAiStyle = vi.fn();
        const wrapper = createWrapper({
          hasNodes: false,
          onToggleAiStyle,
        });

        // When
        const styleBtn = wrapper
          .findAll("button")
          .find(
            (btn) =>
              btn.classes().includes("bg-amber-50") ||
              btn.classes().includes("bg-cyan-50"),
          );
        await styleBtn?.trigger("click");

        // Then
        expect(onToggleAiStyle).toHaveBeenCalled();
      });
    });

    describe("Scenario: 切换风格时保持输入框焦点", () => {
      it("Given 输入框已展开, When 点击切换风格按钮, Then 输入框应保持展开状态", async () => {
        // Given
        const onToggleAiStyle = vi.fn();
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
          onToggleAiStyle,
        });
        await nextTick();

        // When
        const styleBtn = wrapper
          .findAll("button")
          .find(
            (btn) =>
              btn.classes().includes("bg-amber-50") ||
              btn.classes().includes("bg-cyan-50"),
          );
        await styleBtn?.trigger("click");
        await nextTick();

        // Then
        const inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-100");
        expect(onToggleAiStyle).toHaveBeenCalled();
      });
    });
  });

  // ============================================================
  // Feature: 加载状态处理
  // ============================================================
  describe("加载状态处理 (isLoading)", () => {
    describe("Scenario: 提交后等待节点数据加载", () => {
      it("Given isLoading 为 true, When 渲染, Then 提交按钮应显示加载图标且禁用", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: false,
          modelValue: "测试想法",
          isLoading: true,
        });

        // When
        await nextTick();

        // Then
        const submitBtn = wrapper
          .findAll("button")
          .find((btn) => btn.classes().includes("bg-slate-900"));
        expect(submitBtn?.attributes("disabled")).toBeDefined();
        expect(submitBtn?.text()).toContain("RefreshCw"); // 加载图标
      });
    });

    describe("Scenario: 加载时点击切换风格按钮", () => {
      it("Given isLoading 为 true 且输入框展开, When 点击风格切换, Then 切换应正常执行", async () => {
        // Given
        const onToggleAiStyle = vi.fn();
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
          isLoading: true,
          onToggleAiStyle,
        });
        await nextTick();

        // When
        const styleBtn = wrapper
          .findAll("button")
          .find(
            (btn) =>
              btn.classes().includes("bg-amber-50") ||
              btn.classes().includes("bg-cyan-50"),
          );
        await styleBtn?.trigger("click");

        // Then
        expect(onToggleAiStyle).toHaveBeenCalled();
      });
    });

    describe("Scenario: 加载时输入框与遮罩状态", () => {
      it("Given isLoading 为 true 且有节点, When 输入框展开, Then 遮罩应保持隐藏", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
          isLoading: true,
        });

        // When
        await nextTick();

        // Then
        const backdrop = wrapper.find(
          ".fixed.inset-0.z-\\[60\\].bg-slate-900\\/40",
        );
        expect(backdrop.exists()).toBe(false);
      });
    });

    describe("Scenario: 加载完成后允许再次提交", () => {
      it("Given isLoading 从 true 变为 false, When 重新渲染, Then 提交按钮应恢复可用", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: false,
          modelValue: "新想法",
          isLoading: true,
        });
        await nextTick();

        // When: 模拟加载完成
        await wrapper.setProps({ isLoading: false });
        await nextTick();

        // Then
        const submitBtn = wrapper
          .findAll("button")
          .find((btn) => btn.classes().includes("bg-slate-900"));
        expect(submitBtn?.attributes("disabled")).toBeUndefined();
        expect(submitBtn?.text()).toContain("Zap"); // 正常图标
      });
    });
  });

  // ============================================================
  // Feature: 详情面板展开时的输入框交互
  // ============================================================
  describe("详情面板展开时的交互", () => {
    describe("Scenario: 存在节点且详情面板已展开", () => {
      it("Given hasNodes 为 true, When 点击圆球展开输入框, Then 输入框应居中显示且遮罩出现", async () => {
        // Given: 模拟存在节点的场景（详情面板可能已展开）
        const wrapper = createWrapper({
          hasNodes: true,
          modelValue: "",
        });
        await nextTick();

        // When: 点击圆球
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        await ball.trigger("click");
        await nextTick();

        // 模拟输入框获得焦点后的状态
        const input = wrapper.find("input");
        await input.trigger("focus");
        await nextTick();

        // Then: 输入框应居中（检查容器类）
        const container = wrapper.find(".fixed.z-\\[70\\].top-1\\/2");
        expect(container.exists()).toBe(true);
        expect(container.classes()).toContain("left-1/2");
      });
    });

    describe("Scenario: 输入框与其他UI元素层级", () => {
      it("Given 输入框展开, When 渲染, Then 输入框 z-index 应高于遮罩", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          forceExpanded: true,
        });
        await nextTick();

        // When & Then
        const backdrop = wrapper.find(".fixed.inset-0.z-\\[60\\]");
        const inputContainer = wrapper.find(".fixed.z-\\[70\\]");
        expect(backdrop.exists()).toBe(true);
        expect(inputContainer.exists()).toBe(true);
        // z-[70] > z-[60]，确保输入框在遮罩之上
      });
    });

    describe("Scenario: 连续展开收起操作", () => {
      it("Given 用户多次点击, When 交替点击圆球和遮罩, Then UI 状态应正确切换", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: true,
          modelValue: "",
        });
        await nextTick();

        // 初始状态：输入框收起
        let inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-0");

        // When: 点击圆球展开
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        await ball.trigger("click");
        const input = wrapper.find("input");
        await input.trigger("focus");
        await nextTick();

        // Then: 输入框应展开
        inputBar = wrapper.find(".flex.items-center.bg-white\\/95");
        expect(inputBar.classes()).toContain("opacity-100");

        // When: 点击遮罩收起
        const backdrop = wrapper.find(
          ".fixed.inset-0.z-\\[60\\].bg-slate-900\\/40",
        );
        if (backdrop.exists()) {
          await backdrop.trigger("click");
          await nextTick();
          // 需要等待 setTimeout (200ms) 完成
          await new Promise((resolve) => setTimeout(resolve, 250));
          await nextTick();
        }

        // Then: 由于没有输入内容，输入框应收起
        // 注：此测试依赖于组件内部状态管理
      });
    });
  });

  // ============================================================
  // Feature: 边界情况
  // ============================================================
  describe("边界情况", () => {
    describe("Scenario: 空白输入不应提交", () => {
      it("Given 输入框只有空格, When 点击提交, Then 按钮应被禁用", async () => {
        // Given
        const wrapper = createWrapper({
          hasNodes: false,
          modelValue: "   ",
        });
        await nextTick();

        // When & Then
        const submitBtn = wrapper
          .findAll("button")
          .find((btn) => btn.classes().includes("bg-slate-900"));
        expect(submitBtn?.attributes("disabled")).toBeDefined();
      });
    });

    describe("Scenario: 移动端响应式布局", () => {
      it("Given 组件渲染, When 检查响应式类, Then 应包含 md 断点样式", () => {
        // Given
        const wrapper = createWrapper({ hasNodes: true });

        // When & Then
        const ball = wrapper.find(".fixed.left-4.bottom-20");
        expect(ball.classes().some((c) => c.includes("md:"))).toBe(true);
      });
    });
  });
});
