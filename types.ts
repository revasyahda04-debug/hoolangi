export type PlayerId = 1 | 2;

export interface Point {
  x: number;
  y: number;
}

export interface Question {
  id: number;
  level: number;
  sentence: string;
  words: string[];
  translation: string;
}

export interface HandFrame {
  playerId: PlayerId;
  cursor: Point;
  pinch: boolean;
  pinchRatio: number;
  landmarks: Point[];
  seenAt: number;
}

export type GamePhase = "idle" | "playing" | "round-result" | "finished";
