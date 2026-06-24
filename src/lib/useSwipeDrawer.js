import { useRef } from "react";

const EDGE_START_WIDTH_PX = 30;
const SWIPE_THRESHOLD_PX = 60;
const VERTICAL_SCROLL_SLOP_PX = 26;
const MOBILE_MAX_WIDTH_PX = 767;

function isTouchMobileViewport() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.innerWidth <= MOBILE_MAX_WIDTH_PX && ("ontouchstart" in window || navigator.maxTouchPoints > 0);
}

function isInteractiveElement(target) {
  return Boolean(
    target?.closest?.(
      "a, button, input, textarea, select, summary, [role='button'], [contenteditable='true']"
    )
  );
}

export function useSwipeDrawer({ isOpen, onOpen, onClose }) {
  const touchStateRef = useRef(null);

  function handleTouchStart(event) {
    if (!isTouchMobileViewport() || event.touches.length !== 1 || isInteractiveElement(event.target)) {
      return;
    }

    const touch = event.touches[0];
    const shouldPrepareOpen = !isOpen && touch.clientX <= EDGE_START_WIDTH_PX;
    const shouldPrepareClose = isOpen;

    if (!shouldPrepareOpen && !shouldPrepareClose) {
      return;
    }

    touchStateRef.current = {
      mode: shouldPrepareOpen ? "open" : "close",
      startX: touch.clientX,
      startY: touch.clientY,
      isVerticalScroll: false
    };
  }

  function handleTouchMove(event) {
    const state = touchStateRef.current;

    if (!state || event.touches.length !== 1) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;

    if (Math.abs(deltaY) > VERTICAL_SCROLL_SLOP_PX && Math.abs(deltaY) > Math.abs(deltaX)) {
      state.isVerticalScroll = true;
    }
  }

  function handleTouchEnd(event) {
    const state = touchStateRef.current;
    touchStateRef.current = null;

    if (!state || state.isVerticalScroll) {
      return;
    }

    const touch = event.changedTouches?.[0];

    if (!touch) {
      return;
    }

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const isStrongHorizontalSwipe =
      Math.abs(deltaX) >= SWIPE_THRESHOLD_PX && Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    if (!isStrongHorizontalSwipe) {
      return;
    }

    if (state.mode === "open" && deltaX > 0) {
      onOpen?.();
    }

    if (state.mode === "close" && deltaX < 0) {
      onClose?.();
    }
  }

  function handleTouchCancel() {
    touchStateRef.current = null;
  }

  return {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel
  };
}
