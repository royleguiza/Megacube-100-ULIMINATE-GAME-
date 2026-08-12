import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Zap, ZoomIn } from 'lucide-react';
import { CubeState, getColorHex, applyMove, isStateSolved } from '../utils/cubeLogic';
import { CubePalette, MoveStep, FaceIndex, ViewMode, SpeedTier } from '../types';

interface RubikCanvasProps {
  cubeState: CubeState;
  setCubeState: React.Dispatch<React.SetStateAction<CubeState>>;
  palette: CubePalette;
  animSpeedMs: number;
  viewMode: ViewMode;
  onMoveComplete: (move: MoveStep) => void;
  onSolved?: () => void;
  animatingMove: MoveStep | null;
  setAnimatingMove: (move: MoveStep | null) => void;
  showLabels?: boolean;
  selectedSpeedTier: SpeedTier;
  onTurboTurn: (moves: MoveStep[], nextCubeState: CubeState) => void;
  isVirtualTurboHolding?: boolean;
}

const CUBE_SIZE = 3.6;

export const RubikCanvas: React.FC<RubikCanvasProps> = ({
  cubeState,
  setCubeState,
  palette,
  animSpeedMs,
  viewMode,
  onMoveComplete,
  onSolved,
  animatingMove,
  setAnimatingMove,
  showLabels = true,
  selectedSpeedTier,
  onTurboTurn,
  isVirtualTurboHolding = false,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const cubeGroupRef = useRef<THREE.Group>(new THREE.Group());
  const pivotGroupRef = useRef<THREE.Group>(new THREE.Group());
  const stickersMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const dummyObject = useRef<THREE.Object3D>(new THREE.Object3D());

  // Turbo Spin States & Refs
  const [isZoomedIn, setIsZoomedIn] = useState<boolean>(false);
  const [isRightClickActive, setIsRightClickActive] = useState<boolean>(false);
  const [turboTurnsCount, setTurboTurnsCount] = useState<number>(0);

  const isRightClickHeldRef = useRef<boolean>(false);

  // Sync virtual button state with right click ref
  useEffect(() => {
    if (isVirtualTurboHolding) {
      isRightClickHeldRef.current = true;
      setIsRightClickActive(true);
    } else if (!isRightClickActive) {
      isRightClickHeldRef.current = false;
    }
  }, [isVirtualTurboHolding, isRightClickActive]);

  const cubeStateRef = useRef<CubeState>(cubeState);
  useEffect(() => {
    cubeStateRef.current = cubeState;
  }, [cubeState]);

  const selectedSpeedTierRef = useRef<SpeedTier>(selectedSpeedTier);
  useEffect(() => {
    selectedSpeedTierRef.current = selectedSpeedTier;
  }, [selectedSpeedTier]);

  const onTurboTurnRef = useRef(onTurboTurn);
  useEffect(() => {
    onTurboTurnRef.current = onTurboTurn;
  }, [onTurboTurn]);

  // Raycasting & Drag Interaction State
  const isPointerDown = useRef<boolean>(false);
  const pointerStart = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const clickedStickerInfo = useRef<{
    face: number;
    r: number;
    c: number;
    intersectionPoint: THREE.Vector3;
  } | null>(null);

  const N = cubeState[0].length;
  const isAnimatingRef = useRef<boolean>(false);

  // Camera Zoom Monitor (+500 giros/min bonus when camera is close)
  useEffect(() => {
    const interval = setInterval(() => {
      if (cameraRef.current) {
        const dist = cameraRef.current.position.length();
        const zoomed = dist < 7.5;
        setIsZoomedIn((prev) => (prev !== zoomed ? zoomed : prev));
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Continuous Turbo Spin Loop (when right mouse button or virtual turbo button is held)
  useEffect(() => {
    let lastTime = performance.now();
    let moveAccumulator = 0;
    let animationFrameId: number;

    const tick = (now: number) => {
      const deltaSec = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;

      if (isRightClickHeldRef.current) {
        const currentTier = selectedSpeedTierRef.current;
        const isZoomed = cameraRef.current ? cameraRef.current.position.length() < 7.5 : false;
        const totalTurnsPerMin = currentTier.turnsPerMin + (isZoomed ? 500 : 0);
        const turnsPerSec = totalTurnsPerMin / 60;

        moveAccumulator += turnsPerSec * deltaSec;

        if (moveAccumulator >= 1) {
          const countToGenerate = Math.floor(moveAccumulator);
          moveAccumulator -= countToGenerate;

          const generatedMoves: MoveStep[] = [];
          let currState = cubeStateRef.current;
          const axes: ('x' | 'y' | 'z')[] = ['x', 'y', 'z'];
          const dirs: (1 | -1)[] = [1, -1];

          for (let i = 0; i < countToGenerate; i++) {
            const axis = axes[Math.floor(Math.random() * 3)];
            const sliceIndex = Math.floor(Math.random() * N);
            const dir = dirs[Math.floor(Math.random() * 2)];
            const move: MoveStep = { axis, sliceIndex, dir };

            generatedMoves.push(move);
            currState = applyMove(currState, axis, sliceIndex, dir);
          }

          setCubeState(currState);
          onTurboTurnRef.current(generatedMoves, currState);
          setTurboTurnsCount((prev) => prev + countToGenerate);
        }
      }

      animationFrameId = requestAnimationFrame(tick);
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animationFrameId);
  }, [N, setCubeState]);

  // Global Mouseup listener to cancel right-click hold safely
  useEffect(() => {
    const handleGlobalPointerUp = (e: MouseEvent | PointerEvent) => {
      if (e.button === 2 || isRightClickHeldRef.current) {
        isRightClickHeldRef.current = false;
        setIsRightClickActive(false);
      }
    };

    window.addEventListener('mouseup', handleGlobalPointerUp);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    return () => {
      window.removeEventListener('mouseup', handleGlobalPointerUp);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, []);

  // Helper to map (face, row, col) to a unique sticker index 0..(6*N*N - 1)
  const getStickerIndex = useCallback((face: number, r: number, c: number) => {
    return face * N * N + r * N + c;
  }, [N]);

  // Helper to get 3D local position & rotation for a sticker
  const getStickerTransform = useCallback((face: number, r: number, c: number, NSize: number) => {
    const s = CUBE_SIZE / NSize;
    const half = CUBE_SIZE / 2;
    // Slight offset outwards so stickers sit on outer surface
    const offset = half + 0.005;

    // Center offset for tiles
    const pos = (idx: number) => -half + (idx + 0.5) * s;

    let x = 0, y = 0, z = 0;
    let rx = 0, ry = 0, rz = 0;

    switch (face) {
      case FaceIndex.U: // Top (+Y)
        x = pos(c);
        y = offset;
        z = -pos(r);
        rx = -Math.PI / 2;
        break;
      case FaceIndex.D: // Bottom (-Y)
        x = pos(c);
        y = -offset;
        z = pos(r);
        rx = Math.PI / 2;
        break;
      case FaceIndex.F: // Front (+Z)
        x = pos(c);
        y = -pos(r);
        z = offset;
        break;
      case FaceIndex.B: // Back (-Z)
        x = -pos(c);
        y = -pos(r);
        z = -offset;
        ry = Math.PI;
        break;
      case FaceIndex.L: // Left (-X)
        x = -offset;
        y = -pos(r);
        z = -pos(c);
        ry = -Math.PI / 2;
        break;
      case FaceIndex.R: // Right (+X)
        x = offset;
        y = -pos(r);
        z = pos(c);
        ry = Math.PI / 2;
        break;
    }

    return {
      position: new THREE.Vector3(x, y, z),
      rotation: new THREE.Euler(rx, ry, rz),
      size: s * 0.94, // 6% padding gap between stickers for clean realistic plastic border
    };
  }, []);

  // Update or rebuild InstancedMesh stickers when N or state changes
  const updateStickers3D = useCallback((state: CubeState, currentPalette: CubePalette) => {
    const totalStickers = 6 * N * N;
    if (!stickersMeshRef.current || stickersMeshRef.current.count !== totalStickers) {
      if (stickersMeshRef.current) {
        cubeGroupRef.current.remove(stickersMeshRef.current);
        stickersMeshRef.current.geometry.dispose();
        (stickersMeshRef.current.material as THREE.Material).dispose();
      }

      // Create rounded tile plane geometry for stickers
      const tileMargin = N > 30 ? 0.98 : 0.92;
      const tileSize = (CUBE_SIZE / N) * tileMargin;
      const geom = new THREE.PlaneGeometry(tileSize, tileSize);
      
      const mat = new THREE.MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.1,
        side: THREE.DoubleSide,
      });

      const instancedMesh = new THREE.InstancedMesh(geom, mat, totalStickers);
      instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      stickersMeshRef.current = instancedMesh;
      cubeGroupRef.current.add(instancedMesh);
    }

    const mesh = stickersMeshRef.current;
    if (!mesh) return;

    for (let f = 0; f < 6; f++) {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const idx = getStickerIndex(f, r, c);
          const transform = getStickerTransform(f, r, c, N);

          dummyObject.current.position.copy(transform.position);
          dummyObject.current.rotation.copy(transform.rotation);
          dummyObject.current.scale.set(1, 1, 1);
          dummyObject.current.updateMatrix();

          mesh.setMatrixAt(idx, dummyObject.current.matrix);

          const colorHex = getColorHex(state[f][r][c], currentPalette);
          mesh.setColorAt(idx, new THREE.Color(colorHex));
        }
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [N, getStickerIndex, getStickerTransform]);

  // Main Three.js Scene Setup
  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color('#0F172A'); // Deep slate dark blue background

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(5.5, 4.5, 6.5);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxDistance = 25;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);

    // Inner Core Black Box (creates solid black plastic look inside gaps)
    const innerBoxGeom = new THREE.BoxGeometry(CUBE_SIZE * 0.995, CUBE_SIZE * 0.995, CUBE_SIZE * 0.995);
    const innerBoxMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(palette.body),
      roughness: 0.8,
    });
    const innerBox = new THREE.Mesh(innerBoxGeom, innerBoxMat);
    cubeGroupRef.current.add(innerBox);

    // Groups
    scene.add(cubeGroupRef.current);
    scene.add(pivotGroupRef.current);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize listener
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [palette.body]);

  // Update sticker graphics on state or palette change
  useEffect(() => {
    updateStickers3D(cubeState, palette);
  }, [cubeState, palette, updateStickers3D]);

  // Handle Animated Move Execution
  useEffect(() => {
    if (!animatingMove || isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const { axis, sliceIndex, dir } = animatingMove;
    const duration = animatingMove.duration !== undefined ? animatingMove.duration : animSpeedMs;

    // Instant move if duration is 0
    if (duration <= 0) {
      const nextState = applyMove(cubeState, axis, sliceIndex, dir);
      setCubeState(nextState);
      setAnimatingMove(null);
      isAnimatingRef.current = false;
      onMoveComplete(animatingMove);

      if (isStateSolved(nextState) && onSolved) {
        onSolved();
      }
      return;
    }

    // Smooth Pivot Rotation Animation
    const mesh = stickersMeshRef.current;
    if (!mesh) return;

    // Identify which stickers belong to this slice
    const sliceStickerIndices: number[] = [];
    const originalTransforms: { idx: number; matrix: THREE.Matrix4 }[] = [];

    const half = CUBE_SIZE / 2;
    const s = CUBE_SIZE / N;

    // Target slice coordinate range
    const sliceCoordMin = -half + sliceIndex * s - 0.001;
    const sliceCoordMax = -half + (sliceIndex + 1) * s + 0.001;

    for (let f = 0; f < 6; f++) {
      for (let r = 0; r < N; r++) {
        for (let c = 0; c < N; c++) {
          const transform = getStickerTransform(f, r, c, N);
          let posVal = transform.position.y;
          if (axis === 'x') posVal = transform.position.x;
          if (axis === 'z') posVal = transform.position.z;

          // Note: for Y axis, sliceIndex 0 is +Y (+half), sliceIndex N-1 is -Y (-half)
          if (axis === 'y') posVal = half - (sliceIndex + 0.5) * s;
          if (axis === 'x') posVal = half - (sliceIndex + 0.5) * s;
          if (axis === 'z') posVal = half - (sliceIndex + 0.5) * s;

          // Check if sticker is in rotating slice layer
          let inSlice = false;
          if (axis === 'y') {
            const stickerY = transform.position.y;
            const targetY = half - (sliceIndex + 0.5) * s;
            if (Math.abs(stickerY - targetY) < s * 0.55) inSlice = true;
          } else if (axis === 'x') {
            const stickerX = transform.position.x;
            const targetX = half - (sliceIndex + 0.5) * s;
            if (Math.abs(stickerX - targetX) < s * 0.55) inSlice = true;
          } else if (axis === 'z') {
            const stickerZ = transform.position.z;
            const targetZ = half - (sliceIndex + 0.5) * s;
            if (Math.abs(stickerZ - targetZ) < s * 0.55) inSlice = true;
          }

          if (inSlice) {
            const idx = getStickerIndex(f, r, c);
            sliceStickerIndices.push(idx);
            const mat = new THREE.Matrix4();
            mesh.getMatrixAt(idx, mat);
            originalTransforms.push({ idx, matrix: mat.clone() });
          }
        }
      }
    }

    const startTime = performance.now();
    const targetAngle = (dir * Math.PI) / 2;

    const animateRotation = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease out cubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const currentAngle = targetAngle * easeProgress;

      // Rotate transforms around specified axis
      const rotMatrix = new THREE.Matrix4();
      if (axis === 'x') rotMatrix.makeRotationX(currentAngle);
      if (axis === 'y') rotMatrix.makeRotationY(currentAngle);
      if (axis === 'z') rotMatrix.makeRotationZ(currentAngle);

      originalTransforms.forEach(({ idx, matrix }) => {
        const transformedMat = new THREE.Matrix4().multiplyMatrices(rotMatrix, matrix);
        mesh.setMatrixAt(idx, transformedMat);
      });
      mesh.instanceMatrix.needsUpdate = true;

      if (progress < 1) {
        requestAnimationFrame(animateRotation);
      } else {
        // Animation finished, apply state matrix update and reset transforms
        const nextState = applyMove(cubeState, axis, sliceIndex, dir);
        setCubeState(nextState);
        setAnimatingMove(null);
        isAnimatingRef.current = false;
        onMoveComplete(animatingMove);

        if (isStateSolved(nextState) && onSolved) {
          onSolved();
        }
      }
    };

    requestAnimationFrame(animateRotation);
  }, [animatingMove, animSpeedMs, cubeState, N, getStickerIndex, getStickerTransform, onMoveComplete, onSolved, setAnimatingMove, setCubeState]);

  // Pointer Raycasting for Interactive Touch / Mouse Slice Rotations
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      // Right Click held down -> Turbo Spin Mode!
      e.preventDefault();
      isRightClickHeldRef.current = true;
      setIsRightClickActive(true);
      return;
    }

    if (viewMode === 'rotate-cube') return; // In cube rotation mode, let OrbitControls handle drag
    if (isAnimatingRef.current || !cameraRef.current || !stickersMeshRef.current) return;

    const rect = mountRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    pointerStart.current = { x: e.clientX, y: e.clientY };
    isPointerDown.current = true;

    // Raycast to find clicked sticker
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);
    const intersects = raycaster.intersectObject(stickersMeshRef.current);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const instanceId = intersects[0].instanceId;
      const face = Math.floor(instanceId / (N * N));
      const rem = instanceId % (N * N);
      const r = Math.floor(rem / N);
      const c = rem % N;

      clickedStickerInfo.current = {
        face,
        r,
        c,
        intersectionPoint: intersects[0].point,
      };

      // Disable orbit controls temporarily while dragging slice
      if (controlsRef.current) controlsRef.current.enabled = false;
    } else {
      clickedStickerInfo.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDown.current || !clickedStickerInfo.current || isAnimatingRef.current) return;

    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    const dist = Math.hypot(dx, dy);

    // Minimum drag threshold in pixels
    if (dist < 18) return;

    const { face, r, c } = clickedStickerInfo.current;
    let axis: 'x' | 'y' | 'z' = 'y';
    let sliceIndex = 0;
    let dir: 1 | -1 = 1;

    // Determine slice axis & direction based on clicked face and screen drag direction
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    switch (face) {
      case FaceIndex.F: // Front (+Z)
      case FaceIndex.B: // Back (-Z)
        if (absX > absY) {
          // Horizontal drag on Front/Back -> Y axis slice rotation
          axis = 'y';
          sliceIndex = r; // Row index determines Y layer
          dir = dx > 0 ? (face === FaceIndex.F ? -1 : 1) : (face === FaceIndex.F ? 1 : -1);
        } else {
          // Vertical drag on Front/Back -> X axis slice rotation
          axis = 'x';
          sliceIndex = face === FaceIndex.F ? c : N - 1 - c;
          dir = dy > 0 ? (face === FaceIndex.F ? -1 : 1) : (face === FaceIndex.F ? 1 : -1);
        }
        break;

      case FaceIndex.U: // Top (+Y)
      case FaceIndex.D: // Bottom (-Y)
        if (absX > absY) {
          // Horizontal drag on Top/Bottom -> Z axis slice rotation
          axis = 'z';
          sliceIndex = face === FaceIndex.U ? r : N - 1 - r;
          dir = dx > 0 ? (face === FaceIndex.U ? 1 : -1) : (face === FaceIndex.U ? -1 : 1);
        } else {
          // Vertical drag on Top/Bottom -> X axis slice rotation
          axis = 'x';
          sliceIndex = c;
          dir = dy > 0 ? -1 : 1;
        }
        break;

      case FaceIndex.L: // Left (-X)
      case FaceIndex.R: // Right (+X)
        if (absX > absY) {
          // Horizontal drag on Left/Right -> Y axis slice rotation
          axis = 'y';
          sliceIndex = r;
          dir = dx > 0 ? (face === FaceIndex.R ? -1 : 1) : (face === FaceIndex.R ? 1 : -1);
        } else {
          // Vertical drag on Left/Right -> Z axis slice rotation
          axis = 'z';
          sliceIndex = face === FaceIndex.R ? c : N - 1 - c;
          dir = dy > 0 ? -1 : 1;
        }
        break;
    }

    // Trigger slice move
    setAnimatingMove({ axis, sliceIndex, dir });

    // Reset interaction state
    isPointerDown.current = false;
    clickedStickerInfo.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  const handlePointerUp = () => {
    isPointerDown.current = false;
    clickedStickerInfo.current = null;
    if (controlsRef.current) controlsRef.current.enabled = true;
  };

  return (
    <div
      className="relative w-full h-full min-h-[420px] rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none"
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={mountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />

      {/* Turbo Spin HUD Banner */}
      {isRightClickActive && (
        <div className="absolute inset-x-4 top-16 z-30 bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border-2 border-amber-500/80 shadow-2xl animate-pulse flex flex-col gap-2 pointer-events-none">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Zap className="w-4 h-4 text-amber-300 animate-bounce" />
              Modo Turbo Click Derecho Activo
            </span>
            <span className="font-mono text-xs font-bold text-amber-300 bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-700/60">
              +{turboTurnsCount.toLocaleString('es-ES')} giros
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs gap-2 border-t border-slate-800/80 pt-2">
            <div className="text-slate-200 font-semibold flex items-center gap-1.5">
              <span className="text-slate-400">Nivel:</span>
              <span className="text-amber-300 font-mono font-bold">{selectedSpeedTier.fingerTag}</span>
            </div>

            <div className="flex items-center gap-2 font-mono font-bold text-xs">
              <span className="text-slate-400">{selectedSpeedTier.turnsPerMin.toLocaleString('es-ES')} /min</span>

              {isZoomedIn ? (
                <span className="text-emerald-400 bg-emerald-950/90 border border-emerald-500/60 px-2 py-0.5 rounded-md flex items-center gap-1 font-bold animate-pulse">
                  <ZoomIn className="w-3.5 h-3.5 text-emerald-300" />
                  Zoom +500 giros/min
                </span>
              ) : (
                <span className="text-slate-500 text-[11px] italic">
                  (Acerca el cubo para +500)
                </span>
              )}

              <span className="text-amber-400 bg-amber-950/90 px-2 py-0.5 rounded-md border border-amber-500/50">
                Total: {(selectedSpeedTier.turnsPerMin + (isZoomedIn ? 500 : 0)).toLocaleString('es-ES')} giros/min
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Face Labels Overlay Indicator */}
      {showLabels && (
        <div className="absolute top-4 left-4 pointer-events-none flex flex-col gap-1.5 text-xs font-mono text-slate-300 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700/50 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-white shadow-sm" />
            <span>Top (U)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span>Frente (F)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span>Derecha (R)</span>
          </div>
        </div>
      )}

      {/* Zoom Status Indicator */}
      <div className="absolute top-4 right-24 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 text-xs font-medium shadow-md">
        {isZoomedIn ? (
          <span className="text-emerald-400 font-bold flex items-center gap-1.5 animate-pulse">
            <ZoomIn className="w-3.5 h-3.5 text-emerald-400" />
            Zoom Cerca (+500 giros/min)
          </span>
        ) : (
          <span className="text-slate-400 flex items-center gap-1.5">
            <ZoomIn className="w-3.5 h-3.5 text-slate-500" />
            Zoom Normal
          </span>
        )}
      </div>

      {/* Mode Status Pill */}
      <div className="absolute bottom-4 left-4 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium text-slate-300 shadow-md">
        {viewMode === 'rotate-slice' ? (
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Modo Giro Táctil Activo
          </span>
        ) : (
          <span className="text-sky-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Modo Cámara (Rotar Vista)
          </span>
        )}
      </div>

      {/* Size Indicator Badge */}
      <div className="absolute top-4 right-4 pointer-events-none bg-indigo-600/90 text-white font-mono font-bold text-sm px-3.5 py-1.5 rounded-xl shadow-lg border border-indigo-400/30">
        {N}x{N}x{N}
      </div>
    </div>
  );

};
