"use client";

import { useMemo, useRef, useState, type PointerEvent, type TouchEvent, type TouchList as ReactTouchList } from "react";
import { useRouter } from "next/navigation";
import type { Person, Relationship } from "@/lib/types";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2.5;
// Below this pointer travel (px), a pointerup is treated as a click rather
// than the end of a drag — otherwise every tap-to-select would be swallowed.
const DRAG_CLICK_THRESHOLD = 6;

function touchDistance(touches: ReactTouchList): number {
  const [a, b] = [touches[0], touches[1]];
  return Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
}

interface Node {
  person: Person;
  x: number;
  y: number;
  width: number;
}

const MIN_NODE_WIDTH = 176;
const MAX_NODE_WIDTH = 300;
const AVATAR_RADIUS = 17;
const AVATAR_LEFT_PADDING = 10;
const AVATAR_TEXT_GAP = 10;
const TEXT_RIGHT_MARGIN = 12;
// Everything in a card's width besides the name text itself: left padding
// to the avatar, the avatar's own diameter, the gap to the text, and a
// right margin — used both to size each card to its name (below) and to
// place the avatar/text within it (see the render loop, where these are
// recomputed per node since width is no longer a shared constant).
const NODE_NON_TEXT_WIDTH =
  AVATAR_LEFT_PADDING + AVATAR_RADIUS * 2 + AVATAR_TEXT_GAP + TEXT_RIGHT_MARGIN;
// Rough average glyph width for the 12px bold name text — no canvas
// measurement available at layout time, just enough to size the card to
// the name instead of a one-size-fits-all box. Names in this app's actual
// content (Wolof/Arabic honorifics — "Cheikh Mouhamadou Lamine Bara
// Mbacké") run much longer than a fixed 176px card ever fit.
const CHAR_WIDTH_ESTIMATE = 6.8;
const NODE_GAP = 16;
const NODE_HEIGHT = 68;
const GENERATION_HEIGHT = 150;

function estimateNodeWidth(person: Person): number {
  const nameLength = `${person.first_name} ${person.last_name}`.length;
  const needed = NODE_NON_TEXT_WIDTH + nameLength * CHAR_WIDTH_ESTIMATE;
  return Math.min(MAX_NODE_WIDTH, Math.max(MIN_NODE_WIDTH, needed));
}

/**
 * Depth of each person from the nearest root (someone in this set with no
 * parent), via Kahn's algorithm over the `parent_of` edges — a child's depth
 * is one more than the deepest of its known parents, so multi-parent people
 * (both parents present in this tree) land below both instead of overlapping.
 */
function computeDepths(people: Person[], relationships: Relationship[]): Map<number, number> {
  const childrenOf = new Map<number, number[]>();
  const parentsOf = new Map<number, number[]>();
  for (const person of people) {
    childrenOf.set(person.id, []);
    parentsOf.set(person.id, []);
  }
  for (const rel of relationships) {
    if (rel.type !== "parent_of") continue;
    if (!childrenOf.has(rel.person_id) || !parentsOf.has(rel.related_person_id)) continue;
    childrenOf.get(rel.person_id)!.push(rel.related_person_id);
    parentsOf.get(rel.related_person_id)!.push(rel.person_id);
  }

  const depth = new Map<number, number>();
  const remainingParents = new Map<number, number>();
  for (const person of people) {
    remainingParents.set(person.id, parentsOf.get(person.id)!.length);
  }

  const queue: number[] = people
    .filter((p) => remainingParents.get(p.id) === 0)
    .map((p) => p.id);
  for (const id of queue) depth.set(id, 0);

  let i = 0;
  while (i < queue.length) {
    const id = queue[i++];
    const d = depth.get(id)!;
    for (const childId of childrenOf.get(id) ?? []) {
      depth.set(childId, Math.max(depth.get(childId) ?? 0, d + 1));
      const remaining = (remainingParents.get(childId) ?? 0) - 1;
      remainingParents.set(childId, remaining);
      if (remaining === 0) queue.push(childId);
    }
  }

  // Anyone never reached (e.g. only spouse links, no parent_of edges at all).
  for (const person of people) {
    if (!depth.has(person.id)) depth.set(person.id, 0);
  }

  return depth;
}

