import "./styles.css";
import questionsRaw from "./data/questions.json";
import { APP_CONFIG } from "./config";
import { GameAudio } from "./audio";
import { GameEngine } from "./game/GameEngine";
import { QuestionDeck } from "./game/QuestionDeck";
import { DragController } from "./interaction/DragController";
import { HandTracker } from "./vision/HandTracker";
import type { HandFrame, PlayerId, Question } from "./types";
import { mustGet } from "./utils/dom";
import { shuffle } from "./utils/random";

const questions = questionsRaw as Question[];
const deck = new QuestionDeck(questions);
const audio = new GameAudio();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app tidak ditemukan.");

app.innerHTML = `
  <main class="app-shell">
    <section id="cameraStage" class="camera-stage" aria-label="Area permainan">
      <video id="cameraVideo" class="camera-video" autoplay muted playsinline></video>
      <div class="camera-shade" aria-hidden="true"></div>
      <canvas id="handCanvas" class="hand-canvas" aria-hidden="true"></canvas>
      <div class="center-line" aria-hidden="true"></div>

      <header class="topbar">
        <div class="brand">
          <span class="brand-mark">ع</span>
          <div>
            <strong>Arabic Gesture Versus</strong>
            <small>Tanpa timer • selesai menyusun langsung lanjut</small>
          </div>
        </div>
        <div class="match-meta">
          <span class="meta-pill">Soal kanan & kiri diacak berbeda</span>
          <button id="fullscreenButton" class="icon-button" type="button" title="Layar penuh">⛶</button>
        </div>
      </header>

      <section class="boards" aria-label="Papan pemain">
        ${playerBoardMarkup(1)}
        ${playerBoardMarkup(2)}
      </section>

      <div id="cursor1" class="gesture-cursor p1" aria-hidden="true"><span>1</span></div>
      <div id="cursor2" class="gesture-cursor p2" aria-hidden="true"><span>2</span></div>

      <div id="globalToast" class="global-toast" role="status" aria-live="polite"></div>

      <section id="startOverlay" class="overlay start-overlay">
        <div class="dialog start-dialog">
          <span class="eyebrow">STATIC WEB • MEDIAPIPE</span>
          <h1>Susun Kalimat Arab<br />dengan Gesture Tangan</h1>
          <p class="lead">
            Player 1 dan Player 2 mendapat <strong>urutan soal yang berbeda</strong>. Tidak ada batas waktu.
            Begitu semua slot terisi, jawaban dinilai lalu pemain langsung mendapatkan soal berikutnya,
            <strong>baik jawabannya benar maupun salah</strong>.
          </p>

          <div class="setup-grid">
            <label>
              <span>Nama Pemain 1</span>
              <input id="player1Input" value="Pemain 1" maxlength="20" autocomplete="off" />
            </label>
            <label>
              <span>Nama Pemain 2</span>
              <input id="player2Input" value="Pemain 2" maxlength="20" autocomplete="off" />
            </label>
          </div>

          <div class="gesture-guide">
            <div><b>☝️</b><span>Arahkan telunjuk</span></div>
            <div><b>🤏</b><span>Pinch untuk ambil</span></div>
            <div><b>↔</b><span>Geser kartu</span></div>
            <div><b>🖐️</b><span>Buka untuk drop</span></div>
          </div>

          <div id="setupStatus" class="setup-status">MediaPipe belum dimuat.</div>
          <div class="start-actions">
            <button id="cameraButton" class="button primary" type="button">Aktifkan Kamera & MediaPipe</button>
            <button id="startButton" class="button success" type="button" disabled>Mulai Pertandingan</button>
          </div>
          <button id="mouseModeButton" class="text-button" type="button">Uji tanpa kamera (mouse/touch)</button>
          <p class="privacy-note">Kamera diproses di browser. Website tidak menyimpan video atau skor ke database.</p>
        </div>
      </section>

      <section id="finishOverlay" class="overlay hidden">
        <div class="dialog result-dialog">
          <span class="eyebrow">PERTANDINGAN SELESAI</span>
          <div class="trophy">🏆</div>
          <h2 id="winnerTitle">Pemenang</h2>
          <div class="final-score">
            <div><span id="finalName1">Pemain 1</span><strong id="finalScore1">0</strong></div>
            <span>—</span>
            <div><span id="finalName2">Pemain 2</span><strong id="finalScore2">0</strong></div>
          </div>
          <p class="result-note">Skor +${APP_CONFIG.pointsPerCorrect} untuk setiap susunan yang benar.</p>
          <div class="result-actions">
            <button id="playAgainButton" class="button success" type="button">Main Lagi</button>
            <button id="backButton" class="button secondary" type="button">Kembali ke Awal</button>
          </div>
        </div>
      </section>
    </section>
  </main>
`;

