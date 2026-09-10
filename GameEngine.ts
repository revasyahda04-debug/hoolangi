import { APP_CONFIG } from "../config";
import type { GamePhase, PlayerId, Question } from "../types";

export interface PlayerQuestionSets {
  1: Question[];
  2: Question[];
}

export interface GameCallbacks {
  onMatchStart: (questionSets: PlayerQuestionSets) => void;
  onQuestionStart: (
    playerId: PlayerId,
    question: Question,
    questionIndex: number,
    totalQuestions: number
  ) => void;
  onScore: (scores: Record<PlayerId, number>) => void;
  onAnswerSubmitted: (playerId: PlayerId, question: Question, correct: boolean) => void;
  onPlayerFinished: (playerId: PlayerId) => void;
  onMatchFinished: (scores: Record<PlayerId, number>) => void;
}

export class GameEngine {
  private phase: GamePhase = "idle";
  private questionSets: PlayerQuestionSets = { 1: [], 2: [] };
  private questionIndex: Record<PlayerId, number> = { 1: 0, 2: 0 };
  private scores: Record<PlayerId, number> = { 1: 0, 2: 0 };
  private transitioning: Record<PlayerId, boolean> = { 1: false, 2: false };
  private finished: Record<PlayerId, boolean> = { 1: false, 2: false };
  private callbacks: GameCallbacks;
  private transitionTimers: Record<PlayerId, number | null> = { 1: null, 2: null };

  constructor(callbacks: GameCallbacks) {
    this.callbacks = callbacks;
  }

  getPhase(): GamePhase {
    return this.phase;
  }

  getScores(): Record<PlayerId, number> {
    return { ...this.scores };
  }

  getCurrentQuestion(playerId: PlayerId): Question | null {
    return this.questionSets[playerId][this.questionIndex[playerId]] ?? null;
  }

  canPlayerInteract(playerId: PlayerId): boolean {
    return this.phase === "playing" && !this.transitioning[playerId] && !this.finished[playerId];
  }

  start(questionSets: PlayerQuestionSets): void {
    this.clearTransitionTimers();
    this.questionSets = {
      1: [...questionSets[1]],
      2: [...questionSets[2]]
    };
    this.questionIndex = { 1: 0, 2: 0 };
    this.scores = { 1: 0, 2: 0 };
    this.transitioning = { 1: false, 2: false };
    this.finished = { 1: false, 2: false };
    this.phase = "playing";

    this.callbacks.onScore(this.getScores());
    this.callbacks.onMatchStart(this.questionSets);
    this.startCurrentQuestion(1);
    this.startCurrentQuestion(2);
  }

  submit(playerId: PlayerId, correct: boolean): boolean {
    if (!this.canPlayerInteract(playerId)) return false;
    const question = this.getCurrentQuestion(playerId);
    if (!question) return false;

    this.transitioning[playerId] = true;
    if (correct) {
      this.scores[playerId] += APP_CONFIG.pointsPerCorrect;
      this.callbacks.onScore(this.getScores());
    }
    this.callbacks.onAnswerSubmitted(playerId, question, correct);

    this.transitionTimers[playerId] = window.setTimeout(() => {
      this.transitionTimers[playerId] = null;
      this.advancePlayer(playerId);
    }, APP_CONFIG.answerTransitionDelayMs);

    return true;
  }

  private startCurrentQuestion(playerId: PlayerId): void {
    const question = this.getCurrentQuestion(playerId);
    if (!question) {
      this.finishPlayer(playerId);
      return;
    }

    this.transitioning[playerId] = false;
    this.callbacks.onQuestionStart(
      playerId,
      question,
      this.questionIndex[playerId],
      this.questionSets[playerId].length
    );
  }

  private advancePlayer(playerId: PlayerId): void {
    if (this.phase !== "playing") return;
    this.questionIndex[playerId] += 1;

    if (this.questionIndex[playerId] >= this.questionSets[playerId].length) {
      this.finishPlayer(playerId);
      return;
    }

    this.startCurrentQuestion(playerId);
  }

  private finishPlayer(playerId: PlayerId): void {
    if (this.finished[playerId]) return;
    this.finished[playerId] = true;
    this.transitioning[playerId] = false;
    this.callbacks.onPlayerFinished(playerId);

    if (this.finished[1] && this.finished[2]) {
      this.phase = "finished";
      this.clearTransitionTimers();
      this.callbacks.onMatchFinished(this.getScores());
    }
  }

  private clearTransitionTimers(): void {
    ([1, 2] as const).forEach((playerId) => {
      const timer = this.transitionTimers[playerId];
      if (timer !== null) {
        window.clearTimeout(timer);
        this.transitionTimers[playerId] = null;
      }
    });
  }
}
