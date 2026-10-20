// Shared contract between the standalone mini-games and the story campaign.
// Mini-games (stacker, pingback, route) accept MiniGameProps; the story mode
// mounts them as chapter challenges and listens for onFinish.

export type MiniGameId = "stacker" | "pingback" | "route";

export interface MiniGameGoal {
  /** Short in-story objective shown on the start overlay, e.g. "Clear 5 lines before standup". */
  label: string;
  /** Target to reach; meaning depends on the game (lines / waves cleared / pings collected). */
  target: number;
  /** Optional time limit in seconds. */
  timeLimit?: number;
}

export interface MiniGameResult {
  won: boolean;
  score: number;
  /** Progress toward goal.target (lines, waves, pings). */
  progress: number;
  durationMs: number;
}

export interface MiniGameProps {
  /** "free" = classic endless arcade with high score. "story" = goal-driven, ends on win/lose. */
  mode?: "free" | "story";
  goal?: MiniGameGoal;
  /** Called once when a story-mode run ends (win or lose). Never called in free mode. */
  onFinish?: (result: MiniGameResult) => void;
  /** Optional reskin text for story chapters (e.g. pieces are "tickets", blobs are "bugs"). */
  flavor?: { title?: string; noun?: string };
}
