/* eslint-disable react/no-unknown-property, react/prop-types */
// Three.js models for the board: camcorder, film tape and dice.
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ---- Camcorder + tape -------------------------------------------------------
// Both are described in the same little units as the CSS version
// (x along the camera, y across, z up) and scaled down to fit a space.
const S = 0.042;

// A box from its corner + size, in CSS-model units (css y -> world z, css z -> world y).
function B({ x, y, z, w, d, h, color }) {
  return (
    <mesh position={[x + w / 2, z + h / 2, y + d / 2]} castShadow>
      <boxGeometry args={[w, h, d]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

// A cylinder lying along x (the lens), centred at (x, y, z).
function Barrel({ x, y, z, r, len, color }) {
  return (
    <mesh position={[x + len / 2, z, y]} rotation={[0, 0, Math.PI / 2]} castShadow>
      <cylinderGeometry args={[r, r, len, 24]} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

export function Camcorder({ color }) {
  const grey = "#9a9d9b";
  const dark = "#25272a";
  return (
    <group scale={S} position={[-12 * S, 0, -4 * S]}>
      <B x={-1.2} y={-1} z={0} w={24.4} d={9} h={1} color={color} />
      <B x={6} y={0} z={1} w={12} d={7} h={7} color={grey} />
      {/* owner stripe on the side */}
      <B x={6.5} y={-0.05} z={5.2} w={11} d={0.2} h={1.2} color={color} />
      <Barrel x={1.6} y={3.5} z={4.5} r={2.4} len={4.4} color={dark} />
      <Barrel x={5.6} y={3.5} z={4.5} r={2.7} len={0.6} color="#c3c6c8" />
      <Barrel x={0} y={3.5} z={4.5} r={3.7} len={2.2} color="#101112" />
      <mesh position={[-0.1, 4.5, 3.5]} rotation={[0, 0, Math.PI / 2]}>
        <circleGeometry args={[3.1, 24]} />
        <meshLambertMaterial color="#1b2c4d" />
      </mesh>
      <B x={4.5} y={2.8} z={8} w={1.4} d={1.4} h={0.9} color={grey} />
      <B x={13} y={2.8} z={8} w={1.4} d={1.4} h={0.9} color={grey} />
      <B x={3.5} y={2.8} z={8.9} w={11} d={1.4} h={0.9} color={grey} />
      <B x={0.6} y={2.4} z={9.2} w={5} d={2.2} h={2.2} color={dark} />
      <B x={16.5} y={0.5} z={5.4} w={5.5} d={3} h={2.8} color="#1f2122" />
      <B x={21.8} y={0.2} z={5.1} w={1.2} d={3.6} h={3.4} color="#111" />
    </group>
  );
}

export function Tape({ color }) {
  return (
    <group scale={S} position={[-7 * S, 0, -2 * S]}>
      <B x={-0.5} y={-1.2} z={0} w={15} d={6.4} h={1} color={color} />
      <B x={1} y={0.5} z={1} w={12.5} d={3.6} h={9} color="#1d1f21" />
      {/* the owner-coloured label and the two reel windows on the front */}
      <B x={2} y={-0.05} z={5.6} w={10.5} d={0.2} h={2.8} color={color} />
      <B x={3} y={-0.05} z={1.8} w={8.5} d={0.2} h={2.6} color="#3a3d41" />
      {[5.2, 9.3].map((x) => (
        <mesh key={x} position={[x, 3.1, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.3, 16]} />
          <meshLambertMaterial color="#e8e8e8" />
        </mesh>
      ))}
    </group>
  );
}

// ---- Dice -------------------------------------------------------------------
// Which pip positions (3x3 grid, 0-8) each value uses.
const PIPS = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function faceTexture(value) {
  const size = 128;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#fbfbf8";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = value === 1 ? "#c53030" : "#1a1a1a";
  for (const cell of PIPS[value]) {
    const col = cell % 3;
    const row = Math.floor(cell / 3);
    ctx.beginPath();
    ctx.arc(size * (0.24 + col * 0.26), size * (0.24 + row * 0.26), value === 1 ? 17 : 12, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// BoxGeometry material order is +x, -x, +y, -y, +z, -z. Opposite faces sum to 7.
const FACE_VALUES = [3, 4, 1, 6, 2, 5];
const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0),
  new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0),
  new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1),
  new THREE.Vector3(0, 0, -1),
];
const UP = new THREE.Vector3(0, 1, 0);

// A die that tumbles while `rolling`, then settles with `value` face up.
export function Die({ value, rolling, position, seed = 0 }) {
  const mesh = useRef();
  const textures = useMemo(() => [1, 2, 3, 4, 5, 6].map(faceTexture), []);
  const materials = useMemo(
    () => FACE_VALUES.map((v) => new THREE.MeshLambertMaterial({ map: textures[v - 1] })),
    [textures]
  );
  const spin = useMemo(
    () => new THREE.Vector3(5 + seed * 2, 7 - seed * 3, 4 + seed).multiplyScalar(1),
    [seed]
  );
  const rest = useMemo(() => {
    // Rotate the face showing `value` to the top, with a little yaw so dice don't look identical.
    const face = FACE_VALUES.indexOf(value);
    const q = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[face], UP);
    const yaw = new THREE.Quaternion().setFromAxisAngle(UP, 0.5 + seed * 1.3);
    return yaw.multiply(q);
  }, [value, seed]);
  const tmp = useMemo(() => new THREE.Quaternion(), []);

  useFrame((_, dt) => {
    const m = mesh.current;
    if (!m) return;
    if (rolling) {
      tmp.setFromEuler(new THREE.Euler(spin.x * dt, spin.y * dt, spin.z * dt));
      m.quaternion.premultiply(tmp);
      m.position.y = position[1] + 0.25 + Math.abs(Math.sin(performance.now() / 160 + seed)) * 0.5;
    } else {
      m.quaternion.slerp(rest, Math.min(1, dt * 10));
      m.position.y += (position[1] - m.position.y) * Math.min(1, dt * 10);
    }
  });

  return (
    <mesh ref={mesh} position={position} material={materials} castShadow>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
    </mesh>
  );
}
