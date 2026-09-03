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
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type NodeMouseHandler,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { Link2, Loader2, Palette, Search, TriangleAlert, User, UserRound, Waypoints, X } from 'lucide-react';
import type { MindmapEdge, MindmapNode, RelationshipType } from '@/lib/types';
import { RELATIONSHIP_TYPES } from '@/lib/types';
import { useToast } from '@/components/ui/Toast';
import { normalizeForMatch } from '@/lib/search';
import { ArtworkModal } from '@/components/artworks/ArtworkModal';
import { ArtworkDetailModal } from '@/components/artworks/ArtworkDetailModal';
import { ArtistModal } from '@/components/artists/ArtistModal';
import { ArtistDetailModal } from '@/components/artists/ArtistDetailModal';
import { PersonDetailModal } from '@/components/artists/PersonDetailModal';
import { RemoteThumbnail } from '@/components/ui/RemoteThumbnail';

const NODE_STYLE: Record<MindmapNode['type'], { icon: typeof User; color: string; ring: string; bg: string }> = {
  artist: { icon: User, color: '#0fb5a8', ring: 'rgba(15,181,168,0.4)', bg: 'rgba(15,181,168,0.08)' },
  artwork: { icon: Palette, color: '#ef3f3f', ring: 'rgba(239,63,63,0.35)', bg: 'rgba(255,107,74,0.08)' },
  person: { icon: UserRound, color: '#ffb300', ring: 'rgba(255,179,0,0.4)', bg: 'rgba(255,179,0,0.1)' },
};

