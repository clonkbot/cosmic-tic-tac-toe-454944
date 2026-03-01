import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Stars, Text } from '@react-three/drei'
import { Suspense, useState, useCallback, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

type Player = 'X' | 'O' | null
type Board = Player[]

const WINNING_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6] // diags
]

function checkWinner(board: Board): { winner: Player; line: number[] | null } {
  for (const combo of WINNING_COMBOS) {
    const [a, b, c] = combo
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line: combo }
    }
  }
  return { winner: null, line: null }
}

function XPiece({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null!)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setScale(1), 50)
    return () => clearTimeout(timer)
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={groupRef} position={position} scale={scale * 0.8}>
      <mesh rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.12, 0.8, 0.12]} />
        <meshStandardMaterial
          color="#ff00aa"
          emissive="#ff00aa"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.12, 0.8, 0.12]} />
        <meshStandardMaterial
          color="#ff00aa"
          emissive="#ff00aa"
          emissiveIntensity={0.5}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
    </group>
  )
}

function OPiece({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const timer = setTimeout(() => setScale(1), 50)
    return () => clearTimeout(timer)
  }, [])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <mesh ref={meshRef} position={position} scale={scale * 0.8} castShadow>
      <torusGeometry args={[0.28, 0.08, 16, 32]} />
      <meshStandardMaterial
        color="#00fff5"
        emissive="#00fff5"
        emissiveIntensity={0.5}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}

function GridLines({ winningLine }: { winningLine: number[] | null }) {
  const baseColor = "#1a1a2e"
  const glowColor = "#3d3d5c"

  return (
    <group>
      {/* Vertical lines */}
      <mesh position={[-0.5, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 3]} />
        <meshStandardMaterial color={baseColor} emissive={glowColor} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.5, 0, 0]}>
        <boxGeometry args={[0.04, 0.04, 3]} />
        <meshStandardMaterial color={baseColor} emissive={glowColor} emissiveIntensity={0.3} />
      </mesh>

      {/* Horizontal lines */}
      <mesh position={[0, 0, -0.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.04, 0.04, 3]} />
        <meshStandardMaterial color={baseColor} emissive={glowColor} emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[0.04, 0.04, 3]} />
        <meshStandardMaterial color={baseColor} emissive={glowColor} emissiveIntensity={0.3} />
      </mesh>

      {/* Winning line highlight */}
      {winningLine && <WinningLineHighlight line={winningLine} />}
    </group>
  )
}

function WinningLineHighlight({ line }: { line: number[] }) {
  const getPosition = (index: number): [number, number, number] => {
    const x = (index % 3 - 1) * 1
    const z = (Math.floor(index / 3) - 1) * 1
    return [x, 0.1, z]
  }

  const start = getPosition(line[0])
  const end = getPosition(line[2])
  const midX = (start[0] + end[0]) / 2
  const midZ = (start[2] + end[2]) / 2
  const length = Math.sqrt(Math.pow(end[0] - start[0], 2) + Math.pow(end[2] - start[2], 2)) + 0.5
  const angle = Math.atan2(end[2] - start[2], end[0] - start[0])

  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 4) * 0.4
    }
  })

  return (
    <mesh ref={meshRef} position={[midX, 0.1, midZ]} rotation={[0, -angle, 0]}>
      <boxGeometry args={[length, 0.08, 0.08]} />
      <meshStandardMaterial
        color="#ffd700"
        emissive="#ffd700"
        emissiveIntensity={1}
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}

function Cell({
  index,
  position,
  value,
  onClick,
  disabled
}: {
  index: number
  position: [number, number, number]
  value: Player
  onClick: () => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const meshRef = useRef<THREE.Mesh>(null!)

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          if (!disabled && !value) onClick()
        }}
        onPointerOver={() => !disabled && !value && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <boxGeometry args={[0.9, 0.08, 0.9]} />
        <meshStandardMaterial
          color={hovered ? "#1a1a3a" : "#0d0d1a"}
          transparent
          opacity={hovered ? 0.8 : 0.3}
          emissive={hovered ? "#2a2a5a" : "#000000"}
          emissiveIntensity={hovered ? 0.5 : 0}
        />
      </mesh>
      {value === 'X' && <XPiece position={[0, 0.2, 0]} />}
      {value === 'O' && <OPiece position={[0, 0.2, 0]} />}
    </group>
  )
}

function GameBoard({
  board,
  onCellClick,
  winningLine,
  gameOver
}: {
  board: Board
  onCellClick: (index: number) => void
  winningLine: number[] | null
  gameOver: boolean
}) {
  const groupRef = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05
    }
  })

  const getCellPosition = (index: number): [number, number, number] => {
    const x = (index % 3 - 1) * 1
    const z = (Math.floor(index / 3) - 1) * 1
    return [x, 0, z]
  }

  return (
    <Float speed={2} rotationIntensity={0.1} floatIntensity={0.3}>
      <group ref={groupRef}>
        <GridLines winningLine={winningLine} />
        {board.map((value, index) => (
          <Cell
            key={index}
            index={index}
            position={getCellPosition(index)}
            value={value}
            onClick={() => onCellClick(index)}
            disabled={gameOver}
          />
        ))}
      </group>
    </Float>
  )
}

