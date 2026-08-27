export type ScrollTarget = { scrollTo: (x: number, y: number) => void };

export function resetRouteScroll(target: ScrollTarget) {
  target.scrollTo(0, 0);
}
