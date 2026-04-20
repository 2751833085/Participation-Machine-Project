/**
 * Soft UI motion — reserved for surfaces that opt in (e.g. profile avatar grid in CSS).
 * Route-level shell enter was removed; each page controls its own entrance to avoid double triggers.
 */

/** No-op: route transitions live on individual pages (home stagger, modals, etc.). */
export function playShellRouteTransition() {}
