/**
 * useCloudStorage - 云存储 Composable
 * 管理节点/边数据与 Supabase 的增量同步
 *
 * 优化策略：
 * - 使用脏数据追踪，仅同步变更的节点/边
 * - 删除操作单独追踪并批量处理
 */
import { ref, toRaw } from "vue";
import { supabase } from "@/lib/supabase";
import { useAuth } from "./useAuth";
import { useProjects } from "./useProjects";
import type {
  Node as DbNode,
  Edge as DbEdge,
  Database,
} from "@/lib/database.types";

// Helper: Generate consistent hash for node change detection
// Only includes fields that are persisted to DB
const getNodeHash = (node: any) => {
  return JSON.stringify({
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      label: node.data?.label || "",
      title: node.data?.title || "",
      description: node.data?.description || "",
      detailedContent: node.data?.detailedContent || "",
      imageUrl: node.data?.imageUrl || "",
      childrenCount: node.data?.childrenCount || 0,
      isExpanding: node.data?.isExpanding || false,
      followUp: node.data?.followUp || "",
    },
  });
};

// Helper: Generate consistent hash for edge change detection
const getEdgeHash = (edge: any) => {
  return JSON.stringify({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: edge.type,
    style: edge.style || {},
  });
};

// Insert 类型别名
type NodeInsert = Database["public"]["Tables"]["nodes"]["Insert"];
type EdgeInsert = Database["public"]["Tables"]["edges"]["Insert"];

// 同步状态
const isSyncing = ref(false);
const lastSyncTime = ref<Date | null>(null);
const syncError = ref<string | null>(null);

// 脏数据追踪
const dirtyNodes = ref<Set<string>>(new Set());
const dirtyEdges = ref<Set<string>>(new Set());
const deletedNodes = ref<Set<string>>(new Set());
const deletedEdges = ref<Set<string>>(new Set());

// 上次同步的数据快照（用于比较变更）
let lastSyncedNodes: Map<string, string> = new Map();
let lastSyncedEdges: Map<string, string> = new Map();

