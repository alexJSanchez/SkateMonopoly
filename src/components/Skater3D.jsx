/* eslint-disable react/no-unknown-property, react/prop-types */
// Skater figures built from primitives. Local +x is the direction of travel;
// the skater stands sideways on the board and looks toward +z.
import * as THREE from "three";

const SKIN = "#d6a47c";
const PANTS = "#3a4659";
const SHOE = "#e8e2d2";

// Four silhouettes. Sizes are in model units where the whole skater is ~1 tall.
const BUILDS = {
  baggy: { legH: 0.4, legW: 0.15, torsoW: 0.4, torsoH: 0.3, torsoD: 0.26, head: 0.115, hat: "bucket", crouch: 0 },
  lanky: { legH: 0.5, legW: 0.1, torsoW: 0.26, torsoH: 0.38, torsoD: 0.17, head: 0.1, hat: "beanie", crouch: 0 },
  shortie: { legH: 0.3, legW: 0.11, torsoW: 0.3, torsoH: 0.24, torsoD: 0.2, head: 0.11, hat: "capBack", crouch: 0 },
  pro: { legH: 0.34, legW: 0.12, torsoW: 0.32, torsoH: 0.3, torsoD: 0.2, head: 0.11, hat: "capFwd", crouch: 1 },
};

function Block({ pos, size, color, rot }) {
  return (
    <mesh position={pos} rotation={rot} castShadow>
      <boxGeometry args={size} />
      <meshLambertMaterial color={color} />
    </mesh>
  );
}

function Hat({ kind, y, r, color }) {
  switch (kind) {
    case "bucket":
      return (
        <group position={[0, y, 0]}>
          <mesh position={[0, r * 0.55, 0]} castShadow>
            <cylinderGeometry args={[r * 1.05, r * 1.15, r * 0.9, 10]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[0, r * 0.15, 0]} castShadow>
            <cylinderGeometry args={[r * 1.7, r * 1.7, r * 0.1, 12]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      );
    case "beanie":
      return (
        <mesh position={[0, y + r * 0.35, 0]} castShadow>
          <sphereGeometry args={[r * 1.12, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshLambertMaterial color={color} />
        </mesh>
      );
    default: {
      // Cap: a dome plus a brim, turned backwards for "capBack".
      const dir = kind === "capBack" ? -1 : 1;
      return (
        <group position={[0, y, 0]}>
          <mesh position={[0, r * 0.3, 0]} castShadow>
            <sphereGeometry args={[r * 1.1, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
            <meshLambertMaterial color={color} />
          </mesh>
          <mesh position={[dir * r * 1.2, r * 0.18, 0]} castShadow>
            <boxGeometry args={[r * 1.1, r * 0.1, r * 1.5]} />
            <meshLambertMaterial color={color} />
          </mesh>
        </group>
      );
    }
  }
}

// `shirt` is the player's colour; `hat` colour defaults to a darker shade of it.
export function Skater({ build = "baggy", shirt = "#3f78b5", hatColor, board = true, scale = 1.25, lean = 0 }) {
  const b = BUILDS[build];
  const crouch = b.crouch * 0.08;
  const legTop = 0.1 + b.legH - crouch;
  const torsoY = legTop + b.torsoH / 2;
  const headY = legTop + b.torsoH + b.head + 0.02;
  const hat = hatColor ?? new THREE.Color(shirt).multiplyScalar(0.55).getStyle();
  const deckY = 0.1;
  return (
    <group scale={scale} rotation={[0, 0, lean]}>
      {board && (
        <group>
          <Block pos={[0, deckY, 0]} size={[0.92, 0.03, 0.24]} color="#d9a441" />
          <Block pos={[0.5, deckY + 0.04, 0]} size={[0.16, 0.03, 0.24]} color="#d9a441" rot={[0, 0, 0.45]} />
          <Block pos={[-0.5, deckY + 0.04, 0]} size={[0.16, 0.03, 0.24]} color="#d9a441" rot={[0, 0, -0.45]} />
          <Block pos={[0, deckY + 0.02, 0]} size={[0.5, 0.005, 0.2]} color="#2b2a28" />
          {[-0.3, 0.3].flatMap((x) =>
            [-0.1, 0.1].map((z) => (
              <mesh key={`${x}${z}`} position={[x, 0.055, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.055, 0.055, 0.05, 8]} />
                <meshLambertMaterial color="#e9e4d4" />
              </mesh>
            ))
          )}
        </group>
      )}
      {/* legs and shoes: one over each bolt of the board */}
      {[-0.2, 0.2].map((x) => (
        <group key={x}>
          <Block pos={[x, 0.1 + 0.03, 0.04]} size={[0.17, 0.05, 0.22]} color={SHOE} />
          <Block pos={[x * 0.85, 0.1 + b.legH / 2 - crouch / 2 + 0.03, 0]} size={[b.legW, b.legH - crouch, b.legW]} color={PANTS} />
        </group>
      ))}
      {/* torso in the player's colour, arms hanging at the sides */}
      <Block pos={[0, torsoY, 0]} size={[b.torsoW, b.torsoH, b.torsoD]} color={shirt} />
      {[-1, 1].map((s) => (
        <Block
          key={s}
          pos={[s * (b.torsoW / 2 + 0.04), torsoY - 0.03, 0]}
          size={[0.07, b.torsoH * 0.95, 0.09]}
          color={shirt}
          rot={[0, 0, s * -0.12]}
        />
      ))}
      <mesh position={[0, headY, 0]} castShadow>
        <sphereGeometry args={[b.head, 10, 8]} />
        <meshLambertMaterial color={SKIN} />
      </mesh>
      <Hat kind={b.hat} y={headY + b.head * 0.55} r={b.head} color={hat} />
    </group>
  );
}

// A flag in the owner's colour on a thin pole, planted on a tile's outer edge.
export function Flag({ color }) {
  return (
    <group>
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 1, 6]} />
        <meshLambertMaterial color="#cfcfcf" />
      </mesh>
      <mesh position={[0.2, 0.86, 0]} castShadow>
        <boxGeometry args={[0.4, 0.24, 0.02]} />
        <meshLambertMaterial color={color} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
