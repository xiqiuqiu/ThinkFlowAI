/**
 * useProjects - 项目管理 Composable
 * 管理用户项目的 CRUD 操作
 */
import { ref, computed } from "vue";
import { supabase } from "@/lib/supabase";
import type { Project } from "@/lib/database.types";
import { useAuth } from "./useAuth";

// 全局单例状态
const projects = ref<Project[]>([]);
const currentProject = ref<Project | null>(null);
const loading = ref(false);

export function useProjects() {
  const { userId, isAuthenticated } = useAuth();

  const hasProjects = computed(() => projects.value.length > 0);
  const projectCount = computed(() => projects.value.length);

  /**
   * 获取用户所有项目
   */
  const fetchProjects = async () => {
    if (!isAuthenticated.value) return;

    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) throw error;
      projects.value = data ?? [];
    } catch (error) {
      console.error("获取项目列表失败:", error);
    } finally {
      loading.value = false;
    }
  };

  /**
   * 创建新项目
   */
  const createProject = async (name: string, description?: string) => {
    if (!userId.value) throw new Error("用户未登录");

    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("projects")
        .insert({
          user_id: userId.value,
          name,
          description: description ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      projects.value.unshift(data);
      currentProject.value = data;
      return data;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 更新项目信息
   */
  const updateProject = async (
    id: string,
    updates: Partial<Pick<Project, "name" | "description" | "config">>,
  ) => {
    loading.value = true;
    try {
      const { data, error } = await supabase
        .from("projects")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      const index = projects.value.findIndex((p) => p.id === id);
      if (index !== -1) {
        projects.value[index] = data;
      }
      if (currentProject.value?.id === id) {
        currentProject.value = data;
      }
      return data;
    } finally {
      loading.value = false;
    }
  };

  /**
   * 删除项目
   */
  const deleteProject = async (id: string) => {
    loading.value = true;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);

      if (error) throw error;

      // 清理对应的 localStorage 缓存
      localStorage.removeItem(`thinkflow_${id}_nodes`);
      localStorage.removeItem(`thinkflow_${id}_edges`);
      localStorage.removeItem(`thinkflow_${id}_collapsed`);

      projects.value = projects.value.filter((p) => p.id !== id);
      if (currentProject.value?.id === id) {
        currentProject.value = projects.value[0] ?? null;
      }
    } finally {
      loading.value = false;
    }
  };

  /**
   * 切换当前项目
   */
  const selectProject = (project: Project) => {
    currentProject.value = project;
  };

  /**
   * 根据 ID 获取项目
   */
  const getProjectById = (id: string) => {
    return projects.value.find((p) => p.id === id) ?? null;
  };

  /**
   * 重置项目状态（登出时调用）
   */
  const resetProject = () => {
    projects.value = [];
    currentProject.value = null;
    console.log("[Projects] 项目状态已重置");
  };

  return {
    projects,
    currentProject,
    loading,
    hasProjects,
    projectCount,
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    selectProject,
    getProjectById,
    resetProject,
  };
}
