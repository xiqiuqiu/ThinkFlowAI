<script setup lang="ts">
/**
 * ProjectSelector - 项目选择器组件
 * 显示项目列表，支持创建、切换、删除项目
 */
import { ref, watch } from "vue";
import { useProjects } from "@/composables/useProjects";
import { useAuth } from "@/composables/useAuth";
import {
  FolderOpen,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  Loader2,
} from "lucide-vue-next";

const props = defineProps<{
  t: (key: string) => string;
}>();

const { isAuthenticated } = useAuth();
const {
  projects,
  currentProject,
  loading,
  fetchProjects,
  createProject,
  deleteProject,
  selectProject,
} = useProjects();

// UI 状态
const isOpen = ref(false);
const isCreating = ref(false);
const newProjectName = ref("");

// 监听认证状态变化，自动获取项目列表
watch(
  isAuthenticated,
  async (authenticated) => {
    if (authenticated) {
      await fetchProjects();
      // 自动选择第一个项目
      if (projects.value.length > 0 && !currentProject.value) {
        selectProject(projects.value[0]);
      }
    }
  },
  { immediate: true },
);

const handleCreate = async () => {
  if (!newProjectName.value.trim()) return;

  await createProject(newProjectName.value.trim());
  newProjectName.value = "";
  isCreating.value = false;
};

const handleDelete = async (id: string, e: Event) => {
  e.stopPropagation();
  if (confirm(props.t("project.deleteConfirm"))) {
    await deleteProject(id);
  }
};

const handleSelect = (project: (typeof projects.value)[0]) => {
  selectProject(project);
  isOpen.value = false;
};
</script>

<template>
  <div v-if="isAuthenticated" class="relative">
    <!-- Trigger Button -->
    <button
      @click="isOpen = !isOpen"
      class="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:border-slate-300 hover:shadow-sm transition-all"
    >
      <FolderOpen class="w-4 h-4 text-orange-500" />
      <span class="max-w-[120px] truncate">
        {{ currentProject?.name || t("project.select") }}
      </span>
      <ChevronDown
        class="w-3 h-3 text-slate-400 transition-transform"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <!-- Dropdown -->
    <Transition
      enter-active-class="transition-all duration-200"
      leave-active-class="transition-all duration-150"
      enter-from-class="opacity-0 -translate-y-2"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div
        v-if="isOpen"
        class="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden"
      >
        <!-- Header -->
        <div class="px-4 py-3 border-b border-slate-100 bg-slate-50">
          <span
            class="text-xs font-black text-slate-400 uppercase tracking-widest"
          >
            {{ t("project.title") }}
          </span>
        </div>

        <!-- Project List -->
        <div class="max-h-[200px] overflow-y-auto">
          <div v-if="loading" class="flex items-center justify-center py-6">
            <Loader2 class="w-5 h-5 text-orange-500 animate-spin" />
          </div>

          <div
            v-else-if="projects.length === 0"
            class="text-center py-6 text-xs text-slate-400"
          >
            {{ t("project.empty") }}
          </div>

          <button
            v-else
            v-for="project in projects"
            :key="project.id"
            @click="handleSelect(project)"
            class="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group text-left"
          >
            <FolderOpen
              class="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition-colors"
            />
            <span class="flex-1 text-sm text-slate-700 truncate">
              {{ project.name }}
            </span>
            <Check
              v-if="currentProject?.id === project.id"
              class="w-4 h-4 text-green-500"
            />
            <button
              @click="handleDelete(project.id, $event)"
              class="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-100 rounded transition-all"
            >
              <Trash2 class="w-3 h-3 text-rose-400" />
            </button>
          </button>
        </div>

        <!-- Create New -->
        <div class="border-t border-slate-100 p-3">
          <div v-if="isCreating" class="flex items-center gap-2">
            <input
              v-model="newProjectName"
              @keyup.enter="handleCreate"
              :placeholder="t('project.namePlaceholder')"
              class="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-400 transition-colors"
              autofocus
            />
            <button
              @click="handleCreate"
              :disabled="!newProjectName.trim()"
              class="px-3 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {{ t("common.confirm") }}
            </button>
          </div>
          <button
            v-else
            @click="isCreating = true"
            class="w-full flex items-center gap-2 px-3 py-2 text-orange-500 text-xs font-bold hover:bg-orange-50 rounded-lg transition-colors"
          >
            <Plus class="w-4 h-4" />
            {{ t("project.create") }}
          </button>
        </div>
      </div>
    </Transition>

    <!-- Backdrop -->
    <div v-if="isOpen" class="fixed inset-0 z-40" @click="isOpen = false" />
  </div>
</template>
