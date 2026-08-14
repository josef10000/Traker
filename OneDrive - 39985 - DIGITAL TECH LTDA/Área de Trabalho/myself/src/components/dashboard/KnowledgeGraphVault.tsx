"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Orbit, 
  Plus, 
  Search, 
  Hash, 
  Sun, 
  Globe, 
  Maximize2, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  X, 
  Edit3, 
  Move,
  Save,
  Sparkles,
  Radio,
  FileText
} from "lucide-react";

export interface StarMaster {
  id: string;
  name: string;
  system: string;
  color: "gold" | "purple" | "cyan" | "emerald";
  x: number;
  y: number;
}

export interface PlanetNote {
  id: string;
  starId: string;
  title: string;
  content: string;
  orbitRadius: number; // orbital distance from star
  angle: number; // angle in radians
  orbitSpeed: number; // speed of rotation
  associations: string[];
  updatedAt: string;
  // Dragged custom offset relative to star if dragged
  customX?: number;
  customY?: number;
}

export default function KnowledgeGraphVault() {
  // Initial Stars Data
  const [stars, setStars] = useState<StarMaster[]>([
    { id: "s1", name: "Estrela Solar de Vitalidade", system: "Saúde", color: "gold", x: 250, y: 220 },
    { id: "s2", name: "Estrela Névoa de Conhecimento", system: "Estudos", color: "purple", x: 620, y: 180 },
    { id: "s3", name: "Estrela Alfa de Carreira", system: "Projetos", color: "cyan", x: 440, y: 460 },
    { id: "s4", name: "Estrela Esmeralda de Recursos", system: "Finanças", color: "emerald", x: 820, y: 420 },
  ]);

  // Initial Orbiting Planets Data
  const [planets, setPlanets] = useState<PlanetNote[]>([
    {
      id: "p1",
      starId: "s3",
      title: "Arquitetura MindVault Cosmos",
      content: "O Nexo Cósmico utiliza um Canvas Espacial 2D interativo com zoom, pan e drag & drop de estrelas e planetas. Conectado com #DesignCosmico e #NextJS15.",
      orbitRadius: 90,
      angle: 0.5,
      orbitSpeed: 0.005,
      associations: ["DesignCosmico", "NextJS15"],
      updatedAt: "Hoje, 17:45"
    },
    {
      id: "p2",
      starId: "s2",
      title: "Design de Estrelas & Órbitas 2D",
      content: "Desenvolvimento de esferas celestes iluminadas em SVG com auras de luz pulsantes. Associação: #ArquiteturaCosmos.",
      orbitRadius: 100,
      angle: 2.1,
      orbitSpeed: 0.004,
      associations: ["ArquiteturaCosmos"],
      updatedAt: "Ontem, 20:10"
    },
    {
      id: "p3",
      starId: "s2",
      title: "Fichamento Livro Essencialismo",
      content: "Eliminar o desnecessário para clareza absoluta de pensamento. Conecta com a meta de #VitalidadeMindVault.",
      orbitRadius: 150,
      angle: 4.2,
      orbitSpeed: 0.003,
      associations: ["VitalidadeMindVault"],
      updatedAt: "04 Ago"
    },
    {
      id: "p4",
      starId: "s1",
      title: "Ficha de Treino & Gravidade Física",
      content: "Rotina de exercícios A/B/C com foco em força e recuperação biológica.",
      orbitRadius: 85,
      angle: 1.2,
      orbitSpeed: 0.006,
      associations: ["VitalidadeMindVault"],
      updatedAt: "01 Ago"
    },
    {
      id: "p5",
      starId: "s4",
      title: "Reserva de Emergência & Investimentos",
      content: "Alocação estratégica de capital para garantia de liberdade financeira.",
      orbitRadius: 95,
      angle: 3.5,
      orbitSpeed: 0.004,
      associations: ["RecursosFinanceiros"],
      updatedAt: "28 Jul"
    }
  ]);

  // Viewport Zoom & Pan State
  const [zoomScale, setZoomScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Dragging State
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [draggingEntity, setDraggingEntity] = useState<{ type: "star" | "planet"; id: string } | null>(null);

  // Inspector & Editor State
  const [activePlanetId, setActivePlanetId] = useState<string | null>("p1");
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOrbitingAnimated, setIsOrbitingAnimated] = useState(true);

  // New Star/Planet Modal States
  const [showAddStarModal, setShowAddStarModal] = useState(false);
  const [newStarName, setNewStarName] = useState("");
  const [newStarColor, setNewStarColor] = useState<"gold" | "purple" | "cyan" | "emerald">("gold");

  const [showAddPlanetModal, setShowAddPlanetModal] = useState(false);
  const [newPlanetTitle, setNewPlanetTitle] = useState("");
  const [newPlanetStarId, setNewPlanetStarId] = useState("s2");

  const containerRef = useRef<HTMLDivElement>(null);

  // Orbit rotation animation loop
  useEffect(() => {
    if (!isOrbitingAnimated) return;
    const interval = setInterval(() => {
      setPlanets(prevPlanets =>
        prevPlanets.map(p => ({
          ...p,
          angle: (p.angle + p.orbitSpeed) % (2 * Math.PI)
        }))
      );
    }, 40);
    return () => clearInterval(interval);
  }, [isOrbitingAnimated]);

  // Active Planet / Note Inspector
  const activePlanet = planets.find(p => p.id === activePlanetId);
  const activeStar = activePlanet ? stars.find(s => s.id === activePlanet.starId) : null;

  // Zoom Controls
  const handleZoomIn = () => setZoomScale(prev => Math.min(prev + 0.2, 2.5));
  const handleZoomOut = () => setZoomScale(prev => Math.max(prev - 0.2, 0.4));
  const handleResetView = () => {
    setZoomScale(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setZoomScale(prev => Math.min(prev + 0.1, 2.5));
    } else {
      setZoomScale(prev => Math.max(prev - 0.1, 0.4));
    }
  };

  // Dragging Canvas Background (Pan) or Celestial Nodes
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    // Only pan if clicking direct canvas background
    if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).id === "canvas-bg") {
      setIsPanning(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    } else if (draggingEntity) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const mouseX = (e.clientX - rect.left - pan.x) / zoomScale;
      const mouseY = (e.clientY - rect.top - pan.y) / zoomScale;

      if (draggingEntity.type === "star") {
        setStars(prevStars =>
          prevStars.map(s => s.id === draggingEntity.id ? { ...s, x: mouseX, y: mouseY } : s)
        );
      } else if (draggingEntity.type === "planet") {
        setPlanets(prevPlanets =>
          prevPlanets.map(p => p.id === draggingEntity.id ? { ...p, customX: mouseX, customY: mouseY } : p)
        );
      }
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggingEntity(null);
  };

  // Add Star
  const handleAddStar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStarName.trim()) return;
    const newStar: StarMaster = {
      id: Date.now().toString(),
      name: newStarName,
      system: "Personalizado",
      color: newStarColor,
      x: 350 + Math.random() * 200,
      y: 250 + Math.random() * 150
    };
    setStars([...stars, newStar]);
    setNewStarName("");
    setShowAddStarModal(false);
  };

  // Add Planet
  const handleAddPlanet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanetTitle.trim()) return;
    const newPlanet: PlanetNote = {
      id: Date.now().toString(),
      starId: newPlanetStarId,
      title: newPlanetTitle,
      content: "Escreva suas anotações aqui... Conecte com #Associação",
      orbitRadius: 80 + Math.random() * 60,
      angle: Math.random() * Math.PI * 2,
      orbitSpeed: 0.004,
      associations: [],
      updatedAt: "Agora"
    };
    setPlanets([...planets, newPlanet]);
    setActivePlanetId(newPlanet.id);
    setIsInspectorOpen(true);
    setNewPlanetTitle("");
    setShowAddPlanetModal(false);
  };

  // Update Planet Content
  const handlePlanetContentChange = (newContent: string) => {
    if (!activePlanetId) return;
    const extractedTags = Array.from(newContent.matchAll(/#([a-zA-Z0-9_]+)/g)).map(m => m[1]);
    setPlanets(prev => prev.map(p => p.id === activePlanetId ? { ...p, content: newContent, associations: extractedTags } : p));
  };

  // Star Colors Mapping
  const getStarColors = (color: string) => {
    switch (color) {
      case "gold": return { core: "#fbbf24", glow: "#f59e0b", aura: "rgba(245, 158, 11, 0.45)", text: "#fde68a" };
      case "purple": return { core: "#c084fc", glow: "#a855f7", aura: "rgba(168, 85, 247, 0.45)", text: "#e9d5ff" };
      case "cyan": return { core: "#38bdf8", glow: "#0284c7", aura: "rgba(56, 189, 248, 0.45)", text: "#bae6fd" };
      default: return { core: "#34d399", glow: "#10b981", aura: "rgba(16, 185, 129, 0.45)", text: "#a7f3d0" };
    }
  };

  return (
    <div className="space-y-4 text-white">
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Orbit className="w-5 h-5 text-amber-400" />
            <span>Nexo Cósmico Interativo (Canvas Espacial 2D)</span>
          </h2>
          <p className="text-xs text-slate-400">
            **Clique e arraste** estrelas e planetas pelo mapa. Use o scroll do mouse ou os botões para dar **Zoom**.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowAddStarModal(true)}
            className="bg-amber-500 hover:bg-amber-400 text-black text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
          >
            <Sun className="w-4 h-4" />
            <span>Criar Estrela</span>
          </button>

          <button
            onClick={() => setShowAddPlanetModal(true)}
            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition shadow-lg shadow-purple-600/20"
          >
            <Globe className="w-4 h-4" />
            <span>Lançar Planeta</span>
          </button>

          <button
            onClick={() => setIsOrbitingAnimated(!isOrbitingAnimated)}
            className={`text-xs px-3 py-2 rounded-xl font-mono border transition flex items-center gap-1.5 ${
              isOrbitingAnimated ? "bg-space-900 text-emerald-400 border-emerald-500/30" : "bg-space-950 text-slate-400 border-slate-800"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{isOrbitingAnimated ? "Órbitas: Ativas" : "Órbitas: Pausadas"}</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas & Inspector Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Side (8 Cols): Interactive SVG/Canvas Viewport */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-slate-800 relative overflow-hidden min-h-[520px] flex flex-col justify-between">
          
          {/* Zoom Floating Toolbar */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 glass-panel p-1.5 rounded-xl border border-slate-800 shadow-xl">
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-slate-800 text-slate-200 transition"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-300 px-2">
              {Math.round(zoomScale * 100)}%
            </span>
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-slate-800 text-slate-200 transition"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-1" />
            <button
              onClick={handleResetView}
              className="p-1.5 rounded-lg bg-space-900 hover:bg-slate-800 text-slate-200 transition"
              title="Resetar Visão"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Search Filter Bar Floating */}
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Localizar no mapa..."
                className="bg-space-950/90 backdrop-blur-md border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-44"
              />
            </div>
          </div>

          {/* Interactive SVG Canvas Viewport */}
          <div
            id="canvas-bg"
            ref={containerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDownCanvas}
            onMouseMove={handleMouseMoveCanvas}
            onMouseUp={handleMouseUpCanvas}
            className="w-full h-full min-h-[520px] cursor-grab active:cursor-grabbing select-none relative bg-space-950"
          >
            <svg
              className="w-full h-full absolute inset-0 pointer-events-none"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomScale})`,
                transformOrigin: "0 0"
              }}
            >
              <defs>
                {/* Radial Glow Gradients for Master Stars */}
                <radialGradient id="glow-gold" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="glow-purple" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity="1" />
                  <stop offset="50%" stopColor="#a855f7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="glow-cyan" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="1" />
                  <stop offset="50%" stopColor="#0284c7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
                </radialGradient>

                <radialGradient id="glow-emerald" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
                  <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Draw Orbital Rings and Gravitational Lines */}
              {stars.map(star => {
                const starPlanets = planets.filter(p => p.starId === star.id);
                return (
                  <g key={`orbits-${star.id}`}>
                    {/* Orbital Path Rings */}
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={90}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.08)"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={140}
                      fill="none"
                      stroke="rgba(255, 255, 255, 0.05)"
                      strokeWidth="1"
                      strokeDasharray="6 6"
                    />

                    {/* Beam Lines connecting star to planets */}
                    {starPlanets.map(planet => {
                      const px = planet.customX !== undefined 
                        ? planet.customX 
                        : star.x + Math.cos(planet.angle) * planet.orbitRadius;
                      const py = planet.customY !== undefined 
                        ? planet.customY 
                        : star.y + Math.sin(planet.angle) * planet.orbitRadius;
                      
                      const isSelected = activePlanetId === planet.id;

                      return (
                        <line
                          key={`line-${planet.id}`}
                          x1={star.x}
                          y1={star.y}
                          x2={px}
                          y2={py}
                          stroke={isSelected ? "#a855f7" : "rgba(255, 255, 255, 0.15)"}
                          strokeWidth={isSelected ? "2" : "1"}
                          strokeDasharray={isSelected ? "none" : "2 2"}
                        />
                      );
                    })}
                  </g>
                );
              })}

              {/* Render Master Stars (Drag & Drop Supported) */}
              {stars.map(star => {
                const colors = getStarColors(star.color);
                return (
                  <g
                    key={`star-group-${star.id}`}
                    className="pointer-events-auto cursor-grab active:cursor-grabbing"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setDraggingEntity({ type: "star", id: star.id });
                    }}
                  >
                    {/* Pulsing Outer Glow Aura */}
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={38}
                      fill={`url(#glow-${star.color})`}
                      className="animate-pulse opacity-70"
                    />

                    {/* Solid Star Core */}
                    <circle
                      cx={star.x}
                      cy={star.y}
                      r={18}
                      fill={colors.core}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* Star Label */}
                    <text
                      x={star.x}
                      y={star.y + 34}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontSize="11"
                      fontWeight="bold"
                      fontFamily="monospace"
                      className="drop-shadow-md select-none"
                    >
                      ★ {star.name}
                    </text>
                  </g>
                );
              })}

              {/* Render Orbiting Planets (Drag & Drop Supported + Click to Inspect) */}
              {planets.map(planet => {
                const parentStar = stars.find(s => s.id === planet.starId) || stars[0];
                const px = planet.customX !== undefined 
                  ? planet.customX 
                  : parentStar.x + Math.cos(planet.angle) * planet.orbitRadius;
                const py = planet.customY !== undefined 
                  ? planet.customY 
                  : parentStar.y + Math.sin(planet.angle) * planet.orbitRadius;

                const isSelected = activePlanetId === planet.id;
                const matchesSearch = searchTerm && (planet.title.toLowerCase().includes(searchTerm.toLowerCase()) || planet.content.toLowerCase().includes(searchTerm.toLowerCase()));

                return (
                  <g
                    key={`planet-group-${planet.id}`}
                    className="pointer-events-auto cursor-pointer"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      setActivePlanetId(planet.id);
                      setIsInspectorOpen(true);
                      setDraggingEntity({ type: "planet", id: planet.id });
                    }}
                  >
                    {/* Selected Halo */}
                    {isSelected && (
                      <circle
                        cx={px}
                        cy={py}
                        r={16}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2"
                        className="animate-ping opacity-75"
                      />
                    )}

                    {/* Planet Core */}
                    <circle
                      cx={px}
                      cy={py}
                      r={isSelected ? 10 : matchesSearch ? 11 : 8}
                      fill={isSelected ? "#a855f7" : matchesSearch ? "#fbbf24" : "#ffffff"}
                      stroke={isSelected ? "#ffffff" : "#6b7280"}
                      strokeWidth="1.5"
                    />

                    {/* Planet Title Label */}
                    <text
                      x={px}
                      y={py + 20}
                      textAnchor="middle"
                      fill={isSelected ? "#a855f7" : "#d1d5db"}
                      fontSize="10"
                      fontWeight={isSelected ? "bold" : "normal"}
                      fontFamily="sans-serif"
                      className="drop-shadow-sm select-none"
                    >
                      {planet.title}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Bottom Controls Info */}
            <div className="absolute bottom-4 left-4 right-4 z-20 flex items-center justify-between text-[11px] text-slate-400 font-mono glass-panel p-2.5 rounded-xl border border-slate-800">
              <span className="flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-amber-400" />
                <span>Arraste os elementos para reorganizar seu cosmos</span>
              </span>
              <span>{planets.length} Planetas e {stars.length} Estrelas Mestre</span>
            </div>
          </div>
        </div>

        {/* Right Side (4 Cols): Note Inspector & Editor Drawer */}
        <div className="lg:col-span-4 glass-panel rounded-2xl border border-slate-800 p-5 flex flex-col justify-between space-y-4">
          {activePlanet ? (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-purple-400" /> Inspeção do Planeta
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {activePlanet.id}</span>
                </div>

                {/* Edit Title */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Título do Planeta</label>
                  <input
                    type="text"
                    value={activePlanet.title}
                    onChange={(e) => setPlanets(prev => prev.map(p => p.id === activePlanet.id ? { ...p, title: e.target.value } : p))}
                    className="w-full bg-space-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                {/* Star Parent Link */}
                <div className="flex items-center justify-between text-xs text-slate-400 bg-space-950 p-2.5 rounded-xl border border-slate-800 font-mono">
                  <span>Orbitando Estrela:</span>
                  <span className="font-bold text-amber-300">★ {activeStar?.name || "Estrela Mestre"}</span>
                </div>

                {/* Edit Markdown Content */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Conteúdo & Anotações (Markdown)</label>
                  <textarea
                    rows={8}
                    value={activePlanet.content}
                    onChange={(e) => handlePlanetContentChange(e.target.value)}
                    className="w-full bg-space-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                {/* Tags / Associations */}
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">Associações Gravitacionais (#Tags)</label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {activePlanet.associations.map((tag, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        #{tag}
                      </span>
                    ))}
                    {activePlanet.associations.length === 0 && (
                      <span className="text-[10px] text-slate-500">Digite #SuaTag no texto para associar</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>{activePlanet.updatedAt}</span>
                <button 
                  onClick={() => setIsInspectorOpen(false)}
                  className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center my-auto space-y-2 py-12">
              <Globe className="w-8 h-8 text-slate-600" />
              <h4 className="text-xs font-bold text-slate-400">Nenhum planeta selecionado</h4>
              <p className="text-[11px] text-slate-500">Clique em qualquer estrela ou planeta no mapa para inspecionar e editar.</p>
            </div>
          )}
        </div>

      </div>

      {/* Modal Add Star */}
      {showAddStarModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sun className="w-5 h-5 text-amber-400" /> Criar Nova Estrela Mestre
            </h3>
            <form onSubmit={handleAddStar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Estrela</label>
                <input 
                  type="text"
                  required
                  value={newStarName}
                  onChange={(e) => setNewStarName(e.target.value)}
                  placeholder="Ex: Estrela de Engenharia"
                  className="w-full bg-space-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Cor do Brilho Cósmico</label>
                <select
                  value={newStarColor}
                  onChange={(e) => setNewStarColor(e.target.value as any)}
                  className="w-full bg-space-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="gold">Dourado Solar (Vitalidade)</option>
                  <option value="purple">Roxo Névoa (Conhecimento)</option>
                  <option value="cyan">Cyan Cósmico (Projetos)</option>
                  <option value="emerald">Esmeralda (Finanças)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddStarModal(false)}
                  className="text-xs px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold shadow-lg shadow-amber-500/20"
                >
                  Criar Estrela
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Add Planet */}
      {showAddPlanetModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel max-w-md w-full p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-purple-400" /> Lançar Novo Planeta de Nota
            </h3>
            <form onSubmit={handleAddPlanet} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Título do Planeta</label>
                <input 
                  type="text"
                  required
                  value={newPlanetTitle}
                  onChange={(e) => setNewPlanetTitle(e.target.value)}
                  placeholder="Ex: Resumo de Algoritmos"
                  className="w-full bg-space-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Orbitar Estrela Mestre</label>
                <select
                  value={newPlanetStarId}
                  onChange={(e) => setNewPlanetStarId(e.target.value)}
                  className="w-full bg-space-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  {stars.map(s => (
                    <option key={s.id} value={s.id}>★ {s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddPlanetModal(false)}
                  className="text-xs px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="text-xs px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/20"
                >
                  Lançar Planeta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
