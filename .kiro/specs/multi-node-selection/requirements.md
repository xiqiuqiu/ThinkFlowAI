# Requirements Document

## Introduction

This document specifies the requirements for enhancing multi-node selection and implementing group movement functionality in ThinkFlow AI, a Vue 3 + VueFlow mind mapping application. VueFlow provides built-in multi-selection capabilities (Shift+click and box selection), but the current implementation lacks group movement support. This feature will enable users to move multiple selected nodes together as a cohesive group, improving efficiency when reorganizing large mind maps.

## Glossary

- **Node**: A visual element on the canvas representing a concept or idea in the mind map
- **Selection**: The act of marking one or more nodes as active for subsequent operations
- **Multi_Selection**: A state where two or more nodes are simultaneously selected (VueFlow built-in feature)
- **Group_Movement**: The coordinated repositioning of all selected nodes while maintaining their relative spatial relationships
- **Box_Selection**: A selection method where users drag a rectangular area to select all nodes within it (VueFlow built-in feature)
- **VueFlow_Selection_System**: Built-in VueFlow functionality that handles node selection state and visual feedback
- **Hierarchical_Dragging**: Existing feature where child nodes automatically move with their parent node
- **Descendant_Node**: Any node that is a child, grandchild, or further descendant of a given node
- **VueFlow**: The canvas library used for rendering and managing nodes and edges
- **Snap_To_Grid**: Feature that aligns node positions to a grid during movement
- **Alignment_Guide**: Visual indicator showing when nodes align with other nodes during dragging

## Requirements

### Requirement 1: Multi-Node Selection via Shift+Click (VueFlow Built-in)

**User Story:** As a user, I want to select multiple nodes by holding Shift and clicking them, so that I can group related nodes for batch operations.

#### Acceptance Criteria

1. WHEN a user holds Shift and clicks an unselected node, THE VueFlow_Selection_System SHALL add that node to the current selection
2. WHEN a user holds Shift and clicks a selected node, THE VueFlow_Selection_System SHALL remove that node from the current selection
3. WHEN a user clicks a node without holding Shift, THE VueFlow_Selection_System SHALL clear all previous selections and select only the clicked node
4. WHEN multiple nodes are selected, THE VueFlow_Selection_System SHALL visually indicate all selected nodes with the `.selected` class

### Requirement 2: Multi-Node Selection via Box Selection (VueFlow Built-in)

**User Story:** As a user, I want to drag a box around multiple nodes to select them all at once, so that I can quickly select groups of nodes without clicking each one individually.

#### Acceptance Criteria

1. WHEN a user holds Shift and drags on the canvas background, THE VueFlow_Selection_System SHALL display a selection box rectangle
2. WHEN the selection box overlaps with nodes, THE VueFlow_Selection_System SHALL highlight those nodes as candidates for selection
3. WHEN the user releases the mouse button, THE VueFlow_Selection_System SHALL add all nodes within the selection box to the current selection
4. WHEN the selection box is dragged, THE VueFlow_Selection_System SHALL update the visual feedback in real-time

### Requirement 3: Group Movement of Selected Nodes

**User Story:** As a user, I want to drag any selected node to move all selected nodes together, so that I can reorganize multiple nodes while maintaining their spatial relationships.

#### Acceptance Criteria

1. WHEN a user drags any node in a multi-selection, THE System SHALL move all selected nodes by the same delta
2. WHEN selected nodes are moved, THE System SHALL maintain the relative positions between all selected nodes
3. WHEN a selected node is dragged, THE System SHALL update positions of all selected nodes in real-time
4. WHEN group movement completes, THE System SHALL persist the new positions of all selected nodes

### Requirement 4: Integration with Hierarchical Dragging

**User Story:** As a user, I want multi-node selection to work seamlessly with hierarchical dragging, so that child nodes move correctly without duplicate position updates.

#### Acceptance Criteria

1. WHEN a selected node has descendant nodes, THE System SHALL move those descendants with the parent
2. WHEN a descendant node is also in the selection, THE System SHALL apply position updates only once to avoid duplicate movement
3. WHEN hierarchical dragging is enabled in config, THE System SHALL respect that setting during group movement
4. WHEN hierarchical dragging is disabled in config, THE System SHALL only move explicitly selected nodes

### Requirement 5: Integration with Snap-to-Grid and Alignment Guides

**User Story:** As a user, I want snap-to-grid and alignment guides to work with multi-node selection, so that I can precisely position groups of nodes.

#### Acceptance Criteria

1. WHEN snap-to-grid is enabled and a group is dragged, THE System SHALL snap the dragged node to the grid
2. WHEN snap-to-alignment is enabled and a group is dragged, THE System SHALL show alignment guides for the dragged node
3. WHEN a dragged node snaps to grid or alignment, THE System SHALL apply the snap offset to all selected nodes
4. WHEN alignment guides are displayed during group movement, THE System SHALL calculate guides based on the actively dragged node

### Requirement 6: Visual Feedback for Multi-Selection

**User Story:** As a user, I want clear visual feedback when multiple nodes are selected, so that I can easily see which nodes will be affected by my actions.

#### Acceptance Criteria

1. WHEN multiple nodes are selected, THE System SHALL apply a distinct visual style to all selected nodes
2. WHEN a box selection is in progress, THE System SHALL display a semi-transparent selection rectangle
3. WHEN nodes are being dragged as a group, THE System SHALL maintain the selected visual style on all moving nodes
4. WHEN the selection changes, THE System SHALL update the visual feedback within 100ms

### Requirement 7: Selection State Management (VueFlow Built-in)

**User Story:** As a developer, I want proper selection state management, so that the system maintains consistent selection state across all operations.

#### Acceptance Criteria

1. THE VueFlow_Selection_System SHALL track which nodes are currently selected using the node `.selected` property
2. WHEN nodes are added or removed from the canvas, THE VueFlow_Selection_System SHALL update the selection state accordingly
3. WHEN a node is deleted, THE VueFlow_Selection_System SHALL remove it from the selection
4. WHEN the canvas is reset, THE System SHALL clear all selections by calling VueFlow selection management functions

### Requirement 8: Keyboard Interaction Support

**User Story:** As a user, I want keyboard shortcuts to work with multi-selection, so that I can efficiently manage selections without relying solely on mouse input.

#### Acceptance Criteria

1. WHEN a user presses Escape, THE System SHALL clear all current selections
2. WHEN a user presses Ctrl+A (or Cmd+A on Mac), THE System SHALL select all visible nodes
3. WHEN Space is pressed during multi-selection, THE System SHALL allow canvas panning without affecting the selection
4. WHEN keyboard shortcuts are triggered, THE System SHALL provide appropriate visual feedback
