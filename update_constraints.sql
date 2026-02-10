-- Add unique constraint to nodes table
alter table public.nodes
  add constraint nodes_project_id_node_id_key unique (project_id, node_id);

-- Add unique constraint to edges table
alter table public.edges
  add constraint edges_project_id_edge_id_key unique (project_id, edge_id);
