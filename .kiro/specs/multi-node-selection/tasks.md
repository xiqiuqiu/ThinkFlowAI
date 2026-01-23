# Implementation Plan: Multi-Node Selection and Group Movement

## Overview

This implementation plan focuses on extending the existing `handleNodeDrag` function in `useThinkFlow.ts` to support group movement when multiple nodes are selected. VueFlow already provides multi-selection capabilities (Shift+click and box selection), so the implementation is minimal and focused on drag handling logic.

## Tasks

- [~] 1. Set up testing infrastructure
  - Install fast-check library for property-based testing
  - Create test file structure for multi-selection tests
  - Set up test utilities for generating random node structures
  - _Requirements: All (testing foundation)_

- [ ] 2. Implement core group movement logic
  - [~] 2.1 Modify handleNodeDrag to detect multi-selection
    - At start of handleNodeDrag, query flowNodes for selected nodes
    - Store selected nodes list for use throughout drag operation
    - _Requirements: 3.1, 3.2, 7.1_
  
  - [ ] 2.2 Implement group position updates
    - After calculating drag delta for primary node, apply same delta to all selected nodes
    - Update dragLastPositionByNodeId map to track all selected nodes
    - Ensure position updates maintain relative spatial relationships
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 2.3 Write property test for relative position preservation
    - **Property 1: Group Movement Maintains Relative Positions**
    - **Validates: Requirements 3.1, 3.2**
    - Generate random node sets (2-10 nodes), apply random deltas, verify pairwise distances constant
    - Minimum 100 iterations

- [ ] 3. Integrate with hierarchical dragging
  - [ ] 3.1 Prevent duplicate descendant updates
    - Modify descendant movement logic to check if descendant is in selection
    - Skip position update for descendants that are also selected
    - Use Set for O(1) lookup of selected node IDs
    - _Requirements: 4.2_
  
  - [ ] 3.2 Respect hierarchical dragging config
    - Ensure config.hierarchicalDragging flag is checked before moving descendants
    - When disabled, only move explicitly selected nodes
    - When enabled, move descendants of selected nodes (excluding selected descendants)
    - _Requirements: 4.1, 4.3, 4.4_
  
  - [ ]* 3.3 Write property test for no duplicate updates
    - **Property 2: Descendant Nodes Move Only Once**
    - **Validates: Requirements 4.2**
    - Generate random trees, track update counts, verify each node updated exactly once
    - Minimum 100 iterations
  
  - [ ]* 3.4 Write property test for hierarchical config
    - **Property 3: Hierarchical Dragging Config Respected**
    - **Validates: Requirements 4.1, 4.3, 4.4**
    - Test with config on/off, verify descendants move correctly
    - Minimum 100 iterations

- [ ] 4. Checkpoint - Ensure core functionality works
  - Manually test dragging multiple selected nodes
  - Verify relative positions maintained
  - Verify hierarchical dragging works correctly
  - Ensure all tests pass, ask the user if questions arise

- [ ] 5. Integrate with snap-to-grid and alignment
  - [ ] 5.1 Propagate snap offset to group
    - After snap calculation for dragged node, calculate snap offset (snappedPos - originalPos)
    - Apply snap offset to all other selected nodes in addition to drag delta
    - Ensure relative positions maintained after snap
    - _Requirements: 5.3_
  
  - [ ] 5.2 Ensure alignment uses dragged node only
    - Verify alignment guide calculation uses dragged node position
    - Ensure other selected nodes don't affect alignment calculation
    - Document that alignment guides show for dragged node, not entire group
    - _Requirements: 5.4_
  
  - [ ] 5.3 Verify snap-to-grid for dragged node
    - Ensure dragged node snaps to grid when config.snapToGrid enabled
    - Verify grid alignment calculation works with multi-selection
    - _Requirements: 5.1_
  
  - [ ]* 5.4 Write property test for snap offset propagation
    - **Property 4: Snap Offset Propagates to Group**
    - **Validates: Requirements 5.3**
    - Generate random groups, apply snap offsets, verify all nodes receive offset
    - Minimum 100 iterations
  
  - [ ]* 5.5 Write property test for dragged node snap
    - **Property 5: Dragged Node Snaps Correctly**
    - **Validates: Requirements 5.1**
    - Test with various grid sizes, verify dragged node aligns to grid
    - Minimum 100 iterations
  
  - [ ]* 5.6 Write property test for alignment calculation
    - **Property 6: Alignment Calculation Uses Dragged Node**
    - **Validates: Requirements 5.4**
    - Verify alignment guides calculated from dragged node position only
    - Minimum 100 iterations

