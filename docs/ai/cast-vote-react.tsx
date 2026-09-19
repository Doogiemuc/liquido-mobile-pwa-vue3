import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, ImageIcon, X } from "lucide-react";

export const Route = createFileRoute("/vote")({
  head: () => ({
    meta: [
      { title: "Stimme abgeben — Bürgerpark Westend" },
      {
        name: "description",
        content:
          "Sortiere die Vorschläge in deiner bevorzugten Reihenfolge und gib deine Stimme ab.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VotePage,
});

type Proposal = {
  id: string;
  title: string;
  author: string;
};

const PROPOSALS: Proposal[] = [
  { id: "p1", title: "Neuer Kinderspielplatz", author: "Stadtplanung Team A" },
  { id: "p2", title: "Erhalt der Parkbänke", author: "Inge Meier" },
  { id: "p3", title: "Zusätzliche Beleuchtung", author: "Initiative Lichtblick" },
  { id: "p4", title: "Blühwiesen statt Rasen", author: "BUND Ortsgruppe" },
  { id: "p5", title: "Trinkbrunnen am Eingang", author: "Familien e.V." },
];

const POOL_ID = "pool";

function VotePage() {
  // ballot: ordered array of proposal ids by rank (index 0 = rank 1)
  const [ballot, setBallot] = useState<string[]>([PROPOSALS[0].id]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overSlotIndex, setOverSlotIndex] = useState<number | null>(null);

  const byId = useMemo(
    () => Object.fromEntries(PROPOSALS.map((p) => [p.id, p])),
    [],
  );
  const pool = PROPOSALS.filter((p) => !ballot.includes(p.id));
  const totalSlots = PROPOSALS.length;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 8 },
    }),
  );

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragOver(e: { over: { id: string | number } | null }) {
    const overId = e.over?.id != null ? String(e.over.id) : null;
    if (overId && overId.startsWith("slot-")) {
      setOverSlotIndex(Number(overId.slice(5)));
    } else {
      setOverSlotIndex(null);
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const activeIdStr = String(e.active.id);
    const overIdRaw = e.over?.id;
    setActiveId(null);
    setOverSlotIndex(null);
    if (overIdRaw == null) return;
    const overId = String(overIdRaw);

    const wasInBallot = ballot.includes(activeIdStr);

    if (overId === POOL_ID) {
      // removed from ballot
      if (wasInBallot) setBallot((b) => b.filter((id) => id !== activeIdStr));
      return;
    }

    if (overId.startsWith("slot-")) {
      const targetIndex = Number(overId.slice(5));
      setBallot((b) => {
        const next = b.filter((id) => id !== activeIdStr);
        const insertAt = Math.min(targetIndex, next.length);
        next.splice(insertAt, 0, activeIdStr);
        return next;
      });
      return;
    }

    // reorder within ballot: over is another ballot item id
    if (wasInBallot && ballot.includes(overId)) {
      const from = ballot.indexOf(activeIdStr);
      const to = ballot.indexOf(overId);
      setBallot((b) => arrayMove(b, from, to));
    } else if (!wasInBallot && ballot.includes(overId)) {
      // dropped a pool item on a filled ballot row -> insert before that row
      const to = ballot.indexOf(overId);
      setBallot((b) => {
        const next = [...b];
        next.splice(to, 0, activeIdStr);
        return next;
      });
    }
  }

  const filled = ballot.length;

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveId(null);
          setOverSlotIndex(null);
        }}
      >
        {/* Poll header */}
        <header className="pt-8 pb-6 px-6">
          <div className="max-w-[420px] mx-auto">
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-navy-soft text-[11px] font-semibold tracking-wider text-navy uppercase">
                <span className="size-1.5 rounded-full bg-navy animate-pulse" />
                Wahl läuft
              </span>
            </div>
            <div className="bg-card ring-1 ring-black/5 rounded-2xl p-6 mb-2">
              <h1 className="font-serif text-2xl text-navy leading-tight text-balance mb-4 font-semibold">
                Gestaltung des Bürgerparks Westend
              </h1>
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>124 Stimmen abgegeben</span>
                  <span>endet in 4 Tagen</span>
                </div>
                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-navy w-1/3 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Ballot */}
        <section className="px-6 mb-10">
          <div className="max-w-[420px] mx-auto">
            <div className="text-center mb-6">
              <h2 className="font-serif text-xl text-navy font-medium">
                Dein Stimmzettel
              </h2>
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                Ziehe Vorschläge in die Slots. Slot 1 ist dein Favorit.
              </p>
            </div>

            <BallotStrip
              ballot={ballot}
              byId={byId}
              totalSlots={totalSlots}
              overSlotIndex={overSlotIndex}
              activeId={activeId}
              onRemove={(id) =>
                setBallot((b) => b.filter((x) => x !== id))
              }
            />
          </div>
        </section>

        {/* Pool */}
        <section className="px-6">
          <div className="max-w-[420px] mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-px flex-1 bg-border" />
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] whitespace-nowrap text-muted-foreground">
                Verfügbare Vorschläge
              </h3>
              <div className="h-px flex-1 bg-border" />
            </div>

            <Pool proposals={pool} activeId={activeId} />

            {pool.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-6">
                Alle Vorschläge sind auf deinem Stimmzettel.
              </div>
            )}
          </div>
        </section>

        <DragOverlay dropAnimation={null}>
          {activeId ? <ProposalCardVisual proposal={byId[activeId]} dragging /> : null}
        </DragOverlay>

        {/* Sticky action bar */}
        <div className="fixed bottom-0 inset-x-0 p-4 bg-background/85 backdrop-blur-md border-t border-border">
          <div className="max-w-[420px] mx-auto flex flex-col gap-3">
            <div className="flex justify-center">
              <p className="text-[11px] font-medium text-muted-foreground">
                <span className="text-navy font-bold">{filled}</span> von{" "}
                <span className="text-foreground font-bold">{totalSlots}</span>{" "}
                Slots belegt
              </p>
            </div>
            <button
              type="button"
              disabled={filled === 0}
              className="w-full bg-navy text-primary-foreground text-sm font-semibold py-3.5 rounded-xl ring-2 ring-navy/10 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none shadow-lg shadow-navy/20"
            >
              <Check className="size-4" strokeWidth={2.5} />
              Stimme abschicken
            </button>
          </div>
        </div>
      </DndContext>
    </div>
  );
}

