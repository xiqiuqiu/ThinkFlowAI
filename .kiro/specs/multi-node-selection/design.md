# Design Document: Multi-Node Selection and Group Movement

## Overview

This design document describes the implementation of group movement functionality for multi-node selection in ThinkFlow AI. VueFlow provides built-in multi-selection capabilities through Shift+click and box selection, so this design focuses on extending the existing `handleNodeDrag` function to support moving multiple selected nodes simultaneously while maintaining their relative positions and integrating with existing features like hierarchical dragging, snap-to-grid, and alignment guides.

The implementation will be minimal and focused, modifying only the drag handling logic in `useThinkFlow.ts` to detect when multiple nodes are selected and apply position deltas to all selected nodes.

## Architecture

### Current Architecture

ThinkFlow AI uses a centralized composable pattern:
- **useThinkFlow.ts**: Contains all business logic including node drag handling
- **App.vue**: Configures VueFlow with `selectionKeyCode="Shift"` for multi-selection
- **VueFlow**: Provides built-in selection state management via node `.selected` property

### Drag Handling Flow

```
User drags node
  ↓
VueFlow fires onNodeDrag event
  ↓
handleNodeDrag() in useThinkFlow.ts
  ↓
Current: Moves dragged node + descendants (if hierarchical dragging enabled)
  ↓
New: Check if multiple nodes selected
  ↓
If yes: Move all selected nodes by same delta
  ↓
Apply snap-to-grid/alignment to dragged node
  ↓
Propagate snap offset to all selected nodes
```

## Components and Interfaces

### Modified Components

#### useThinkFlow.ts

**Existing Functions to Modify:**
- `handleNodeDrag(payload)`: Main drag handler that needs multi-selection support

**New Helper Functions:**
None required - will use existing VueFlow state (`flowNodes.value.filter(n => n.selected)`)

### VueFlow Integration Points

**Built-in Features We'll Use:**
- `node.selected`: Boolean property automatically managed by VueFlow
- `onNodeDrag`: Event handler that fires during drag operations
- `flowNodes.value`: Reactive array of all nodes with current state

**No New Props Needed:**
- `selectionKeyCode="Shift"` already configured in App.vue
- Box selection works automatically with this configuration

## Data Models

### Node Selection State

VueFlow manages selection state automatically:

```typescript
interface GraphNode {
  id: string
  position: { x: number; y: number }
  selected: boolean  // Managed by VueFlow
  data: any
  // ... other properties
}
```

### Drag State Tracking

Existing state in useThinkFlow.ts:

```typescript
const draggingNodeId = ref<string | null>(null)
const dragLastPositionByNodeId = new Map<string, { x: number; y: number }>()
```

**Enhancement needed:**
Track last positions for all selected nodes during drag operation.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Group Movement Maintains Relative Positions

*For any* set of two or more selected nodes with initial positions, when any selected node is dragged by delta (dx, dy), all selected nodes should move by the same delta such that the pairwise distances between all selected nodes remain constant.

**Validates: Requirements 3.1, 3.2**

### Property 2: Descendant Nodes Move Only Once

*For any* tree structure with selected nodes, when a selected node is dragged, each node in the tree should receive exactly one position update, regardless of whether it is selected, a descendant of a selected node, or both.

**Validates: Requirements 4.2**

### Property 3: Hierarchical Dragging Config Respected

*For any* selected node with descendant nodes, when the node is dragged, if hierarchical dragging is enabled then descendants should move with the parent, and if hierarchical dragging is disabled then only explicitly selected nodes should move.

**Validates: Requirements 4.1, 4.3, 4.4**

### Property 4: Snap Offset Propagates to Group

*For any* group of selected nodes, when the actively dragged node snaps to grid or alignment by offset (ox, oy), all other selected nodes should also move by the same snap offset in addition to the drag delta.

**Validates: Requirements 5.3**

### Property 5: Dragged Node Snaps Correctly

*For any* dragged node in a multi-selection, when snap-to-grid is enabled, the dragged node's final position should align to the grid according to the configured snap grid dimensions.

**Validates: Requirements 5.1**

### Property 6: Alignment Calculation Uses Dragged Node