function computeLayout(people: Person[], relationships: Relationship[]): Map<number, Node> {
  // Exclude spouse stubs from the tree canvas.
  // A stub is the *target* (related_person_id) of a spouse_of edge that was
  // never recorded as a child (related_person_id) in any parent_of edge.
  // The seeder always puts the main person as person_id and the stub as
  // related_person_id in spouse_of. Main root people (the patriarch) are
  // person_id in spouse_of, never related_person_id, so they're kept.
  const spouseTargetIds = new Set<number>();
  const childIds = new Set<number>();
  for (const rel of relationships) {
    if (rel.type === "spouse_of") spouseTargetIds.add(rel.related_person_id);
    if (rel.type === "parent_of") childIds.add(rel.related_person_id);
  }
  const treePeople = people.filter(
    (p) => !spouseTargetIds.has(p.id) || childIds.has(p.id)
  );

  const depths = computeDepths(treePeople, relationships);
  const generations = new Map<number, Person[]>();
  for (const person of treePeople) {
    const d = depths.get(person.id) ?? 0;
    if (!generations.has(d)) generations.set(d, []);
    generations.get(d)!.push(person);
  }

  const layout = new Map<number, Node>();
  for (const [depth, generationPeople] of generations) {
    const widths = generationPeople.map(estimateNodeWidth);
    const totalWidth =
      widths.reduce((sum, w) => sum + w, 0) + NODE_GAP * (widths.length - 1);
    let cursor = -totalWidth / 2;
    generationPeople.forEach((person, index) => {
      const width = widths[index];
      layout.set(person.id, {
        person,
        x: cursor + width / 2,
        y: depth * GENERATION_HEIGHT,
        width,
      });
      cursor += width + NODE_GAP;
    });
  }
  return layout;
}

