import { useCallback } from 'react';
import { useCanvas } from './useCanvas';
import { getAnchorPoint, generateCurvePath } from '../utils/geometry';

export function useEdges() {
  const { state } = useCanvas();

  const getNodeElement = useCallback((nodeId: string): HTMLElement | null => {
    return document.getElementById(nodeId);
  }, []);

  const generateEdgePath = useCallback(
    (edgeId: string): string | null => {
      const edge = state.edges.find(e => e.id === edgeId);
      if (!edge) return null;

      const fromElement = getNodeElement(edge.fromNode);
      const toElement = getNodeElement(edge.toNode);

      if (!fromElement || !toElement) return null;

      const fromPoint = getAnchorPoint(fromElement, edge.fromSide);
      const toPoint = getAnchorPoint(toElement, edge.toSide);

      return generateCurvePath(fromPoint, toPoint, 0.75);
    },
    [state.edges, getNodeElement]
  );

  const getAllEdgePaths = useCallback(() => {
    const paths: Record<string, string | null> = {};
    
    state.edges.forEach(edge => {
      paths[edge.id] = generateEdgePath(edge.id);
    });

    return paths;
  }, [state.edges, generateEdgePath]);

  const redrawEdges = useCallback(() => {
    // This will trigger a re-render of edges
    return getAllEdgePaths();
  }, [getAllEdgePaths]);

  return {
    edges: state.edges,
    getNodeElement,
    generateEdgePath,
    getAllEdgePaths,
    redrawEdges,
  };
}
