import { useCallback, useEffect } from 'react';
import { useCanvas } from './useCanvas';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) {
    return false;
  }
  const tagName = target.tagName.toLowerCase();
  const editableTags = ['input', 'textarea', 'select'];
  if (editableTags.includes(tagName)) {
    return true;
  }
  if ((target as HTMLElement).isContentEditable) {
    return true;
  }
  return false;
}

export function useKeyboardShortcuts() {
  const {
    config,
    state,
    removeEdge,
    removeSelectedNodes,
    undo,
    redo,
    copySelectedNodes,
    pasteCopiedNodes,
    duplicateSelectedNodes,
  } = useCanvas();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!config.enableKeyboardShortcuts) return;
      if (isEditableTarget(event.target)) return;

      const isModifierPressed = event.ctrlKey || event.metaKey;

      if (isModifierPressed && event.code === 'KeyZ') {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if (isModifierPressed && event.code === 'KeyY') {
        event.preventDefault();
        redo();
        return;
      }

      if (isModifierPressed && event.code === 'KeyC') {
        if (copySelectedNodes()) {
          event.preventDefault();
        }
        return;
      }

      if (isModifierPressed && event.code === 'KeyV') {
        if (pasteCopiedNodes()) {
          event.preventDefault();
        }
        return;
      }

      if (isModifierPressed && event.code === 'KeyD') {
        if (duplicateSelectedNodes()) {
          event.preventDefault();
        }
        return;
      }

      const isDeleteKey = event.key === 'Delete' || event.key === 'Backspace';
      if (isDeleteKey) {
        if (state.selectedNodeIds.length) {
          event.preventDefault();
          removeSelectedNodes();
        } else if (state.selectedEdgeId) {
          event.preventDefault();
          removeEdge(state.selectedEdgeId);
        }
      }
    },
    [
      config.enableKeyboardShortcuts,
      copySelectedNodes,
      duplicateSelectedNodes,
      pasteCopiedNodes,
      redo,
      removeEdge,
      removeSelectedNodes,
      state.selectedEdgeId,
      state.selectedNodeIds.length,
      undo,
    ]
  );

  useEffect(() => {
    if (!config.enableKeyboardShortcuts) return;
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [config.enableKeyboardShortcuts, handleKeyDown]);
}