*For any* group of selected nodes being dragged, when snap-to-alignment is enabled, the alignment guides should be calculated based on the actively dragged node's position, not other selected nodes.

**Validates: Requirements 5.4**

### Property 7: Selection State Reflects VueFlow State

*For any* point in time during drag operations, the set of nodes considered "selected" by the drag handler should exactly match the set of nodes where `node.selected === true` in VueFlow's state.

**Validates: Requirements 7.1**

### Property 8: Group Positions Persist Correctly

*For any* group of selected nodes that are moved together, when the drag operation completes, all new positions should be persisted to localStorage and restored correctly on page reload.

**Validates: Requirements 3.4**

## Error Handling

### Edge Cases

1. **Empty Selection During Drag**
   - Scenario: User drags a node that becomes deselected mid-drag
   - Handling: Fall back to single-node drag behavior
   - Implementation: Check `selectedNodes.length` at start of drag operation

2. **Circular Dependencies in Hierarchy**
   - Scenario: Node A is parent of B, B is selected, A is dragged
   - Handling: Existing `getDescendantIds` uses Set to prevent infinite loops
   - No changes needed

3. **Snap Calculation with Multiple Nodes**
   - Scenario: Multiple selected nodes, only dragged node should calculate snap
   - Handling: Calculate snap for dragged node only, apply offset to others
   - Implementation: Snap logic runs before group movement logic

4. **Hierarchical Dragging Disabled**
   - Scenario: User has disabled hierarchical dragging in config
   - Handling: Only move explicitly selected nodes, skip descendant logic
   - Implementation: Respect existing `config.hierarchicalDragging` check

### Error States

No new error states introduced. Existing error handling for drag operations remains unchanged.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:
- **Unit tests**: Verify specific examples, edge cases, and keyboard shortcuts
- **Property tests**: Verify universal properties across randomized inputs
- Both are complementary and necessary for comprehensive coverage

### Unit Tests

Unit tests should focus on specific scenarios and edge cases:

1. **Single Node Drag (Regression Test)**
   - Verify existing single-node drag still works
   - Test with hierarchical dragging on/off
   - Test with snap-to-grid on/off

2. **Empty Selection Edge Case**
   - Drag a node when no nodes are selected
   - Verify it behaves like single-node drag

3. **Keyboard Shortcuts (Examples)**
   - Test Escape key clears selection (Requirement 8.1)
   - Test Ctrl+A/Cmd+A selects all visible nodes (Requirement 8.2)
   - Test Space key allows panning without clearing selection (Requirement 8.3)

4. **Canvas Reset**
   - Test that reset operation clears all selections (Requirement 7.4)

### Property-Based Tests

Property tests should verify universal correctness across randomized inputs. Each test must run a minimum of 100 iterations and include a comment tag referencing the design property.

1. **Property Test: Relative Position Preservation**
   - Generate random sets of 2-10 selected nodes with random positions
   - Apply random drag deltas (-500 to +500 in x and y)
   - Calculate all pairwise distances before and after drag
   - Verify all pairwise distances remain constant (within floating-point tolerance)
   - **Feature: multi-node-selection, Property 1: Group Movement Maintains Relative Positions**
   - **Validates: Requirements 3.1, 3.2**
   - Minimum 100 iterations

2. **Property Test: No Duplicate Descendant Updates**
   - Generate random tree structures (3-20 nodes, depth 1-4)
   - Randomly select 1-5 nodes (including some parent-child pairs)
   - Track position update count for each node during drag
   - Verify each node receives exactly one position update
   - **Feature: multi-node-selection, Property 2: Descendant Nodes Move Only Once**
   - **Validates: Requirements 4.2**
   - Minimum 100 iterations

3. **Property Test: Hierarchical Dragging Config**
   - Generate random tree structures with random selections
   - Test with config.hierarchicalDragging = true and false
   - When true: verify non-selected descendants move with selected parents
   - When false: verify only selected nodes move
   - **Feature: multi-node-selection, Property 3: Hierarchical Dragging Config Respected**
   - **Validates: Requirements 4.1, 4.3, 4.4**
   - Minimum 100 iterations