function MindmapNodeCard({ data }: NodeProps) {
  const nodeData = data as unknown as { label: string; type: MindmapNode['type']; imageUrl?: string | null; dimmed: boolean };
  const { icon: Icon, color, ring, bg } = NODE_STYLE[nodeData.type];
  return (
    <div
      className="flex max-w-[220px] items-center gap-2 rounded-xl border bg-white px-2.5 py-2 shadow-md shadow-black/[0.06] transition duration-200"
      style={{ borderColor: ring, opacity: nodeData.dimmed ? 0.2 : 1 }}
    >
      <Handle type="target" position={Position.Left} style={{ background: color, border: 'none', width: 6, height: 6 }} />
      {nodeData.imageUrl ? (
        <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-md" style={{ boxShadow: `0 0 0 1.5px ${ring}` }}>
          <RemoteThumbnail src={nodeData.imageUrl} alt="" sizes="24px" className="object-cover" />
        </div>
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

interface PendingConnection {
  artistId: string;
  artistLabel: string;
  otherType: 'artist' | 'person';
  otherId: string;
  otherLabel: string;
}

export function ArtMindmapView() {
  const { showToast } = useToast();
  const [rawNodes, setRawNodes] = useState<MindmapNode[]>([]);
  const [rawEdges, setRawEdges] = useState<MindmapEdge[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeNode, setActiveNode] = useState<ActiveNode | null>(null);
  const [editNode, setEditNode] = useState<ActiveNode | null>(null);
  const [positionedNodes, setPositionedNodes] = useState<Node[]>([]);

  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);
  const [connType, setConnType] = useState<RelationshipType>('기타');
  const [connTypeCustom, setConnTypeCustom] = useState('');
  const [connDescription, setConnDescription] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState<string | null>(null);

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
    const term = normalizeForMatch(search);
    if (!term) return positionedNodes;
    return positionedNodes.map((n) => {
      const original = rawNodes.find((r) => r.id === n.id);
      const matches = normalizeForMatch(original?.label ?? '').includes(term);
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

  // 맵에서 노드끼리 드래그로 직접 연결하면 작가-작가 또는 작가-인물 관계를 새로 만듭니다.
  // 작품 노드는 소속 작가로 자동 연결되므로 대상에서 제외하고, 인물끼리는 아직 지원하지 않습니다.
  const handleConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target || params.source === params.target) return;
      const [sourceType, sourceId] = params.source.split(':') as [MindmapNode['type'], string];
      const [targetType, targetId] = params.target.split(':') as [MindmapNode['type'], string];

      if (sourceType === 'artwork' || targetType === 'artwork') {
        showToast('작품 노드는 관계로 연결할 수 없어요.');
        return;
      }
      if (sourceType === 'person' && targetType === 'person') {
        showToast('인물끼리는 아직 연결할 수 없어요.');
        return;
      }

      const artistId = sourceType === 'artist' ? sourceId : targetId;
      const otherType = sourceType === 'artist' ? targetType : sourceType;
      const otherId = sourceType === 'artist' ? targetId : sourceId;
      const findLabel = (nodeId: string) => rawNodes.find((n) => n.id === nodeId)?.label ?? '';

      setConnType('기타');
      setConnTypeCustom('');
      setConnDescription('');
      setConnError(null);
      setPendingConnection({
        artistId,
        artistLabel: findLabel(`artist:${artistId}`),
        otherType: otherType as 'artist' | 'person',
        otherId,
        otherLabel: findLabel(`${otherType}:${otherId}`),
      });
    },
    [rawNodes, showToast]
  );

  async function handleConfirmConnection() {
    if (!pendingConnection) return;
    setConnecting(true);
    setConnError(null);
    const effectiveType = connType === '기타' && connTypeCustom.trim() ? connTypeCustom.trim() : connType;
    try {
      const res = await fetch('/api/relationships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_artist_id: pendingConnection.artistId,
          target_artist_id: pendingConnection.otherType === 'artist' ? pendingConnection.otherId : null,
          target_person_id: pendingConnection.otherType === 'person' ? pendingConnection.otherId : null,
          relationship_type: effectiveType,
          description: connDescription,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? '관계 연결에 실패했습니다.');
      }
      showToast('연결되었습니다');
      setPendingConnection(null);
      await refetchMindmap();
    } catch (e) {
      setConnError((e as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  function closePanel() {
    setActiveNode(null);
  }

  function closeEditPanel() {
    setEditNode(null);
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
            className="w-full rounded-xl border border-black/[0.08] bg-surface/95 py-2 pl-9 pr-3 text-[13px] text-[#2a231c] shadow-lg shadow-black/[0.06] outline-none backdrop-blur-md transition placeholder:text-[#a39a8d] focus:border-accent/50 focus:ring-2 focus:ring-accent/20 sm:w-64"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(Object.keys(NODE_STYLE) as MindmapNode['type'][]).map((type) => {
            const { icon: Icon, color } = NODE_STYLE[type];
            const labelMap: Record<MindmapNode['type'], string> = { artist: '화가', artwork: '작품', person: '인물' };
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
        <p className="mt-2 hidden max-w-64 text-[11px] leading-relaxed text-[#8a8074] sm:block">
          노드 옆 점을 드래그해 다른 화가·인물에 놓으면 관계가 만들어져요.
        </p>
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
          onConnect={handleConnect}
          connectionLineStyle={{ stroke: '#0fb5a8', strokeWidth: 2 }}
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
        <ArtistDetailModal
          artistId={activeNode.id}
          onClose={closePanel}
          onEdit={() => {
            setEditNode(activeNode);
            closePanel();
          }}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
          onOpenArtwork={(artworkId) => setActiveNode({ type: 'artwork', id: artworkId })}
        />
      )}

      {activeNode?.type === 'person' && (
        <PersonDetailModal
          personId={activeNode.id}
          onClose={closePanel}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
          onOpenArtist={(artistId) => setActiveNode({ type: 'artist', id: artistId })}
        />
      )}

      {activeNode?.type === 'artwork' && (
        <ArtworkDetailModal
          artworkId={activeNode.id}
          onClose={closePanel}
          onEdit={() => {
            setEditNode(activeNode);
            closePanel();
          }}
          onDeleted={() => {
            refetchMindmap();
            closePanel();
          }}
        />
      )}

      {editNode?.type === 'artist' && (
        <ArtistModal
          artistId={editNode.id}
          onClose={closeEditPanel}
          onSaved={refetchMindmap}
          onDeleted={() => {
            refetchMindmap();
            closeEditPanel();
          }}
          onOpenArtwork={(artworkId) => setActiveNode({ type: 'artwork', id: artworkId })}
        />
      )}

      {editNode?.type === 'artwork' && (
        <ArtworkModal
          artworkId={editNode.id}
          onClose={closeEditPanel}
          onSaved={refetchMindmap}
          onDeleted={() => {
            refetchMindmap();
            closeEditPanel();
          }}
        />
      )}

      {pendingConnection && (
        <div
          className="modal-backdrop fixed inset-0 z-[3500] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setPendingConnection(null)}
        >
          <div
            className="modal-panel w-full max-w-sm rounded-2xl border border-black/[0.08] bg-surface p-5 shadow-2xl shadow-black/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-1.5 text-[14px] font-semibold text-[#2a231c]">
                <Link2 className="h-4 w-4 text-teal" strokeWidth={2.25} />
                관계 연결
              </h3>
              <button
                onClick={() => setPendingConnection(null)}
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[#6b6258] transition hover:bg-black/[0.05] active:scale-[0.97]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.25} />
              </button>
            </div>

            <p className="mb-3 truncate text-[12.5px] text-[#6b6258]">
              <span className="font-medium text-[#2a231c]">{pendingConnection.artistLabel}</span>
              {' → '}
              <span className="font-medium text-[#2a231c]">{pendingConnection.otherLabel}</span>
            </p>

            <label className="mb-1.5 block text-[13px] font-medium text-[#4a4038]">관계 유형</label>
            <select
              value={connType}
              onChange={(e) => setConnType(e.target.value as RelationshipType)}
              className="mb-3 w-full appearance-none rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            >
              {RELATIONSHIP_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            {connType === '기타' && (
              <input
                value={connTypeCustom}
                onChange={(e) => setConnTypeCustom(e.target.value)}
                placeholder="관계 직접 입력 (예: 동업자)"
                className="mb-3 w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
              />
            )}

            <label className="mb-1.5 block text-[13px] font-medium text-[#4a4038]">관계 설명 (선택)</label>
            <input
              value={connDescription}
              onChange={(e) => setConnDescription(e.target.value)}
              className="mb-3 w-full rounded-xl border border-black/[0.08] bg-black/[0.02] px-3.5 py-2.5 text-sm text-[#2a231c] placeholder:text-[#a39a8d] outline-none transition focus:border-accent/50 focus:ring-2 focus:ring-accent/20"
            />

            {connError && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-[13px] text-red-600">
                <TriangleAlert className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} />
                {connError}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPendingConnection(null)}
                className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2 text-sm font-medium text-[#4a4038] transition hover:bg-black/[0.03] active:scale-[0.97]"
              >
                취소
              </button>
              <button
                onClick={handleConfirmConnection}
                disabled={connecting}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-accent-strong px-4 py-2 text-sm font-medium text-white shadow-lg shadow-accent/25 transition hover:opacity-90 disabled:opacity-50 active:scale-[0.97]"
              >
                {connecting ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.25} /> : <Link2 className="h-3.5 w-3.5" strokeWidth={2.25} />}
                연결
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
