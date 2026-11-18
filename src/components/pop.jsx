/* eslint-disable react/no-unknown-property, react/prop-types */
// Bubbly traversal between locations: the old setting's items swell a little and
// then sink into the ground, and the new setting's items pop back out of it one
// after another, with squash and stretch. A transition is a plain ref
// ({ mode: "out" | "in" | "idle", t0 }) shared through context.
import { createContext, useContext, useRef } from "react";
import { useFrame } from "@react-three/fiber";

export const OUT_S = 0.34; // how long one item takes to sink
export const IN_S = 0.42; // how long one item takes to pop out
export const STAGGER = 0.04; // delay between neighbouring items

const easeOutBack = (t) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
const easeInBack = (t) => 2.70158 * t * t * t - 1.70158 * t * t;
export const nowS = () => performance.now() / 1000;

export const PopCtx = createContext(null);

// [height scale, width scale] of item number `i` right now.
function popScale(tr, i) {
  if (!tr || tr.mode === "idle") return [1, 1];
  const t = nowS() - tr.t0 - i * STAGGER;
  if (tr.mode === "out") {
    const p = Math.min(1, Math.max(0, t / OUT_S));
    const k = Math.max(0, 1 - easeInBack(p)); // swells slightly, then drops into the ground
    return [k, k <= 1 ? 1 + (1 - k) * 0.3 : 1 - (k - 1) * 0.5];
  }
  if (t < 0) return [0, 1.3];
  const p = Math.min(1, t / IN_S);
  const k = Math.max(0, easeOutBack(p)); // overshoots, then settles
  return [k, k <= 1 ? 1 + (1 - k) * 0.3 : 1 - (k - 1) * 0.5];
}

// Scales its children about its own origin (put it where the item meets the ground).
export function PopGroup({ index = 0, children }) {
  const tr = useContext(PopCtx);
  const g = useRef();
  const [y0, xz0] = popScale(tr?.current, index);
  useFrame(() => {
    if (!g.current) return;
    const [y, xz] = popScale(tr?.current, index);
    g.current.scale.set(xz, Math.max(y, 0.0001), xz);
    g.current.visible = y > 0.002;
  });
  return (
    <group ref={g} scale={[xz0, Math.max(y0, 0.0001), xz0]} visible={y0 > 0.002}>
      {children}
    </group>
  );
}

// The ground chunk itself doesn't vanish; it dips a little as the new place lands on it.
export function BounceGroup({ children }) {
  const tr = useContext(PopCtx);
  const g = useRef();
  useFrame(() => {
    const cur = tr?.current;
    if (!g.current) return;
    if (!cur || cur.mode !== "in") {
      g.current.position.y += (0 - g.current.position.y) * 0.2;
      return;
    }
    const p = Math.min(1, (nowS() - cur.t0) / 0.7);
    g.current.position.y = -Math.sin(p * Math.PI) * 0.22 * (1 - p * 0.5);
  });
  return <group ref={g}>{children}</group>;
}
