import { nextUid } from "./rng";
import type { FeedItem, FeedKind, GameState } from "./types";

const FEED_LIMIT = 40;

interface FeedOptions {
  /** Items with the same key merge while they are the newest item. */
  key?: string;
  /** Numbers summed across merged items (parts sold, Scrap Bucks earned…). */
  tally?: Record<string, number>;
  /** Text for a merged item, from the summed tally and how many times it has happened. */
  merged?: (tally: Record<string, number>, count: number) => string;
}

/** Records something that just happened. Repeats of the same keyed thing fold into one line. */
export function pushFeed(state: GameState, kind: FeedKind, text: string, options: FeedOptions = {}): void {
  const feed = state.run.feed;
  const last = feed[feed.length - 1];
  if (options.key && last?.key === options.key) {
    const tally: Record<string, number> = { ...(last.tally ?? {}) };
    for (const [k, n] of Object.entries(options.tally ?? {})) tally[k] = (tally[k] ?? 0) + n;
    const count = (last.count ?? 1) + 1;
    const item: FeedItem = { ...last, at: state.run.seasonMs, count, tally, text: options.merged ? options.merged(tally, count) : text };
    feed[feed.length - 1] = item;
    return;
  }
  feed.push({ id: nextUid(state, "f"), at: state.run.seasonMs, kind, text, key: options.key, count: options.key ? 1 : undefined, tally: options.tally });
  if (feed.length > FEED_LIMIT) feed.splice(0, feed.length - FEED_LIMIT);
}