function playerBoardMarkup(playerId: PlayerId): string {
  return `
    <article class="player-board player-${playerId}" data-player="${playerId}">
      <div class="player-head">
        <div class="player-title-wrap">
          <span class="player-kicker">PLAYER ${playerId}</span>
          <h2 id="playerName${playerId}">Pemain ${playerId}</h2>
        </div>
        <div class="player-head-metrics">
          <div class="progress-box"><span>SOAL</span><strong id="progress${playerId}">—</strong></div>
          <div class="score-box"><span>SKOR</span><strong id="score${playerId}">0</strong></div>
        </div>
      </div>

      <div class="hand-state">
        <span id="handDot${playerId}" class="hand-dot"></span>
        <span id="handText${playerId}">Tangan belum terdeteksi</span>
      </div>

      <section class="answer-area">
        <div class="section-label"><span>Susunan jawaban</span><small>mulai dari slot kanan</small></div>
        <div class="answer-slots" data-player="${playerId}" dir="rtl"></div>
      </section>

      <section class="bank-area">
        <div class="section-label"><span>Kata acak</span><small>pinch dan geser</small></div>
        <div class="word-bank" data-player="${playerId}" dir="rtl"></div>
      </section>

      <div id="answerFeedback${playerId}" class="answer-feedback hidden" role="status" aria-live="assertive" aria-atomic="true">
        <div class="answer-feedback-card">
          <div id="answerFeedbackIcon${playerId}" class="answer-feedback-icon">✓</div>
          <strong id="answerFeedbackTitle${playerId}">JAWABAN ANDA BENAR</strong>
          <span id="answerFeedbackScore${playerId}" class="answer-feedback-score"></span>
          <p id="answerFeedbackDetail${playerId}" class="answer-feedback-detail"></p>
        </div>
      </div>

      <div id="status${playerId}" class="player-status">Menunggu permainan dimulai…</div>
    </article>
  `;
}

const cameraStage = mustGet<HTMLElement>("#cameraStage");
const video = mustGet<HTMLVideoElement>("#cameraVideo");
const handCanvas = mustGet<HTMLCanvasElement>("#handCanvas");
const startOverlay = mustGet<HTMLElement>("#startOverlay");
const finishOverlay = mustGet<HTMLElement>("#finishOverlay");
const cameraButton = mustGet<HTMLButtonElement>("#cameraButton");
const startButton = mustGet<HTMLButtonElement>("#startButton");
const mouseModeButton = mustGet<HTMLButtonElement>("#mouseModeButton");
const setupStatus = mustGet<HTMLElement>("#setupStatus");
const globalToast = mustGet<HTMLElement>("#globalToast");
const cursorEls: Record<PlayerId, HTMLElement> = {
  1: mustGet<HTMLElement>("#cursor1"),
  2: mustGet<HTMLElement>("#cursor2")
};

let cameraReady = false;
let mouseMode = false;
const currentQuestion: Record<PlayerId, Question | null> = { 1: null, 2: null };
const previousPinch: Record<PlayerId, boolean> = { 1: false, 2: false };
const lastSeen: Record<PlayerId, number> = { 1: 0, 2: 0 };
let toastTimer = 0;

const drag = new DragController({
  canInteract: (playerId) => game.canPlayerInteract(playerId),
  onArrangementChanged: (playerId) => validateBoard(playerId),
  onStatus: (playerId, text) => setPlayerStatus(playerId, text)
});