export function FamilyTreeView({
  people,
  relationships,
  onSelectPerson,
}: {
  people: Person[];
  relationships: Relationship[];
  /**
   * Called instead of navigating to the public `/people/{id}` profile.
   * Needed by authed contexts (`/trees/[slug]`) since a private person has
   * no public profile to link to — that route 404s for anyone but public
   * people. Falls back to real navigation when omitted.
   */
  onSelectPerson?: (person: Person) => void;
}) {
  const router = useRouter();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  const drag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startPan: { x: number; y: number };
  } | null>(null);
  // Set on pointerdown, read by the node's click handler (which fires after
  // pointerup, once `drag` has already been cleared) to tell a drag from a tap.
  const dragMoved = useRef(false);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const layout = useMemo(() => computeLayout(people, relationships), [people, relationships]);
  const nodes = useMemo(() => Array.from(layout.values()), [layout]);

  const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));

  const handlePointerDown = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && e.isPrimary === false) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    dragMoved.current = false;
    drag.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPan: pan,
    };
  };

  const handlePointerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current || drag.current.pointerId !== e.pointerId) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.hypot(dx, dy) > DRAG_CLICK_THRESHOLD) dragMoved.current = true;
    setPan({ x: drag.current.startPan.x + dx, y: drag.current.startPan.y + dy });
  };

  const endDrag = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null;
  };

  const handleTouchStart = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2) {
      pinch.current = { distance: touchDistance(e.touches), zoom };
    }
  };

  const handleTouchMove = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const distance = touchDistance(e.touches);
      const scale = distance / pinch.current.distance;
      setZoom(clampZoom(pinch.current.zoom * scale));
    }
  };

  const handleTouchEnd = (e: TouchEvent<SVGSVGElement>) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  const handleNodeClick = (person: Person) => {
    if (dragMoved.current) return;
    if (onSelectPerson) onSelectPerson(person);
    else router.push(`/people/${person.id}`);
  };

  const minX = Math.min(0, ...nodes.map((n) => n.x - n.width));
  const maxX = Math.max(0, ...nodes.map((n) => n.x + n.width));
  const maxY = Math.max(0, ...nodes.map((n) => n.y)) + GENERATION_HEIGHT;
  // Content-proportional instead of a fixed height — a fixed height with a
  // viewBox that grows with generation count leaves the difference
  // letterboxed (empty bands top/bottom) once there are enough generations
  // that the two heights stop lining up.
  const svgHeight = Math.max(320, Math.min(640, maxY + 80));

  if (people.length === 0) {
    return (
      <p className="p-4 font-mono text-xs text-muted-foreground">
        Aucune personne à afficher.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted sm:px-2 sm:py-1"
          onClick={() => setZoom((z) => clampZoom(z / 1.2))}
        >
          −
        </button>
        <button
          type="button"
          className="border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted sm:px-2 sm:py-1"
          onClick={() => {
            setZoom(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          Reset
        </button>
        <button
          type="button"
          className="border border-border px-3 py-2 font-mono text-xs text-muted-foreground hover:bg-muted sm:px-2 sm:py-1"
          onClick={() => setZoom((z) => clampZoom(z * 1.2))}
        >
          +
        </button>
      </div>

      <div className="w-full overflow-hidden border border-border bg-card" style={{ touchAction: "none" }}>
        <svg
          width="100%"
          height={svgHeight}
          viewBox={`${minX - 40} ${-40} ${maxX - minX + 80} ${maxY + 40}`}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "50% 0",
            cursor: "grab",
            touchAction: "none",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {relationships
            .filter((rel) => rel.type === "parent_of")
            .map((rel) => {
              const parent = layout.get(rel.person_id);
              const child = layout.get(rel.related_person_id);
              if (!parent || !child) return null;
              const midY = parent.y + NODE_HEIGHT / 2 + (child.y - parent.y - NODE_HEIGHT) / 2;
              return (
                <g key={rel.id} stroke="var(--border)" strokeWidth={2} fill="none">
                  <line x1={parent.x} y1={parent.y + NODE_HEIGHT / 2} x2={parent.x} y2={midY} />
                  <line x1={parent.x} y1={midY} x2={child.x} y2={midY} />
                  <line x1={child.x} y1={midY} x2={child.x} y2={child.y - NODE_HEIGHT / 2} />
                </g>
              );
            })}

          {nodes.map(({ person, x, y, width }) => {
            const initial = person.first_name.charAt(0).toUpperCase();
            const birthY = person.birth_date?.slice(0, 4) ?? null;
            const deathY = person.death_date?.slice(0, 4) ?? null;
            const subtitle = birthY ? `${birthY} – ${deathY ?? ""}` : null;
            const clipId = `avatar-clip-${person.id}`;
            const textClipId = `text-clip-${person.id}`;
            // Positions relative to this card's own (variable) width, since
            // cards are sized to their name — see estimateNodeWidth().
            const avatarCx = -width / 2 + AVATAR_LEFT_PADDING + AVATAR_RADIUS;
            const textX = avatarCx + AVATAR_RADIUS + AVATAR_TEXT_GAP;
            const textClipWidth = width / 2 - textX - TEXT_RIGHT_MARGIN / 2;

            return (
              <g
                key={person.id}
                transform={`translate(${x}, ${y})`}
                className="cursor-pointer"
                onClick={() => handleNodeClick(person)}
              >
                <rect
                  x={-width / 2}
                  y={-NODE_HEIGHT / 2}
                  width={width}
                  height={NODE_HEIGHT}
                  rx={10}
                  fill="var(--card)"
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                />

                {person.photo_url ? (
                  <>
                    <clipPath id={clipId}>
                      <circle cx={avatarCx} cy={0} r={AVATAR_RADIUS} />
                    </clipPath>
                    <image
                      href={person.photo_url}
                      x={avatarCx - AVATAR_RADIUS}
                      y={-AVATAR_RADIUS}
                      width={AVATAR_RADIUS * 2}
                      height={AVATAR_RADIUS * 2}
                      clipPath={`url(#${clipId})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </>
                ) : (
                  <>
                    <circle
                      cx={avatarCx}
                      cy={0}
                      r={AVATAR_RADIUS}
                      fill="var(--accent)"
                      fillOpacity={0.15}
                    />
                    <text
                      x={avatarCx}
                      y={0}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={13}
                      fontWeight={600}
                      fill="var(--accent)"
                    >
                      {initial}
                    </text>
                  </>
                )}

                <clipPath id={textClipId}>
                  <rect x={textX} y={-NODE_HEIGHT / 2} width={textClipWidth} height={NODE_HEIGHT} />
                </clipPath>
                <text
                  x={textX}
                  y={subtitle ? -6 : 0}
                  dominantBaseline="central"
                  fontSize={12}
                  fontWeight={600}
                  fill="var(--foreground)"
                  clipPath={`url(#${textClipId})`}
                >
                  {person.first_name} {person.last_name}
                </text>
                {subtitle && (
                  <text
                    x={textX}
                    y={10}
                    dominantBaseline="central"
                    fontSize={9.5}
                    fontFamily="var(--font-mono)"
                    fill="var(--muted-foreground)"
                    clipPath={`url(#${textClipId})`}
                  >
                    {subtitle}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