export function useCloudStorage() {
  const { isAuthenticated } = useAuth();
  const { currentProject } = useProjects();

  /**
   * 标记节点为脏数据
   */
  const markNodeDirty = (nodeId: string) => {
    dirtyNodes.value.add(nodeId);
  };

  /**
   * 标记边为脏数据
   */
  const markEdgeDirty = (edgeId: string) => {
    dirtyEdges.value.add(edgeId);
  };

  /**
   * 标记节点为已删除
   */
  const markNodeDeleted = (nodeId: string) => {
    deletedNodes.value.add(nodeId);
    dirtyNodes.value.delete(nodeId);
  };

  /**
   * 标记边为已删除
   */
  const markEdgeDeleted = (edgeId: string) => {
    deletedEdges.value.add(edgeId);
    dirtyEdges.value.delete(edgeId);
  };

  /**
   * 检测节点变更并标记脏数据
   */
  const detectChanges = (currentNodes: any[], currentEdges: any[]) => {
    // 检测节点变更
    const currentNodeIds = new Set<string>();
    for (const node of currentNodes) {
      currentNodeIds.add(node.id);
      const nodeHash = getNodeHash(node);
      if (lastSyncedNodes.get(node.id) !== nodeHash) {
        dirtyNodes.value.add(node.id);
      }
    }
    // 检测已删除的节点
    for (const [nodeId] of lastSyncedNodes) {
      if (!currentNodeIds.has(nodeId)) {
        deletedNodes.value.add(nodeId);
      }
    }

    // 检测边变更
    const currentEdgeIds = new Set<string>();
    for (const edge of currentEdges) {
      currentEdgeIds.add(edge.id);
      const edgeHash = getEdgeHash(edge);
      if (lastSyncedEdges.get(edge.id) !== edgeHash) {
        dirtyEdges.value.add(edge.id);
      }
    }
    // 检测已删除的边
    for (const [edgeId] of lastSyncedEdges) {
      if (!currentEdgeIds.has(edgeId)) {
        deletedEdges.value.add(edgeId);
      }
    }
  };

  /**
   * 增量保存节点到云端（仅脏数据）
   */
  const saveNodesToCloud = async (nodes: any[]) => {
    if (!isAuthenticated.value || !currentProject.value) return false;
    if (dirtyNodes.value.size === 0) return true;

    try {
      isSyncing.value = true;
      syncError.value = null;

      const projectId = currentProject.value.id;
      const dirtyNodeIds = Array.from(dirtyNodes.value);

      // 只保存脏数据
      const nodesToSave = nodes.filter((n) => dirtyNodeIds.includes(n.id));

      if (nodesToSave.length === 0) return true;

      console.log(`[CloudSync] 增量同步 ${nodesToSave.length} 个节点`);

      const nodeRecords: NodeInsert[] = nodesToSave.map((node) => ({
        project_id: projectId,
        node_id: node.id,
        type: node.type || "window",
        position: node.position,
        title: node.data?.title || node.data?.label || null,
        description: node.data?.description || null,
        detailed_content: node.data?.detailedContent || null,
        image_url: node.data?.imageUrl || null,
        children_count: node.data?.childrenCount || 0,
        is_expanding: node.data?.isExpanding || false,
        follow_up: node.data?.followUp || null,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("nodes")
        .upsert(nodeRecords as any, { onConflict: "project_id,node_id" });

      if (error) throw error;

      // 更新快照
      for (const node of nodesToSave) {
        lastSyncedNodes.set(node.id, getNodeHash(node));
      }

      // 清除已同步的脏标记
      dirtyNodes.value.clear();
      lastSyncTime.value = new Date();
      return true;
    } catch (error: any) {
      console.error("保存节点到云端失败:", error);
      syncError.value = error.message;
      return false;
    } finally {
      isSyncing.value = false;
    }
  };

  /**
   * 增量保存边到云端（仅脏数据）
   */
  const saveEdgesToCloud = async (edges: any[]) => {
    if (!isAuthenticated.value || !currentProject.value) return false;
    if (dirtyEdges.value.size === 0) return true;

    try {
      const projectId = currentProject.value.id;
      const dirtyEdgeIds = Array.from(dirtyEdges.value);

      const edgesToSave = edges.filter((e) => dirtyEdgeIds.includes(e.id));

      if (edgesToSave.length === 0) return true;

      console.log(`[CloudSync] 增量同步 ${edgesToSave.length} 条边`);

      const edgeRecords: EdgeInsert[] = edgesToSave.map((edge) => ({
        project_id: projectId,
        edge_id: edge.id,
        source_node_id: edge.source,
        target_node_id: edge.target,
        type: edge.type || "smoothstep",
        style: edge.style || {},
      }));

      const { error } = await supabase
        .from("edges")
        .upsert(edgeRecords as any, { onConflict: "project_id,edge_id" });

      if (error) throw error;

      // 更新快照
      for (const edge of edgesToSave) {
        lastSyncedEdges.set(edge.id, getEdgeHash(edge));
      }

      dirtyEdges.value.clear();
      return true;
    } catch (error: any) {
      console.error("保存边到云端失败:", error);
      syncError.value = error.message;
      return false;
    }
  };

  /**
   * 批量删除已删除的节点和边
   */
  const syncDeletions = async () => {
    if (!isAuthenticated.value || !currentProject.value) return;

    const projectId = currentProject.value.id;

    // 删除节点
    if (deletedNodes.value.size > 0) {
      const nodeIds = Array.from(deletedNodes.value);
      console.log(`[CloudSync] 删除 ${nodeIds.length} 个节点`);

      await supabase
        .from("nodes")
        .delete()
        .eq("project_id", projectId)
        .in("node_id", nodeIds);

      for (const id of nodeIds) {
        lastSyncedNodes.delete(id);
      }
      deletedNodes.value.clear();
    }

    // 删除边
    if (deletedEdges.value.size > 0) {
      const edgeIds = Array.from(deletedEdges.value);
      console.log(`[CloudSync] 删除 ${edgeIds.length} 条边`);

      await supabase
        .from("edges")
        .delete()
        .eq("project_id", projectId)
        .in("edge_id", edgeIds);

      for (const id of edgeIds) {
        lastSyncedEdges.delete(id);
      }
      deletedEdges.value.clear();
    }
  };

  /**
   * 从云端加载项目数据
   */
  const loadFromCloud = async (projectId: string) => {
    if (!isAuthenticated.value) return null;

    try {
      isSyncing.value = true;
      syncError.value = null;

      const [nodesRes, edgesRes] = await Promise.all([
        supabase.from("nodes").select("*").eq("project_id", projectId),
        supabase.from("edges").select("*").eq("project_id", projectId),
      ]);

      if (nodesRes.error) throw nodesRes.error;
      if (edgesRes.error) throw edgesRes.error;

      // 转换并缓存节点
      console.log("[CloudSync Debug] 原始云端节点数据:", nodesRes.data);

      const nodes = ((nodesRes.data || []) as DbNode[]).map((n) => {
        // 调试：记录每个节点原始的 is_expanding 状态
        console.log(
          `[CloudSync Debug] 节点 ${n.node_id} 原始 is_expanding:`,
          n.is_expanding,
        );

        const node = {
          id: n.node_id,
          type: n.type,
          position: n.position as { x: number; y: number },
          data: {
            label: n.title,
            title: n.title,
            description: n.description,
            detailedContent: n.detailed_content,
            imageUrl: n.image_url,
            childrenCount: n.children_count,
            // 关键修复：从云端加载后，强制重置 isExpanding 为 false
            // 防止因上次保存时的中间状态导致点击无效
            isExpanding: false,
            followUp: n.follow_up,
            type: n.type,
          },
        };
        // 初始化快照
        lastSyncedNodes.set(node.id, getNodeHash(node));
        return node;
      });

      // 转换并缓存边
      const edges = ((edgesRes.data || []) as DbEdge[]).map((e) => {
        const edge = {
          id: e.edge_id,
          source: e.source_node_id,
          target: e.target_node_id,
          type: e.type,
          style: e.style,
        };
        lastSyncedEdges.set(edge.id, getEdgeHash(edge));
        return edge;
      });

      // 清除脏标记
      dirtyNodes.value.clear();
      dirtyEdges.value.clear();
      deletedNodes.value.clear();
      deletedEdges.value.clear();

      lastSyncTime.value = new Date();
      return { nodes, edges };
    } catch (error: any) {
      console.error("从云端加载数据失败:", error);
      syncError.value = error.message;
      return null;
    } finally {
      isSyncing.value = false;
    }
  };

  /**
   * 重置同步状态（切换项目时调用）
   */
  const resetSyncState = () => {
    dirtyNodes.value.clear();
    dirtyEdges.value.clear();
    deletedNodes.value.clear();
    deletedEdges.value.clear();
    lastSyncedNodes.clear();
    lastSyncedEdges.clear();
  };

  /**
   * 获取待同步数量
   */
  const getPendingChanges = () => ({
    dirtyNodes: dirtyNodes.value.size,
    dirtyEdges: dirtyEdges.value.size,
    deletedNodes: deletedNodes.value.size,
    deletedEdges: deletedEdges.value.size,
  });

  return {
    isSyncing,
    lastSyncTime,
    syncError,
    saveNodesToCloud,
    saveEdgesToCloud,
    loadFromCloud,
    syncDeletions,
    markNodeDirty,
    markEdgeDirty,
    markNodeDeleted,
    markEdgeDeleted,
    detectChanges,
    resetSyncState,
    getPendingChanges,
  };
}
