import type { DisplayMode } from "../types";

export interface TurnLayerPlanInput {
  displayMode: DisplayMode;
  targetIndices: readonly number[];
  foldedBackIndex: number;
}

/**
 * Returns the destination pages that may be mounted flat underneath a turn.
 * In a spread, the sheet's back face remains part of the moving fold until the
 * commit completes. Single-page mode keeps its destination page underneath.
 */
export const planTurnBaseIndices = ({
  displayMode,
  targetIndices,
  foldedBackIndex
}: TurnLayerPlanInput): number[] => {
  if (displayMode === "single") return [...targetIndices];
  return targetIndices.filter((index) => index !== foldedBackIndex);
};