/* ---------- Ballot ---------- */

function BallotStrip({
  ballot,
  byId,
  totalSlots,
  overSlotIndex,
  activeId,
  onRemove,
}: {
  ballot: string[];
  byId: Record<string, Proposal>;
  totalSlots: number;
  overSlotIndex: number | null;
  activeId: string | null;
  onRemove: (id: string) => void;
}) {
  // Build rows: one row per rank slot up to totalSlots
  const rows = Array.from({ length: totalSlots }, (_, i) => ({
    rank: i + 1,
    proposalId: ballot[i] ?? null,
  }));

  return (
    <div className="relative bg-muted/40 ring-1 ring-black/5 rounded-xl overflow-hidden">
      <div className="h-2 w-full receipt-edge opacity-30" />
      <SortableContext
        items={ballot}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-4 space-y-3">
          {rows.map((row, idx) => {
            if (row.proposalId) {
              return (
                <FilledSlot
                  key={row.proposalId}
                  rank={row.rank}
                  proposal={byId[row.proposalId]}
                  onRemove={() => onRemove(row.proposalId!)}
                  hidden={activeId === row.proposalId}
                />
              );
            }
            const isActiveDrop = overSlotIndex === idx && activeId !== null;
            return (
              <EmptySlot
                key={`slot-${idx}`}
                rank={row.rank}
                index={idx}
                active={isActiveDrop}
              />
            );
          })}
        </div>
      </SortableContext>
      <div className="h-2 w-full receipt-edge opacity-30 rotate-180" />
    </div>
  );
}

