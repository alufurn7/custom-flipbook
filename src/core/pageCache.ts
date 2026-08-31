export interface CacheEvictionPlanInput {
  cacheOrder: readonly number[];
  protectedIndices: ReadonlySet<number>;
  maximumSize: number;
}

/** Selects oldest unprotected entries until the configured cache bound is met. */
export const planCacheEvictions = ({
  cacheOrder,
  protectedIndices,
  maximumSize
}: CacheEvictionPlanInput): number[] => {
  const effectiveMaximum = Math.max(maximumSize, protectedIndices.size);
  let remaining = cacheOrder.length;
  const evictions: number[] = [];

  for (const index of cacheOrder) {
    if (remaining <= effectiveMaximum) break;
    if (protectedIndices.has(index)) continue;
    evictions.push(index);
    remaining -= 1;
  }

  return evictions;
};
