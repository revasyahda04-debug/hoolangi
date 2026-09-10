import type { Question } from "../types";
import { shuffle } from "../utils/random";

export interface PlayerQuestionSets {
  1: Question[];
  2: Question[];
}

export class QuestionDeck {
  private readonly all: Question[];

  constructor(questions: Question[]) {
    if (questions.length < 2) {
      throw new Error("Bank soal minimal harus berisi 2 soal.");
    }
    this.all = [...questions];
  }

  drawDistinctPair(count: number): PlayerQuestionSets {
    if (count <= 0) return { 1: [], 2: [] };
    if (count > this.all.length) {
      throw new Error(`Jumlah soal per pemain (${count}) melebihi bank soal (${this.all.length}).`);
    }

    // Jika bank cukup besar (contoh: 20 soal, 10 per pemain), bagi menjadi
    // dua set yang benar-benar tidak saling tumpang tindih.
    if (this.all.length >= count * 2) {
      const mixed = shuffle(this.all);
      return {
        1: mixed.slice(0, count),
        2: mixed.slice(count, count * 2)
      };
    }

    // Fallback untuk bank yang lebih kecil: tiap pemain tetap mendapat urutan
    // acak sendiri dan sistem menghindari soal yang sama pada nomor yang sama.
    const player1 = shuffle(this.all).slice(0, count);
    let player2 = shuffle(this.all).slice(0, count);

    for (let attempt = 0; attempt < 100 && this.hasSamePosition(player1, player2); attempt += 1) {
      player2 = shuffle(this.all).slice(0, count);
    }

    if (this.hasSamePosition(player1, player2)) {
      player2 = this.repairSamePositions(player1, player2);
    }

    return { 1: player1, 2: player2 };
  }

  private hasSamePosition(left: Question[], right: Question[]): boolean {
    return left.some((question, index) => question.id === right[index]?.id);
  }

  private repairSamePositions(left: Question[], right: Question[]): Question[] {
    const repaired = [...right];

    for (let i = 0; i < repaired.length; i += 1) {
      if (repaired[i]?.id !== left[i]?.id) continue;

      const swapIndex = repaired.findIndex((candidate, j) => {
        if (j === i) return false;
        const current = repaired[i];
        if (!current) return false;
        return candidate.id !== left[i]?.id && current.id !== left[j]?.id;
      });

      if (swapIndex >= 0) {
        [repaired[i], repaired[swapIndex]] = [repaired[swapIndex]!, repaired[i]!];
      }
    }

    return repaired;
  }
}