function EmptySlot({
  rank,
  index,
  active,
}: {
  rank: number;
  index: number;
  active: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `slot-${index}` });
  const showActive = active || isOver;
  return (
    <div
      ref={setNodeRef}
      className={
        "h-16 rounded-lg flex items-center gap-3 px-4 transition-all " +
        (showActive
          ? "border-2 border-dashed border-navy/50 bg-slot-active scale-[1.01]"
          : rank === 1
            ? "border-2 border-dashed border-navy/25 bg-slot-active/50"
            : "border border-dashed border-border bg-slot-empty/60")
      }
    >
      <div
        className={
          "size-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold transition-colors " +
          (showActive
            ? "bg-navy text-primary-foreground"
            : "bg-muted text-muted-foreground ring-1 ring-border")
        }
      >
        {rank}
      </div>
      <div className="flex-1 min-w-0">
        <div
          className={
            "text-[10px] font-bold uppercase tracking-widest " +
            (showActive ? "text-navy" : "text-muted-foreground/70")
          }
        >
          Slot {rank}
        </div>
        <div
          className={
            "text-sm italic " +
            (showActive ? "text-navy/80 font-medium" : "text-muted-foreground/60")
          }
        >
          {showActive ? "Hier loslassen" : "leer — hierher ziehen"}
        </div>
      </div>
    </div>
  );
}

function FilledSlot({
  rank,
  proposal,
  onRemove,
  hidden,
}: {
  rank: number;
  proposal: Proposal;
  onRemove: () => void;
  hidden: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: proposal.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: hidden || isDragging ? 0.35 : 1,
  } as const;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div
        {...attributes}
        {...listeners}
        aria-label={`Rang ${rank}: ${proposal.title}. Ziehen zum Umsortieren.`}
        className="flex items-center gap-3 bg-card p-3 rounded-lg ring-1 ring-black/5 shadow-sm cursor-grab active:cursor-grabbing touch-none"
      >
        <div className="size-8 shrink-0 flex items-center justify-center rounded-full bg-navy text-primary-foreground text-xs font-bold">
          {rank}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {proposal.title}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            von {proposal.author}
          </p>
        </div>
        <div className="text-muted-foreground/40">
          <GripVertical className="size-4" />
        </div>
        <button
          type="button"
          onClick={onRemove}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Aus Stimmzettel entfernen"
          className="p-2 -mr-1 text-muted-foreground hover:text-destructive transition-colors"
        >
          <X className="size-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}

/* ---------- Pool ---------- */

function Pool({
  proposals,
  activeId,
}: {
  proposals: Proposal[];
  activeId: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL_ID });
  return (
    <div
      ref={setNodeRef}
      className={
        "space-y-3 rounded-xl transition-colors " +
        (isOver ? "ring-2 ring-dashed ring-navy/30 bg-slot-active p-2" : "")
      }
    >
      {proposals.map((p) => (
        <PoolCard key={p.id} proposal={p} hidden={activeId === p.id} />
      ))}
    </div>
  );
}

function PoolCard({ proposal, hidden }: { proposal: Proposal; hidden: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: proposal.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: hidden || isDragging ? 0.35 : 1,
  } as const;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="touch-none cursor-grab active:cursor-grabbing"
    >
      <ProposalCardVisual proposal={proposal} />
    </div>
  );
}

function ProposalCardVisual({
  proposal,
  dragging = false,
}: {
  proposal: Proposal;
  dragging?: boolean;
}) {
  return (
    <div
      className={
        "bg-card p-4 rounded-xl ring-1 ring-black/5 flex items-center gap-4 " +
        (dragging ? "shadow-2xl shadow-navy/30 rotate-1 scale-[1.02]" : "shadow-sm")
      }
    >
      <div className="size-10 shrink-0 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
        <ImageIcon className="size-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-foreground truncate">
          {proposal.title}
        </h4>
        <p className="text-xs text-muted-foreground truncate">
          von {proposal.author}
        </p>
      </div>
      <div className="p-1 text-muted-foreground/50">
        <GripVertical className="size-4" />
      </div>
    </div>
  );
}