function StatusText({
  currentPlayer,
  winner,
  isDraw
}: {
  currentPlayer: Player
  winner: Player
  isDraw: boolean
}) {
  let text = ''
  let color = '#ffffff'

  if (winner) {
    text = `${winner} WINS!`
    color = winner === 'X' ? '#ff00aa' : '#00fff5'
  } else if (isDraw) {
    text = "IT'S A DRAW!"
    color = '#ffd700'
  } else {
    text = `${currentPlayer}'S TURN`
    color = currentPlayer === 'X' ? '#ff00aa' : '#00fff5'
  }

  return (
    <Text
      position={[0, 2.2, 0]}
      fontSize={0.35}
      color={color}
      anchorX="center"
      anchorY="middle"
      font="https://fonts.gstatic.com/s/orbitron/v31/yMJRMIlzdpvBhQQL_Qq7dy0.woff2"
    >
      {text}
    </Text>
  )
}

function Scene({
  board,
  onCellClick,
  currentPlayer,
  winner,
  winningLine,
  isDraw
}: {
  board: Board
  onCellClick: (index: number) => void
  currentPlayer: Player
  winner: Player
  winningLine: number[] | null
  isDraw: boolean
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-5, 3, -5]} intensity={0.5} color="#ff00aa" />
      <pointLight position={[5, 3, -5]} intensity={0.5} color="#00fff5" />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <StatusText currentPlayer={currentPlayer} winner={winner} isDraw={isDraw} />

      <GameBoard
        board={board}
        onCellClick={onCellClick}
        winningLine={winningLine}
        gameOver={!!winner || isDraw}
      />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={10}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.2}
        enableDamping
        dampingFactor={0.05}
      />

      <Environment preset="night" />
    </>
  )
}

export default function App() {
  const [board, setBoard] = useState<Board>(Array(9).fill(null))
  const [currentPlayer, setCurrentPlayer] = useState<'X' | 'O'>('X')
  const [scores, setScores] = useState({ X: 0, O: 0 })

  const { winner, line: winningLine } = checkWinner(board)
  const isDraw = !winner && board.every(cell => cell !== null)

  useEffect(() => {
    if (winner) {
      setScores(prev => ({
        ...prev,
        [winner]: prev[winner as 'X' | 'O'] + 1
      }))
    }
  }, [winner])

  const handleCellClick = useCallback((index: number) => {
    if (board[index] || winner) return

    const newBoard = [...board]
    newBoard[index] = currentPlayer
    setBoard(newBoard)
    setCurrentPlayer(currentPlayer === 'X' ? 'O' : 'X')
  }, [board, currentPlayer, winner])

  const resetGame = useCallback(() => {
    setBoard(Array(9).fill(null))
    setCurrentPlayer('X')
  }, [])

  return (
    <div className="w-screen h-screen bg-[#0a0a0f] overflow-hidden relative">
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0f]/50 pointer-events-none z-10" />

      {/* Score Board */}
      <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 md:gap-8">
        <div className="text-center">
          <div className="text-[#ff00aa] font-orbitron text-xl md:text-2xl font-bold tracking-wider drop-shadow-[0_0_10px_rgba(255,0,170,0.5)]">
            X
          </div>
          <div className="text-white font-orbitron text-2xl md:text-3xl font-bold">
            {scores.X}
          </div>
        </div>

        <div className="w-px h-12 md:h-16 bg-gradient-to-b from-transparent via-[#3d3d5c] to-transparent" />

        <div className="text-center">
          <div className="text-[#00fff5] font-orbitron text-xl md:text-2xl font-bold tracking-wider drop-shadow-[0_0_10px_rgba(0,255,245,0.5)]">
            O
          </div>
          <div className="text-white font-orbitron text-2xl md:text-3xl font-bold">
            {scores.O}
          </div>
        </div>
      </div>

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 4, 5], fov: 50 }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene
            board={board}
            onCellClick={handleCellClick}
            currentPlayer={currentPlayer}
            winner={winner}
            winningLine={winningLine}
            isDraw={isDraw}
          />
        </Suspense>
      </Canvas>

      {/* Game Over Overlay */}
      {(winner || isDraw) && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="text-center pointer-events-auto">
            <button
              onClick={resetGame}
              className="group relative px-8 py-4 md:px-12 md:py-5 bg-[#0d0d1a]/90 border-2 border-[#3d3d5c] rounded-lg
                       font-orbitron text-base md:text-lg tracking-widest text-white uppercase
                       hover:border-[#ffd700] hover:shadow-[0_0_30px_rgba(255,215,0,0.3)]
                       transition-all duration-300 ease-out
                       active:scale-95"
            >
              <span className="relative z-10">Play Again</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#ff00aa]/10 via-transparent to-[#00fff5]/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-16 md:bottom-12 left-1/2 -translate-x-1/2 z-20 text-center">
        <p className="text-[#3d3d5c] font-orbitron text-[10px] md:text-xs tracking-widest uppercase">
          Click to place · Drag to rotate
        </p>
      </div>

      {/* Footer */}
      <footer className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20">
        <p className="text-[#2a2a3a] font-orbitron text-[9px] md:text-[10px] tracking-wide">
          Requested by <span className="text-[#3d3d5c]">@web-user</span> · Built by <span className="text-[#3d3d5c]">@clonkbot</span>
        </p>
      </footer>
    </div>
  )
}
