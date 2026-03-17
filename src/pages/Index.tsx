import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

// --- Типы ---
type NodeStatus = "online" | "warning" | "offline";
type NodeType = "server" | "router" | "switch" | "firewall" | "workstation" | "wifi";

interface NetworkNode {
  id: string;
  label: string;
  type: NodeType;
  status: NodeStatus;
  ip: string;
  load: number;
  x: number;
  y: number;
  connections: string[];
}

interface Incident {
  id: string;
  time: string;
  node: string;
  message: string;
  severity: "critical" | "warning" | "info";
  resolved: boolean;
}

// --- Данные ---
const INITIAL_NODES: NetworkNode[] = [
  { id: "fw1", label: "Firewall", type: "firewall", status: "online", ip: "192.168.1.1", load: 32, x: 50, y: 50, connections: ["rt1"] },
  { id: "rt1", label: "Маршрутизатор", type: "router", status: "online", ip: "192.168.1.2", load: 45, x: 50, y: 170, connections: ["sw1", "sw2"] },
  { id: "sw1", label: "Коммутатор 1", type: "switch", status: "online", ip: "192.168.1.10", load: 28, x: 160, y: 270, connections: ["srv1", "srv2", "ws1"] },
  { id: "sw2", label: "Коммутатор 2", type: "switch", status: "warning", ip: "192.168.1.11", load: 87, x: -60, y: 270, connections: ["wifi1", "ws2"] },
  { id: "srv1", label: "Сервер БД", type: "server", status: "online", ip: "192.168.1.100", load: 61, x: 280, y: 380, connections: [] },
  { id: "srv2", label: "Веб-сервер", type: "server", status: "offline", ip: "192.168.1.101", load: 0, x: 160, y: 390, connections: [] },
  { id: "ws1", label: "Рабочие места", type: "workstation", status: "online", ip: "192.168.1.50-60", load: 34, x: 60, y: 390, connections: [] },
  { id: "wifi1", label: "Wi-Fi AP", type: "wifi", status: "warning", ip: "192.168.1.20", load: 72, x: -160, y: 380, connections: ["ws2"] },
  { id: "ws2", label: "Ноутбуки", type: "workstation", status: "online", ip: "192.168.1.70-80", load: 21, x: -60, y: 390, connections: [] },
];

const INCIDENTS: Incident[] = [
  { id: "i1", time: "14:32", node: "Веб-сервер", message: "Сервер недоступен. Нет ответа на ping.", severity: "critical", resolved: false },
  { id: "i2", time: "14:18", node: "Коммутатор 2", message: "Загрузка CPU превышает 85%.", severity: "warning", resolved: false },
  { id: "i3", time: "14:05", node: "Wi-Fi AP", message: "Высокая нагрузка на точку доступа.", severity: "warning", resolved: false },
  { id: "i4", time: "13:47", node: "Сервер БД", message: "Восстановление после перезапуска.", severity: "info", resolved: true },
  { id: "i5", time: "12:30", node: "Firewall", message: "Обновление правил завершено успешно.", severity: "info", resolved: true },
];

// --- Утилиты ---
const statusColor: Record<NodeStatus, string> = {
  online: "hsl(142,70%,45%)",
  warning: "hsl(20,90%,55%)",
  offline: "hsl(350,90%,58%)",
};
const statusLabel: Record<NodeStatus, string> = {
  online: "В сети",
  warning: "Предупреждение",
  offline: "Недоступен",
};
const typeEmoji: Record<NodeType, string> = {
  server: "⚙",
  router: "⬡",
  switch: "⊞",
  firewall: "🛡",
  workstation: "▣",
  wifi: "◎",
};
const typeIconName: Record<NodeType, string> = {
  server: "Server",
  router: "Router",
  switch: "Network",
  firewall: "Shield",
  workstation: "Monitor",
  wifi: "Wifi",
};

function StatusDot({ status }: { status: NodeStatus }) {
  return (
    <span className="relative inline-flex items-center justify-center">
      <span
        className="block rounded-full"
        style={{ width: 8, height: 8, background: statusColor[status] }}
      />
      {status !== "online" && (
        <span
          className="absolute inset-0 rounded-full animate-ping-ring"
          style={{ background: statusColor[status], opacity: 0.5 }}
        />
      )}
    </span>
  );
}

