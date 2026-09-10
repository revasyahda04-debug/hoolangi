import { APP_CONFIG } from "../config";
import type { PlayerId, Point } from "../types";
import { distance } from "../utils/dom";

interface ActiveDrag {
  playerId: PlayerId;
  card: HTMLElement;
  ghost: HTMLElement;
  sourceSlot: HTMLElement | null;
  sourceTray: HTMLElement;
}

export interface DragCallbacks {
  canInteract: (playerId: PlayerId) => boolean;
  onArrangementChanged: (playerId: PlayerId) => void;
  onStatus: (playerId: PlayerId, text: string) => void;
}

export class DragController {
  private active = new Map<PlayerId, ActiveDrag>();
  private callbacks: DragCallbacks;
  private pointerDragPlayer: PlayerId | null = null;

  constructor(callbacks: DragCallbacks) {
    this.callbacks = callbacks;
    this.installPointerFallback();
  }

  gestureStart(playerId: PlayerId, point: Point): void {
    if (!this.callbacks.canInteract(playerId) || this.active.has(playerId)) return;
    const card = this.findCardAt(playerId, point);
    if (!card) return;
    this.beginDrag(playerId, card, point);
  }

  gestureMove(playerId: PlayerId, point: Point): void {
    const drag = this.active.get(playerId);
    if (!drag) return;
    this.moveGhost(drag, point);
    this.highlightDropTarget(playerId, point);
  }

  gestureEnd(playerId: PlayerId, point: Point): void {
    const drag = this.active.get(playerId);
    if (!drag) return;
    this.finishDrag(drag, point);
  }

  cancel(playerId: PlayerId): void {
    const drag = this.active.get(playerId);
    if (!drag) return;
    this.clearDragVisuals(drag);
    this.callbacks.onStatus(playerId, "Gesture hilang — kartu dikembalikan.");
  }

  cancelAll(): void {
    this.cancel(1);
    this.cancel(2);
  }

  private beginDrag(playerId: PlayerId, card: HTMLElement, point: Point): void {
    const sourceSlot = card.closest<HTMLElement>(".answer-slot");
    const sourceTray = document.querySelector<HTMLElement>(`.word-bank[data-player="${playerId}"]`);
    if (!sourceTray) return;

    const ghost = card.cloneNode(true) as HTMLElement;
    ghost.classList.add("drag-ghost");
    ghost.classList.remove("is-grabbed");
    document.body.appendChild(ghost);
    card.classList.add("is-grabbed");

    const drag: ActiveDrag = { playerId, card, ghost, sourceSlot, sourceTray };
    this.active.set(playerId, drag);
    this.moveGhost(drag, point);
    this.callbacks.onStatus(playerId, `Mengambil: ${card.textContent?.trim() ?? "kata"}`);
  }

  private finishDrag(drag: ActiveDrag, point: Point): void {
    const { playerId, card, sourceSlot, sourceTray } = drag;
    const targetSlot = this.findSlotAtOrNear(playerId, point);
    const overTray = this.isPointInside(sourceTray, point);

    if (targetSlot) {
      const occupying = targetSlot.querySelector<HTMLElement>(":scope > .word-card");

      if (targetSlot === sourceSlot) {
        // Nothing to move.
      } else if (occupying) {
        if (sourceSlot) {
          sourceSlot.appendChild(occupying);
        } else {
          sourceTray.appendChild(occupying);
        }
        targetSlot.appendChild(card);
      } else {
        targetSlot.appendChild(card);
      }
      this.callbacks.onStatus(playerId, "Kartu ditempatkan.");
      this.callbacks.onArrangementChanged(playerId);
    } else if (overTray) {
      sourceTray.appendChild(card);
      this.callbacks.onStatus(playerId, "Kartu dikembalikan ke bank kata.");
      this.callbacks.onArrangementChanged(playerId);
    } else {
      this.callbacks.onStatus(playerId, "Lepaskan di slot atau bank kata.");
    }

    this.clearDragVisuals(drag);
  }

  private clearDragVisuals(drag: ActiveDrag): void {
    drag.card.classList.remove("is-grabbed");
    drag.ghost.remove();
    this.active.delete(drag.playerId);
    document
      .querySelectorAll<HTMLElement>(`.answer-slot[data-player="${drag.playerId}"].is-drop-target`)
      .forEach((el) => el.classList.remove("is-drop-target"));
  }

  private moveGhost(drag: ActiveDrag, point: Point): void {
    drag.ghost.style.transform = `translate3d(${point.x}px, ${point.y}px, 0) translate(-50%, -50%)`;
  }

  private findCardAt(playerId: PlayerId, point: Point): HTMLElement | null {
    const elements = document.elementsFromPoint(point.x, point.y);
    return (
      elements.find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element.classList.contains("word-card") &&
          element.dataset.player === String(playerId) &&
          !element.classList.contains("is-grabbed")
      ) ?? null
    );
  }

  private findSlotAtOrNear(playerId: PlayerId, point: Point): HTMLElement | null {
    const direct = document
      .elementsFromPoint(point.x, point.y)
      .find(
        (element): element is HTMLElement =>
          element instanceof HTMLElement &&
          element.classList.contains("answer-slot") &&
          element.dataset.player === String(playerId)
      );

    if (direct) return direct;

    let nearest: HTMLElement | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    const slots = document.querySelectorAll<HTMLElement>(`.answer-slot[data-player="${playerId}"]`);
    slots.forEach((slot) => {
      const rect = slot.getBoundingClientRect();
      const center = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      const d = distance(center, point);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = slot;
      }
    });

    return nearestDistance <= APP_CONFIG.dropSnapRadiusPx ? nearest : null;
  }

  private highlightDropTarget(playerId: PlayerId, point: Point): void {
    document
      .querySelectorAll<HTMLElement>(`.answer-slot[data-player="${playerId}"].is-drop-target`)
      .forEach((slot) => slot.classList.remove("is-drop-target"));
    this.findSlotAtOrNear(playerId, point)?.classList.add("is-drop-target");
  }

  private isPointInside(element: HTMLElement, point: Point): boolean {
    const rect = element.getBoundingClientRect();
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom;
  }

  private installPointerFallback(): void {
    document.addEventListener("pointerdown", (event) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".word-card") : null;
      if (!target) return;
      const player = Number(target.dataset.player) as PlayerId;
      if (player !== 1 && player !== 2) return;
      if (!this.callbacks.canInteract(player)) return;
      if (this.active.has(player)) return;

      event.preventDefault();
      this.pointerDragPlayer = player;
      this.beginDrag(player, target, { x: event.clientX, y: event.clientY });
    });

    window.addEventListener("pointermove", (event) => {
      if (!this.pointerDragPlayer) return;
      event.preventDefault();
      this.gestureMove(this.pointerDragPlayer, { x: event.clientX, y: event.clientY });
    });

    window.addEventListener("pointerup", (event) => {
      if (!this.pointerDragPlayer) return;
      const player = this.pointerDragPlayer;
      this.pointerDragPlayer = null;
      this.gestureEnd(player, { x: event.clientX, y: event.clientY });
    });

    window.addEventListener("pointercancel", () => {
      if (!this.pointerDragPlayer) return;
      const player = this.pointerDragPlayer;
      this.pointerDragPlayer = null;
      this.cancel(player);
    });
  }
}
