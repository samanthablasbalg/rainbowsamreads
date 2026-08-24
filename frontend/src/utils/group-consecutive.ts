/**
 * Runs of adjacent items sharing a key, in the order they arrived.
 *
 * A fold rather than a bucketing: the caller's list is already ordered on the key, so
 * two runs of the same key arriving apart would be a bug in that ordering, not two
 * groups to merge. Bucketing would hide it; this preserves it.
 */
export function groupConsecutiveBy<T, K>(items: T[], keyOf: (item: T) => K): T[][] {
  return items.reduce<T[][]>((groups, item) => {
    const open = groups.at(-1);

    if (open !== undefined && keyOf(open[0]) === keyOf(item)) open.push(item);
    else groups.push([item]);

    return groups;
  }, []);
}
