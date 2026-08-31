'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  applyNodeChanges,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { Palette, Search, User, Waypoints } from 'lucide-react';
import type { MindmapEdge, MindmapNode } from '@/lib/types';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';
import { ArtistModal } from '@/components/artists/ArtistModal';

const NODE_STYLE: Record<MindmapNode['type'], { icon: typeof User; color: string; ring: string; bg: string }> = {
  artist: { icon: User, color: '#0fb5a8', ring: 'rgba(15,181,168,0.4)', bg: 'rgba(15,181,168,0.08)' },
  artwork: { icon: Palette, color: '#ef3f3f', ring: 'rgba(239,63,63,0.35)', bg: 'rgba(255,107,74,0.08)' },
};

function MindmapNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as { label: string; type: MindmapNode['type']; imageUrl?: string | null; dimmed: boolean };
  const { icon: Icon, color, ring, bg } = NODE_STYLE[nodeData.type];
  return (
    <div
      className="flex max-w-[220px] items-center gap-2 rounded-xl border bg-white px-2.5 py-2 shadow-md shadow-black/[0.06] transition-opacity duration-200"
      style={{ borderColor: ring, opacity: nodeData.dimmed ? 0.2 : 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 6, height: 6 }} />
      {nodeData.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={nodeData.imageUrl} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" style={{ boxShadow: `0 0 0 1.5px ${ring}` }} />
      ) : (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md" style={{ background: bg }}>
          <Icon className="h-3.5 w-3.5" style={{ color }} strokeWidth={2.25} />
        </span>
      )}
      <span className="truncate text-[12px] font-medium text-[#2a231c]">{nodeData.label}</span>
      <Handle type="source" position={Position.Right} style={{ background: color, border: 'none', width: 6, height: 6 }} />
    </div>
  );
}

const nodeTypes = { mindmap: MindmapNodeCard };

const NODE_W = 220;
const NODE_H = 40;

function layout(nodes: MindmapNode[], edges: MindmapEdge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', nodesep: 28, ranksep: 120 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  edges.forEach((e) => {
    if (g.hasNode(e.source) && g.hasNode(e.target)) g.setEdge(e.source, e.target);
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    return {
      id: n.id,
      type: 'mindmap',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: { label: n.label, type: n.type, imageUrl: n.imageUrl, dimmed: false },
    };
  });
}

type ActiveNode = { type: MindmapNode['type']; id: string };

export function ArtMindmapView() {
  const [rawNodes, setRawNodes] = useState<MindmapNode[]>([]);
  const [rawEdges, setRawEdges] = useState<MindmapEdge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const [positionedNodes, setPositionedNodes] = useState<Node[]>([]);

  async function refetchMindmap() {
    const res = await fetch('/api/mindmap');
    if (res.ok) {
      const data = await res.json();
      setRawNodes(data.nodes ?? []);
      setRawEdges(data.edges ?? []);
    }
  }

  useEffect(() => {
    refetchMindmap().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    setPositionedNodes(layout(rawNodes, rawEdges));
  }, [rawNodes, rawEdges]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setPositionedNodes((nds) => applyNodeChanges(changes, nds));
  }, []);

  const nodes = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return positionedNodes;
    return positionedNodes.map((n) => {
      const original = rawNodes.find((r) => r.id === n.id);
      const matches = original?.label.toLowerCase().includes(term) ?? false;
      return { ...n, data: { ...n.data, dimmed: !matches } };
    });
  }, [positionedNodes, rawNodes, search]);

  const edges: Edge[] = useMemo(
    () =>
      rawEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.label,
        labelStyle: { fill: '#8a8074', fontSize: 10 },
        labelBgStyle: { fill: '#fdfaf4' },
        style: { stroke: 'rgba(42,35,28,0.18)', strokeWidth: 1.5 },
      })),
    [rawEdges]
  );

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    const sep = node.id.indexOf(':');
    const type = node.id.slice(0, sep) as MindmapNode['type'];
    const rawId = node.id.slice(sep + 1);
    setActiveNode({ type, id: rawId });
  };

  function closePanel() {
    setActiveNode(null);
  }

  if (loading) {
    return <p className="p-6 text-sm text-[#8a8074]">불러오는 중...</p>;
  }

  const isEmpty = rawNodes.length === 0;

  return (
    <div className="relative flex-1">
      <div className="absolute left-3 right-3 top-3 z-10 sm:left-4 sm:right-auto sm:top-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#a39a8d]" strokeWidth={2.25} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="작가, 작품 검색"
            className="w-full rounded-xl border border-black/[0.08] bg-surface/95 py-2 pl-9 pr-3 text-[13px] text-[#2a231c] shadow-lg shadow-black/[0.06] outline-none backdrop-blur-md transition-colors placeholder:text-[#a39a8d] focus:border-accent/50 focus:ring-2 focus:ring-accent/20 sm:w-64"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(NODE_STYLE) as MindmapNode['type'][]).map((type) => {
            const { icon: Icon, color } = NODE_STYLE[type];
            const labelMap: Record<MindmapNode['type'], string> = { artist: '화가', artwork: '작품' };
            return (
              <span
                key={type}
                className="flex items-center gap-1 rounded-full border border-black/[0.06] bg-surface/80 px-2 py-1 text-[11px] font-medium text-[#6b6258] backdrop-blur-sm"
              >
                <Icon className="h-3 w-3" style={{ color }} strokeWidth={2.25} />
                {labelMap[type]}
              </span>
            );
          })}
        </div>
      </div>

      {isEmpty && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-center">
          <Waypoints className="h-8 w-8 text-[#c9beae]" strokeWidth={1.5} />
          <p className="text-sm text-[#8a8074]">아직 연결된 데이터가 없습니다.</p>
        </div>
      )}

      <div className="absolute inset-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={handleNodeClick}
          colorMode="light"
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background color="rgba(42,35,28,0.08)" gap={28} size={1.5} />
          <Controls showInteractive={false} />
          <MiniMap
            pannable
            zoomable
            maskColor="rgba(253,250,244,0.75)"
            nodeColor={(n) => NODE_STYLE[(n.data as { type: MindmapNode['type'] }).type]?.color ?? '#999'}
          />
        </ReactFlow>
      </div>

      {activeNode?.type === 'artist' && (
        <ArtistModal
          artistId={activeNode.id}
          onClose={closePanel}
          onSaved={refetchMindmap}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
          onOpenArtwork={(artworkId) => setActiveNode({ type: 'artwork', id: artworkId })}
        />
      )}

      {activeNode?.type === 'artwork' && (
        <ArtworkModal
          artworkId={activeNode.id}
          onClose={closePanel}
          onSaved={refetchMindmap}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
        />
      )}
    </div>
  );
}