const game = new GameEngine({
  onMatchStart: () => {
    finishOverlay.classList.add("hidden");
    startOverlay.classList.add("hidden");
    setPlayerLocked(1, false);
    setPlayerLocked(2, false);
  },
  onQuestionStart: (playerId, question, questionIndex, totalQuestions) => {
    currentQuestion[playerId] = question;
    mustGet<HTMLElement>(`#progress${playerId}`).textContent = `${questionIndex + 1}/${totalQuestions}`;
    renderQuestion(playerId, question);
    setPlayerLocked(playerId, false);
    clearBoardFeedback(playerId);
    hideAnswerFeedback(playerId);
  },
  onScore: (scores) => {
    updateScoreDisplay(1, scores[1]);
    updateScoreDisplay(2, scores[2]);
  },
  onAnswerSubmitted: (playerId, question, correct) => {
    setPlayerLocked(playerId, true);
    drag.cancel(playerId);
    flashBoard(playerId, correct);
    showAnswerFeedback(playerId, question, correct);

    if (correct) {
      audio.correct();
      setPlayerStatus(playerId, `✓ Jawaban Anda benar. +${APP_CONFIG.pointsPerCorrect} poin.`);
    } else {
      audio.wrong();
      setPlayerStatus(playerId, `✗ Jawaban Anda salah. Perhatikan jawaban yang benar.`);
    }
  },
  onPlayerFinished: (playerId) => {
    currentQuestion[playerId] = null;
    hideAnswerFeedback(playerId);
    drag.cancel(playerId);
    setPlayerLocked(playerId, true);
    mustGet<HTMLElement>(`#progress${playerId}`).textContent = `${APP_CONFIG.questionsPerPlayer}/${APP_CONFIG.questionsPerPlayer}`;
    renderPlayerFinished(playerId);
    setPlayerStatus(playerId, "Semua soal selesai. Menunggu pemain lain…");
  },
  onMatchFinished: (scores) => {
    setPlayerLocked(1, true);
    setPlayerLocked(2, true);
    audio.win();
    const name1 = getPlayerName(1);
    const name2 = getPlayerName(2);
    mustGet<HTMLElement>("#finalName1").textContent = name1;
    mustGet<HTMLElement>("#finalName2").textContent = name2;
    mustGet<HTMLElement>("#finalScore1").textContent = String(scores[1]);
    mustGet<HTMLElement>("#finalScore2").textContent = String(scores[2]);
    mustGet<HTMLElement>("#winnerTitle").textContent =
      scores[1] === scores[2] ? "Hasil Seri!" : `${scores[1] > scores[2] ? name1 : name2} Menang!`;
    finishOverlay.classList.remove("hidden");
  }
});

const tracker = new HandTracker(video, cameraStage, handCanvas, {
  onFrames: handleHandFrames,
  onStatus: (message) => {
    setupStatus.textContent = message;
  },
  onError: (message, error) => {
    console.error(message, error);
    setupStatus.textContent = message;
  }
});

cameraButton.addEventListener("click", async () => {
  cameraButton.disabled = true;
  try {
    await tracker.startCamera();
    cameraReady = true;
    mouseMode = false;
    startButton.disabled = false;
    cameraButton.textContent = "Kamera Aktif ✓";
  } catch (error) {
    console.error(error);
    cameraButton.disabled = false;
    cameraButton.textContent = "Coba Aktifkan Kamera Lagi";
    setupStatus.textContent = friendlyCameraError(error);
  }
});

mouseModeButton.addEventListener("click", () => {
  mouseMode = true;
  setupStatus.textContent = "Mode uji mouse/touch aktif. Gesture kamera dinonaktifkan untuk pengujian.";
  startButton.disabled = false;
});

startButton.addEventListener("click", () => {
  if (!cameraReady && !mouseMode) return;
  syncPlayerNames();
  startNewMatch();
});

mustGet<HTMLButtonElement>("#playAgainButton").addEventListener("click", () => {
  startNewMatch();
});

mustGet<HTMLButtonElement>("#backButton").addEventListener("click", () => {
  finishOverlay.classList.add("hidden");
  startOverlay.classList.remove("hidden");
  ([1, 2] as const).forEach((playerId) => {
    mustGet<HTMLElement>(`#progress${playerId}`).textContent = "—";
    updateScoreDisplay(playerId, 0, false);
    hideAnswerFeedback(playerId);
    setPlayerStatus(playerId, "Menunggu permainan dimulai…");
  });
});

mustGet<HTMLButtonElement>("#fullscreenButton").addEventListener("click", async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen tidak tersedia:", error);
  }
});