4. **Property Test: Snap Offset Propagation**
   - Generate random selected node groups (2-8 nodes)
   - Apply random snap offsets to dragged node (-32 to +32 pixels)
   - Verify all selected nodes receive same snap offset
   - Verify relative positions still maintained after snap
   - **Feature: multi-node-selection, Property 4: Snap Offset Propagates to Group**
   - **Validates: Requirements 5.3**
   - Minimum 100 iterations

5. **Property Test: Dragged Node Snap Alignment**
   - Generate random dragged node positions
   - Enable snap-to-grid with random grid sizes (8, 16, 24, 32)
   - Drag to random positions
   - Verify dragged node position is aligned to grid (position % gridSize === 0)
   - **Feature: multi-node-selection, Property 5: Dragged Node Snaps Correctly**
   - **Validates: Requirements 5.1**
   - Minimum 100 iterations

6. **Property Test: Alignment Uses Dragged Node**
   - Generate random multi-node selections
   - Calculate alignment guides
   - Verify guide calculations use dragged node's position as reference
   - Verify other selected nodes' positions don't affect guide calculation
   - **Feature: multi-node-selection, Property 6: Alignment Calculation Uses Dragged Node**
   - **Validates: Requirements 5.4**
   - Minimum 100 iterations

7. **Property Test: Selection State Synchronization**
   - Generate random node sets with random selection states
   - Query VueFlow state for selected nodes
   - Query drag handler's view of selected nodes
   - Verify both sets are identical
   - **Feature: multi-node-selection, Property 7: Selection State Reflects VueFlow State**
   - **Validates: Requirements 7.1**
   - Minimum 100 iterations

8. **Property Test: Group Position Persistence**
   - Generate random selected node groups
   - Apply random drag movements
   - Verify all positions saved to localStorage
   - Simulate page reload
   - Verify all positions restored correctly
   - **Feature: multi-node-selection, Property 8: Group Positions Persist Correctly**
   - **Validates: Requirements 3.4**
   - Minimum 100 iterations

### Integration Tests

Integration tests should verify interaction with existing features:

1. **Hierarchical Dragging Integration**
   - Select parent and some (not all) children
   - Drag parent
   - Verify selected children move once, non-selected children move once

2. **Snap-to-Grid Integration**
   - Enable snap-to-grid
   - Select multiple nodes
   - Drag one node until it snaps
   - Verify all nodes snap together maintaining relative positions

3. **Alignment Guide Integration**
   - Enable alignment guides
   - Select multiple nodes
   - Drag until alignment guide appears
   - Verify all nodes align together

### Testing Configuration

- **Framework**: Vitest (already used in project)
- **Property Testing Library**: fast-check (TypeScript/JavaScript property-based testing)
- **Installation**: `npm install --save-dev fast-check`
- **Test Location**: `src/composables/__tests__/useThinkFlow.multiselection.test.ts`
- **Minimum Iterations**: 100 per property test
- **Test Tags**: Each test must include comment with property reference
- **Tag Format**: `// Feature: multi-node-selection, Property N: [property text]`

## Implementation Notes

### Minimal Code Changes

The implementation requires modifying only one function in `useThinkFlow.ts`:

**handleNodeDrag(payload)**

Changes needed:
1. At start of function: Get list of selected nodes from `flowNodes.value`
2. After snap calculation: If multiple nodes selected, apply same delta to all
3. In hierarchical dragging section: Skip descendants that are also selected
4. Track last positions for all selected nodes, not just dragged node

### Performance Considerations

- **Selection Query**: `flowNodes.value.filter(n => n.selected)` runs once per drag event
- **Position Updates**: O(n) where n = number of selected nodes
- **Descendant Checking**: Existing Set-based approach prevents O(n²) behavior
- **Expected Performance**: No noticeable impact for typical mind maps (<100 nodes)

### Backward Compatibility

- All existing drag behaviors preserved when only one node selected
- No changes to VueFlow configuration
- No changes to node data structure
- No changes to UI components

### Future Enhancements (Out of Scope)

- Keyboard shortcuts (Ctrl+A to select all, Escape to clear selection)
- Visual feedback improvements (selection count indicator)
- Undo/redo for group movements
- Group rotation or scaling operations
