import { lazy, Suspense } from "react";
import Board from "./components/Board";
import "./App.css";

// Add ?3d to the URL to try the Three.js board. It's lazy-loaded so the
// regular game doesn't download Three.js.
const Board3D = lazy(() => import("./components/Board3D"));
const use3D = new URLSearchParams(window.location.search).has("3d");

function App() {
  if (!use3D) return <Board />;
  return (
    <Suspense fallback={null}>
      <Board3D />
    </Suspense>
  );
}

export default App;