function startNewMatch(): void {
  const count = Math.min(APP_CONFIG.questionsPerPlayer, questions.length);
  const questionSets = deck.drawDistinctPair(count);
  game.start(questionSets);
  showToast("Pertandingan dimulai. Kanan dan kiri mendapat urutan soal yang berbeda.");
}

function syncPlayerNames(): void {
  const input1 = mustGet<HTMLInputElement>("#player1Input");
  const input2 = mustGet<HTMLInputElement>("#player2Input");
  const name1 = input1.value.trim() || "Pemain 1";
  const name2 = input2.value.trim() || "Pemain 2";
  input1.value = name1;
  input2.value = name2;
  mustGet<HTMLElement>("#playerName1").textContent = name1;
  mustGet<HTMLElement>("#playerName2").textContent = name2;
}

function getPlayerName(playerId: PlayerId): string {
  return mustGet<HTMLElement>(`#playerName${playerId}`).textContent?.trim() || `Pemain ${playerId}`;
}

function renderQuestion(playerId: PlayerId, question: Question): void {
  const slots = mustGet<HTMLElement>(`.answer-slots[data-player="${playerId}"]`);
  const bank = mustGet<HTMLElement>(`.word-bank[data-player="${playerId}"]`);
  slots.replaceChildren();
  bank.replaceChildren();

  slots.style.setProperty("--slot-count", String(question.words.length));

  question.words.forEach((_, slotIndex) => {
    const slot = document.createElement("div");
    slot.className = "answer-slot";
    slot.dataset.player = String(playerId);
    slot.dataset.slotIndex = String(slotIndex);
    slot.innerHTML = `<span class="slot-number">${slotIndex + 1}</span>`;
    slots.appendChild(slot);
  });

  const shuffledIndices = shuffle(question.words.map((_, index) => index));
  shuffledIndices.forEach((answerIndex) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "word-card";
    card.dataset.player = String(playerId);
    card.dataset.answerIndex = String(answerIndex);
    card.setAttribute("dir", "rtl");
    card.textContent = question.words[answerIndex] ?? "";
    bank.appendChild(card);
  });

  setPlayerStatus(playerId, `Susun ${question.words.length} kata. Setelah semua slot terisi, soal otomatis dinilai.`);
}

function renderPlayerFinished(playerId: PlayerId): void {
  const slots = mustGet<HTMLElement>(`.answer-slots[data-player="${playerId}"]`);
  const bank = mustGet<HTMLElement>(`.word-bank[data-player="${playerId}"]`);
  slots.style.removeProperty("--slot-count");
  slots.innerHTML = `<div class="finished-panel" dir="ltr"><strong>SELESAI ✓</strong><span>${getPlayerName(playerId)} telah menyelesaikan semua soal.</span></div>`;
  bank.replaceChildren();
}

function validateBoard(playerId: PlayerId): void {
  if (!game.canPlayerInteract(playerId)) return;
  const question = currentQuestion[playerId];
  if (!question) return;

  const slots = Array.from(
    document.querySelectorAll<HTMLElement>(`.answer-slot[data-player="${playerId}"]`)
  );
  const cards = slots.map((slot) => slot.querySelector<HTMLElement>(":scope > .word-card"));

  // Belum lengkap: jangan nilai dan jangan ganti soal.
  if (cards.some((card) => card === null)) return;

  const correct = cards.every((card, slotIndex) => Number(card?.dataset.answerIndex) === slotIndex);
  game.submit(playerId, correct);
}

function setPlayerLocked(playerId: PlayerId, locked: boolean): void {
  mustGet<HTMLElement>(`.player-board[data-player="${playerId}"]`).classList.toggle("locked", locked);
}

function flashBoard(playerId: PlayerId, correct: boolean): void {
  const board = mustGet<HTMLElement>(`.player-board[data-player="${playerId}"]`);
  board.classList.remove("wrong-flash", "correct-flash");
  void board.offsetWidth;
  board.classList.add(correct ? "correct-flash" : "wrong-flash");
}

function clearBoardFeedback(playerId: PlayerId): void {
  const board = mustGet<HTMLElement>(`.player-board[data-player="${playerId}"]`);
  board.classList.remove("wrong-flash", "correct-flash");
}