// --- Карта (SVG) ---
function NetworkMap({ nodes, selected, onSelect }: {
  nodes: NetworkNode[];
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const CENTER_X = 230;
  const CENTER_Y = 40;

  const getNodeXY = (node: NetworkNode) => ({
    x: CENTER_X + node.x,
    y: CENTER_Y + node.y,
  });

  const lines: { x1: number; y1: number; x2: number; y2: number; status: NodeStatus }[] = [];
  nodes.forEach((node) => {
    node.connections.forEach((targetId) => {
      const target = nodes.find((n) => n.id === targetId);
      if (!target) return;
      const from = getNodeXY(node);
      const to = getNodeXY(target);
      const lineStatus: NodeStatus =
        node.status === "offline" || target.status === "offline"
          ? "offline"
          : node.status === "warning" || target.status === "warning"
          ? "warning"
          : "online";
      lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, status: lineStatus });
    });
  });

  return (
    <svg width="100%" viewBox="0 0 460 460" className="w-full" style={{ minHeight: 380 }}>
      <defs>
        <filter id="glow-green"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-orange"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-red"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="glow-cyan"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>

      {/* Линии соединений */}
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
          stroke={statusColor[line.status]}
          strokeWidth={line.status === "offline" ? 1 : 1.5}
          strokeDasharray={line.status === "offline" ? "6 4" : undefined}
          opacity={line.status === "offline" ? 0.25 : 0.4}
        />
      ))}

      {/* Узлы */}
      {nodes.map((node) => {
        const { x, y } = getNodeXY(node);
        const isSelected = selected === node.id;
        const color = statusColor[node.status];
        const r = node.type === "server" || node.type === "firewall" || node.type === "router" ? 22 : 18;
        const glowId = node.status === "offline" ? "glow-red" : node.status === "warning" ? "glow-orange" : "glow-green";

        return (
          <g key={node.id} className="cursor-pointer" onClick={() => onSelect(node.id)}>
            {/* Пульс при сбое */}
            {node.status !== "online" && (
              <circle cx={x} cy={y} r={r + 8} fill={color} opacity="0">
                <animate attributeName="r" values={`${r + 6};${r + 18};${r + 6}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.1;0;0.1" dur="2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Ореол выбранного */}
            {isSelected && (
              <circle cx={x} cy={y} r={r + 10} fill="none" stroke="hsl(350,85%,55%)" strokeWidth="1.5" opacity="0.5">
                <animate attributeName="r" values={`${r + 8};${r + 15};${r + 8}`} dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.5;0.15;0.5" dur="1.5s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Основной круг */}
            <circle
              cx={x} cy={y} r={r}
              fill={isSelected ? "hsla(350,85%,55%,0.12)" : "hsla(0,12%,8%,0.95)"}
              stroke={isSelected ? "hsl(350,85%,55%)" : color}
              strokeWidth={isSelected ? 2.5 : 1.5}
              filter={`url(#${glowId})`}
            />

            {/* Иконка */}
            <text
              x={x} y={y + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fill={isSelected ? "hsl(350,85%,55%)" : color}
              fontFamily="sans-serif"
            >
              {typeEmoji[node.type]}
            </text>

            {/* Статус-точка */}
            <circle cx={x + r - 4} cy={y - r + 4} r={4} fill={color} />

            {/* Подпись */}
            <text
              x={x} y={y + r + 13}
              textAnchor="middle"
              fontSize="9.5"
              fill={isSelected ? "hsl(350,85%,55%)" : "hsla(10,20%,85%,0.9)"}
              fontFamily="'Golos Text', sans-serif"
              fontWeight={isSelected ? "700" : "400"}
            >
              {node.label}
            </text>

            {/* % загрузки */}
            <text
              x={x} y={y + r + 24}
              textAnchor="middle"
              fontSize="8"
              fill={node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(142,70%,45%)"}
              fontFamily="'JetBrains Mono', monospace"
            >
              {node.status === "offline" ? "OFFLINE" : `${Math.round(node.load)}%`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// --- Карточка узла ---
function NodeDetail({ node, onClose }: { node: NetworkNode; onClose: () => void }) {
  const color = statusColor[node.status];
  return (
    <div className="glass-card rounded-xl p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
            style={{ background: `${color}18`, border: `1px solid ${color}40` }}
          >
            {typeEmoji[node.type]}
          </div>
          <div>
            <p className="font-oswald text-sm font-bold text-white">{node.label}</p>
            <p className="font-mono-jet text-[11px]" style={{ color }}>{node.ip}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors p-1">
          <Icon name="X" size={14} />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <StatusDot status={node.status} />
        <span className="text-xs font-semibold" style={{ color }}>{statusLabel[node.status]}</span>
      </div>

      {node.status !== "offline" && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Загрузка CPU</span>
            <span
              className="font-mono-jet font-semibold"
              style={{ color: node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(142,70%,45%)" }}
            >
              {Math.round(node.load)}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${node.load}%`,
                background: node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(350,85%,55%)",
                boxShadow: `0 0 8px ${node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(350,85%,55%)"}`,
              }}
            />
          </div>
        </div>
      )}

      {node.connections.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] text-muted-foreground mb-1">Соединения: {node.connections.length}</p>
        </div>
      )}
    </div>
  );
}

// --- Аналитика ---
function AnalyticsTab({ nodes }: { nodes: NetworkNode[] }) {
  const activeNodes = nodes.filter(n => n.status !== "offline");
  const avgLoad = activeNodes.length
    ? Math.round(activeNodes.reduce((s, n) => s + n.load, 0) / activeNodes.length)
    : 0;

  const bars = [
    { label: "Пн", value: 42 },
    { label: "Вт", value: 68 },
    { label: "Ср", value: 55 },
    { label: "Чт", value: 80 },
    { label: "Пт", value: 73 },
    { label: "Сб", value: 31 },
    { label: "Вс", value: 25 },
  ];

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: "В сети", value: nodes.filter(n => n.status === "online").length, color: "hsl(142,70%,45%)", icon: "CheckCircle2" },
          { label: "Предупр.", value: nodes.filter(n => n.status === "warning").length, color: "hsl(20,90%,55%)", icon: "AlertTriangle" },
          { label: "Недоступно", value: nodes.filter(n => n.status === "offline").length, color: "hsl(350,90%,58%)", icon: "XCircle" },
          { label: "Ср. нагрузка", value: `${avgLoad}%`, color: "hsl(350,85%,55%)", icon: "Activity" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name={item.icon} fallback="Circle" size={12} style={{ color: item.color }} />
              <span className="text-[10px] text-muted-foreground">{item.label}</span>
            </div>
            <p className="font-oswald text-2xl font-bold" style={{ color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-oswald font-semibold text-muted-foreground uppercase tracking-wider mb-4">Нагрузка за неделю</p>
        <div className="flex items-end gap-1.5 h-24">
          {bars.map((bar, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className="w-full rounded-t-sm relative overflow-hidden"
                style={{
                  height: `${bar.value}%`,
                  background: bar.value > 75
                    ? "linear-gradient(180deg, hsl(350,90%,58%) 0%, hsla(350,90%,58%,0.5) 100%)"
                    : bar.value > 60
                    ? "linear-gradient(180deg, hsl(340,80%,45%) 0%, hsla(340,80%,45%,0.5) 100%)"
                    : "linear-gradient(180deg, hsl(350,70%,40%) 0%, hsla(350,70%,40%,0.4) 100%)",
                  border: `1px solid ${bar.value > 75 ? "hsl(350,90%,58%)" : bar.value > 60 ? "hsl(340,80%,45%)" : "hsl(350,70%,40%)"}30`,
                  transition: `height 0.5s ease ${i * 60}ms`,
                }}
              >
                <div className="absolute top-0 inset-x-0 h-1" style={{ background: "rgba(255,255,255,0.15)" }} />
              </div>
              <span className="text-[9px] text-muted-foreground">{bar.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <p className="text-xs font-oswald font-semibold text-muted-foreground uppercase tracking-wider mb-3">Топ нагрузки</p>
        <div className="space-y-2.5">
          {[...nodes]
            .filter(n => n.status !== "offline")
            .sort((a, b) => b.load - a.load)
            .slice(0, 5)
            .map((node) => (
              <div key={node.id} className="flex items-center gap-2.5">
                <span className="text-xs text-foreground w-28 truncate">{node.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${node.load}%`,
                      background: node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(350,85%,55%)",
                      boxShadow: `0 0 6px ${node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(350,85%,55%)"}80`,
                    }}
                  />
                </div>
                <span
                  className="font-mono-jet text-[10px] w-8 text-right"
                  style={{ color: node.load > 80 ? "hsl(350,90%,58%)" : node.load > 60 ? "hsl(20,90%,55%)" : "hsl(142,70%,45%)" }}
                >
                  {Math.round(node.load)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// --- Инциденты ---
function IncidentsTab({ incidents }: { incidents: Incident[] }) {
  const sevColor = { critical: "hsl(350,90%,58%)", warning: "hsl(20,90%,55%)", info: "hsl(350,70%,50%)" };
  const sevLabel = { critical: "Критично", warning: "Предупреждение", info: "Инфо" };
  const sevIcon = { critical: "XCircle", warning: "AlertTriangle", info: "Info" };

  return (
    <div className="space-y-2.5 animate-fade-in">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-oswald font-semibold text-muted-foreground uppercase tracking-wider">Лента инцидентов</p>
        <span className="text-[10px] text-muted-foreground">{incidents.filter(i => !i.resolved).length} активных</span>
      </div>
      {incidents.map((inc, i) => (
        <div
          key={inc.id}
          className="glass-card rounded-xl p-3.5 transition-all animate-fade-in"
          style={{
            opacity: inc.resolved ? 0.45 : 1,
            borderColor: inc.resolved ? "transparent" : `${sevColor[inc.severity]}20`,
            animationDelay: `${i * 60}ms`,
          }}
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex-shrink-0" style={{ color: inc.resolved ? "hsl(215,20%,40%)" : sevColor[inc.severity] }}>
              <Icon name={sevIcon[inc.severity]} fallback="Circle" size={15} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold text-white truncate">{inc.node}</span>
                <span className="font-mono-jet text-[10px] text-muted-foreground flex-shrink-0">{inc.time}</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{inc.message}</p>
              <div className="mt-2">
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide"
                  style={{
                    background: `${inc.resolved ? "hsl(215,20%,40%)" : sevColor[inc.severity]}18`,
                    color: inc.resolved ? "hsl(215,20%,50%)" : sevColor[inc.severity],
                    border: `1px solid ${inc.resolved ? "hsl(215,20%,40%)" : sevColor[inc.severity]}30`,
                  }}
                >
                  {inc.resolved ? "✓ Решено" : sevLabel[inc.severity]}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Главная страница ---
export default function Index() {
  const [nodes, setNodes] = useState<NetworkNode[]>(INITIAL_NODES);
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"map" | "analytics" | "incidents">("map");
  const [incidents] = useState<Incident[]>(INCIDENTS);
  const [time, setTime] = useState(new Date());
  const [showNotif, setShowNotif] = useState(true);

  const selectedNode = nodes.find(n => n.id === selected);
  const criticalCount = incidents.filter(i => !i.resolved && i.severity === "critical").length;

  // Симуляция живой нагрузки
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
      setNodes(prev => prev.map(node => ({
        ...node,
        load: node.status === "offline"
          ? 0
          : Math.max(5, Math.min(96, node.load + (Math.random() - 0.48) * 7)),
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-screen bg-background grid-bg font-golos flex flex-col"
      style={{ maxWidth: 480, margin: "0 auto", position: "relative" }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{
          background: "hsla(0,15%,5%,0.94)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid hsla(350,60%,40%,0.18)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: "hsla(350,85%,55%,0.14)",
              border: "1px solid hsla(350,85%,55%,0.35)",
              boxShadow: "0 0 14px hsla(350,85%,55%,0.18)",
            }}
          >
            <Icon name="Network" fallback="Globe" size={16} style={{ color: "hsl(350,85%,55%)" }} />
          </div>
          <div>
            <p className="font-oswald text-sm font-bold text-white leading-none tracking-wide">АЙТАТ</p>
            <p className="text-[10px] text-muted-foreground leading-none mt-0.5">Сетевая инфраструктура</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "hsl(142,70%,45%)", boxShadow: "0 0 6px hsl(142,70%,45%)" }}
            >
              <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
            </span>
            <span className="font-mono-jet text-[10px] text-muted-foreground">
              {time.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <button className="relative p-1" onClick={() => setShowNotif(v => !v)}>
            <Icon name="Bell" fallback="Bell" size={17} className="text-muted-foreground hover:text-white transition-colors" />
            {criticalCount > 0 && (
              <span
                className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full text-[8px] font-bold flex items-center justify-center animate-alert-blink"
                style={{ background: "hsl(350,90%,55%)", color: "white" }}
              >
                {criticalCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Критическое уведомление */}
      {showNotif && criticalCount > 0 && (
        <div
          className="mx-4 mt-3 rounded-xl p-3 flex items-center gap-3 animate-fade-in"
          style={{
            background: "hsla(350,90%,55%,0.1)",
            border: "1px solid hsla(350,90%,55%,0.35)",
          }}
        >
          <Icon
            name="AlertCircle"
            fallback="AlertCircle"
            size={16}
            style={{ color: "hsl(350,90%,58%)" }}
            className="flex-shrink-0 animate-alert-blink"
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold" style={{ color: "hsl(350,90%,58%)" }}>Критический сбой!</p>
            <p className="text-[11px] text-muted-foreground truncate">Веб-сервер недоступен · 14:32</p>
          </div>
          <button onClick={() => setShowNotif(false)} className="text-muted-foreground hover:text-white p-0.5">
            <Icon name="X" size={13} />
          </button>
        </div>
      )}

      {/* Статус-бар */}
      <div className="mx-4 mt-3 grid grid-cols-3 gap-2">
        {[
          { label: "В сети", value: nodes.filter(n => n.status === "online").length, color: "hsl(142,70%,45%)" },
          { label: "Предупр.", value: nodes.filter(n => n.status === "warning").length, color: "hsl(20,90%,55%)" },
          { label: "Сбои", value: nodes.filter(n => n.status === "offline").length, color: "hsl(350,90%,58%)" },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-2.5 text-center">
            <p className="font-oswald text-2xl font-bold leading-none" style={{ color: s.color, textShadow: `0 0 12px ${s.color}60` }}>
              {s.value}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Навигация */}
      <div className="mx-4 mt-3 flex gap-1 p-1 rounded-xl" style={{ background: "hsla(0,10%,9%,0.85)" }}>
        {(["map", "analytics", "incidents"] as const).map((t) => {
          const tabs = {
            map: { label: "Карта", icon: "Map" },
            analytics: { label: "Аналитика", icon: "BarChart2" },
            incidents: { label: "Инциденты", icon: "AlertTriangle" },
          };
          const isActive = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
              style={
                isActive
                  ? {
                      background: "hsla(350,85%,55%,0.15)",
                      color: "hsl(350,85%,62%)",
                      border: "1px solid hsla(350,85%,55%,0.3)",
                      boxShadow: "0 0 12px hsla(350,85%,55%,0.14)",
                    }
                  : { color: "hsl(0,8%,50%)", border: "1px solid transparent" }
              }
            >
              <Icon name={tabs[t].icon} fallback="Circle" size={13} />
              {tabs[t].label}
              {t === "incidents" && criticalCount > 0 && (
                <span
                  className="w-4 h-4 rounded-full text-[8px] font-bold flex items-center justify-center"
                  style={{ background: "hsl(350,90%,55%)", color: "white" }}
                >
                  {criticalCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Контент */}
      <div className="flex-1 px-4 pt-3 pb-8 overflow-y-auto">
        {tab === "map" && (
          <div className="space-y-3 animate-fade-in">
            {/* SVG-карта */}
            <div
              className="glass-card rounded-2xl p-3 relative overflow-hidden"
              style={{ minHeight: 420 }}
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse at 50% 20%, hsla(350,85%,55%,0.07) 0%, transparent 60%)",
                }}
              />
              <div className="flex items-center justify-between mb-2 relative">
                <p className="text-[11px] font-oswald font-semibold text-muted-foreground uppercase tracking-wider">
                  Топология сети
                </p>
                <div className="flex items-center gap-3">
                  {(["online", "warning", "offline"] as NodeStatus[]).map(s => (
                    <div key={s} className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor[s] }} />
                      <span className="text-[9px] text-muted-foreground">{statusLabel[s]}</span>
                    </div>
                  ))}
                </div>
              </div>
              <NetworkMap
                nodes={nodes}
                selected={selected}
                onSelect={(id) => setSelected(id === selected ? null : id)}
              />
            </div>

            {/* Деталь выбранного */}
            {selectedNode && (
              <NodeDetail node={selectedNode} onClose={() => setSelected(null)} />
            )}

            {/* Список устройств */}
            <div className="glass-card rounded-2xl p-4">
              <p className="text-[11px] font-oswald font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Все устройства
              </p>
              <div className="space-y-1.5">
                {nodes.map((node) => (
                  <button
                    key={node.id}
                    onClick={() => setSelected(node.id === selected ? null : node.id)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left"
                    style={{
                      background: selected === node.id
                        ? "hsla(350,85%,55%,0.1)"
                        : "hsla(0,10%,10%,0.6)",
                      border: `1px solid ${selected === node.id ? "hsla(350,85%,55%,0.3)" : "transparent"}`,
                    }}
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-sm"
                      style={{
                        background: `${statusColor[node.status]}14`,
                        border: `1px solid ${statusColor[node.status]}30`,
                      }}
                    >
                      {typeEmoji[node.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{node.label}</p>
                      <p className="font-mono-jet text-[10px] text-muted-foreground">{node.ip}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {node.status !== "offline" && (
                        <span
                          className="font-mono-jet text-[10px]"
                          style={{
                            color: node.load > 80
                              ? "hsl(350,90%,58%)"
                              : node.load > 60
                              ? "hsl(20,90%,55%)"
                              : "hsl(142,70%,45%)",
                          }}
                        >
                          {Math.round(node.load)}%
                        </span>
                      )}
                      <StatusDot status={node.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "analytics" && <AnalyticsTab nodes={nodes} />}
        {tab === "incidents" && <IncidentsTab incidents={incidents} />}
      </div>
    </div>
  );
}