- [ ] 6. Add keyboard shortcuts (optional enhancement)
  - [ ] 6.1 Implement Escape to clear selection
    - Add keyboard event listener for Escape key
    - Call VueFlow's selection clearing function
    - _Requirements: 8.1_
  
  - [ ] 6.2 Implement Ctrl+A / Cmd+A to select all
    - Add keyboard event listener for Ctrl+A (Windows/Linux) and Cmd+A (Mac)
    - Use VueFlow's addSelectedNodes with all visible nodes
    - _Requirements: 8.2_
  
  - [ ] 6.3 Verify Space key doesn't clear selection
    - Test that existing Space key panning doesn't affect selection
    - Ensure isSpacePressed logic doesn't interfere with selection state
    - _Requirements: 8.3_
  
  - [ ]* 6.4 Write unit tests for keyboard shortcuts
    - Test Escape clears selection
    - Test Ctrl+A/Cmd+A selects all visible nodes
    - Test Space allows panning without clearing selection
    - _Requirements: 8.1, 8.2, 8.3_

- [ ] 7. Ensure persistence and state management
  - [ ] 7.1 Verify selection state synchronization
    - Ensure drag handler reads selection from flowNodes.value.filter(n => n.selected)
    - Verify selection state matches VueFlow's internal state
    - _Requirements: 7.1_
  
  - [ ] 7.2 Test canvas reset clears selections
    - Verify executeReset function clears all selections
    - Ensure selection state is reset when starting new session
    - _Requirements: 7.4_
  
  - [ ]* 7.3 Write property test for selection state sync
    - **Property 7: Selection State Reflects VueFlow State**
    - **Validates: Requirements 7.1**
    - Verify drag handler's view of selection matches VueFlow state
    - Minimum 100 iterations
  
  - [ ]* 7.4 Write property test for position persistence
    - **Property 8: Group Positions Persist Correctly**
    - **Validates: Requirements 3.4**
    - Move groups, verify positions saved and restored from localStorage
    - Minimum 100 iterations

- [ ] 8. Regression testing and edge cases
  - [ ]* 8.1 Write unit test for single node drag (regression)
    - Verify existing single-node drag behavior unchanged
    - Test with hierarchical dragging on/off
    - Test with snap-to-grid on/off
  
  - [ ]* 8.2 Write unit test for empty selection edge case
    - Test dragging when no nodes selected
    - Verify it behaves like single-node drag
  
  - [ ]* 8.3 Write integration tests
    - Test hierarchical dragging with mixed selection (parent + some children)
    - Test snap-to-grid with multiple selected nodes
    - Test alignment guides with multiple selected nodes

- [ ] 9. Final checkpoint - Comprehensive testing
  - Run all unit tests and property tests
  - Manually test all user scenarios from requirements
  - Verify no regressions in existing functionality
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test tasks that can be skipped for faster MVP
- Each property test must run minimum 100 iterations
- All property tests must include comment tags referencing design properties
- Implementation focuses on modifying only `handleNodeDrag` function in `useThinkFlow.ts`
- VueFlow's built-in selection system handles all selection state management
- No changes needed to UI components or VueFlow configuration