function showAnswerFeedback(playerId: PlayerId, question: Question, correct: boolean): void {
  const feedback = mustGet<HTMLElement>(`#answerFeedback${playerId}`);
  const icon = mustGet<HTMLElement>(`#answerFeedbackIcon${playerId}`);
  const title = mustGet<HTMLElement>(`#answerFeedbackTitle${playerId}`);
  const score = mustGet<HTMLElement>(`#answerFeedbackScore${playerId}`);
  const detail = mustGet<HTMLElement>(`#answerFeedbackDetail${playerId}`);

  feedback.classList.remove("hidden", "correct", "wrong");
  feedback.classList.add(correct ? "correct" : "wrong");
  icon.textContent = correct ? "✓" : "✕";
  title.textContent = correct ? "JAWABAN ANDA BENAR" : "JAWABAN ANDA SALAH";
  score.textContent = correct ? `+${APP_CONFIG.pointsPerCorrect} POIN` : "+0 POIN";
  detail.textContent = correct ? "Bagus! Bersiap untuk soal berikutnya…" : `Jawaban yang benar: ${question.sentence}`;
}

function hideAnswerFeedback(playerId: PlayerId): void {
  const feedback = mustGet<HTMLElement>(`#answerFeedback${playerId}`);
  feedback.classList.add("hidden");
  feedback.classList.remove("correct", "wrong");
}

function updateScoreDisplay(playerId: PlayerId, value: number, animate = true): void {
  const scoreEl = mustGet<HTMLElement>(`#score${playerId}`);
  const previousValue = Number(scoreEl.textContent ?? "0");
  scoreEl.textContent = String(value);
  if (!animate || value === previousValue) return;

  scoreEl.classList.remove("score-pop");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("score-pop");
}

function setPlayerStatus(playerId: PlayerId, text: string): void {
  mustGet<HTMLElement>(`#status${playerId}`).textContent = text;
}

function handleHandFrames(frames: Map<PlayerId, HandFrame>): void {
  const now = performance.now();
  ([1, 2] as const).forEach((playerId) => {
    const frame = frames.get(playerId);
    const cursor = cursorEls[playerId];
    const handDot = mustGet<HTMLElement>(`#handDot${playerId}`);
    const handText = mustGet<HTMLElement>(`#handText${playerId}`);

    if (frame) {
      lastSeen[playerId] = now;
      cursor.classList.add("visible");
      cursor.classList.toggle("pinching", frame.pinch);
      cursor.style.transform = `translate3d(${frame.cursor.x}px, ${frame.cursor.y}px, 0) translate(-50%, -50%)`;
      handDot.classList.add("online");
      handText.textContent = frame.pinch ? "Pinch / mengambil" : "Tangan terdeteksi";

      if (game.canPlayerInteract(playerId) && !mouseMode) {
        if (frame.pinch && !previousPinch[playerId]) {
          drag.gestureStart(playerId, frame.cursor);
        }
        drag.gestureMove(playerId, frame.cursor);
        if (!frame.pinch && previousPinch[playerId]) {
          drag.gestureEnd(playerId, frame.cursor);
        }
      }
      previousPinch[playerId] = frame.pinch;
    } else if (now - lastSeen[playerId] > APP_CONFIG.handLostCancelMs) {
      cursor.classList.remove("visible", "pinching");
      handDot.classList.remove("online");
      handText.textContent = "Tangan belum terdeteksi";
      if (previousPinch[playerId]) {
        drag.cancel(playerId);
        previousPinch[playerId] = false;
      }
    }
  });
}

function showToast(message: string, kind: "default" | "success" | "warning" = "default"): void {
  window.clearTimeout(toastTimer);
  globalToast.textContent = message;
  globalToast.dataset.kind = kind;
  globalToast.classList.add("show");
  toastTimer = window.setTimeout(() => globalToast.classList.remove("show"), 1700);
}

function friendlyCameraError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") {
      return "Izin kamera ditolak. Izinkan kamera pada browser lalu coba lagi.";
    }
    if (error.name === "NotFoundError") {
      return "Kamera tidak ditemukan pada perangkat ini.";
    }
    if (error.name === "NotReadableError") {
      return "Kamera sedang dipakai aplikasi lain atau tidak dapat dibaca.";
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  return `Gagal mengaktifkan kamera/MediaPipe: ${message}`;
}

window.addEventListener("beforeunload", () => tracker.stop());
