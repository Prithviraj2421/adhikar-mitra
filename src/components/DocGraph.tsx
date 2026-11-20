"use client";
import { Background, Controls, ReactFlow, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo, useState } from "react";
import { DOCUMENTS, schemeById } from "@/lib/data";
import { heldKeys, parseKey } from "@/lib/doc-graph/graph";
import type { DocPlan } from "@/lib/doc-graph/path";
import type { Member } from "@/lib/eligibility/types";
import type { HeldDocument } from "@/lib/doc-graph/types";
import { useT } from "@/lib/i18n";

/**
 * Unlock graph: documents on the left, schemes on the right.
 * Green = held, grey = missing, orange glow = recommended next document (and its prerequisites).
 * Clicking a node highlights every path through it. Colour is never the only signal: labels carry ✓ / ○ / ★.
 */
export default function DocGraph({
  plan, members, held, asOf,
}: { plan: DocPlan; members: Member[]; held: HeldDocument[]; asOf: string }) {
  const { l, t } = useT();
  const [selected, setSelected] = useState<string | null>(null);

  const { nodes, edges } = useMemo(() => {
    const heldSet = heldKeys(held, asOf);
    const recommended = new Set(plan.top?.obtain ?? []);
    const nameOf = (id: string | null) => (id ? members.find((m) => m.id === id)?.name.split(" ")[0] ?? "" : t("docs.family"));

    // Document slots: everything needed by a pending need, plus unmet prerequisites.
    const slotSet = new Set<string>();
    plan.needs.forEach((n) => n.required.forEach((k) => slotSet.add(k)));
    plan.ranked.forEach((r) => r.obtain.forEach((k) => slotSet.add(k)));
    const slots = [...slotSet].sort();
    const entries = plan.needs.filter((n) => n.missing.length > 0 || true);

    const edgesRaw: { from: string; to: string; kind: "need" | "prereq" }[] = [];
    entries.forEach((n) => n.required.forEach((k) => edgesRaw.push({ from: `d:${k}`, to: `s:${n.entryId}`, kind: "need" })));
    slots.forEach((k) => {
      const { documentTypeId, memberId } = parseKey(k);
      const d = DOCUMENTS.find((x) => x.id === documentTypeId)!;
      d.prerequisites.forEach((p) => {
        const pd = DOCUMENTS.find((x) => x.id === p)!;
        const pk = `${p}|${pd.scope === "household" ? "-" : memberId ?? "-"}`;
        if (slotSet.has(pk)) edgesRaw.push({ from: `d:${pk}`, to: `d:${k}`, kind: "prereq" });
      });
    });

    // Highlight set: the selected node plus everything connected to it.
    const hi = new Set<string>();
    if (selected) {
      // Walk upstream (what this needs) and downstream (what it unlocks) separately so a click
      // shows one readable path rather than the whole connected graph.
      const walk = (start: string, dir: "up" | "down") => {
        const stack = [start];
        while (stack.length) {
          const cur = stack.pop() as string;
          for (const e of edgesRaw) {
            const next = dir === "down" ? (e.from === cur ? e.to : null) : e.to === cur ? e.from : null;
            if (next && !hi.has(next)) {
              hi.add(next);
              stack.push(next);
            }
          }
        }
      };
      hi.add(selected);
      walk(selected, "up");
      walk(selected, "down");
    }

    const ns: Node[] = [
      ...slots.map((k, i): Node => {
        const { documentTypeId, memberId } = parseKey(k);
        const d = DOCUMENTS.find((x) => x.id === documentTypeId)!;
        const isHeld = heldSet.has(k);
        const rec = !isHeld && recommended.has(k);
        const dim = selected && !hi.has(`d:${k}`);
        return {
          id: `d:${k}`, position: { x: 0, y: i * 78 },
          data: { label: `${isHeld ? "✓" : rec ? "★" : "○"} ${l(d.name)} · ${nameOf(memberId)}` },
          className: rec ? "glow" : undefined,
          style: {
            width: 250, borderRadius: 14, fontSize: 13, padding: 8, opacity: dim ? 0.25 : 1,
            border: `2px solid ${isHeld ? "var(--success)" : rec ? "var(--accent)" : "var(--border)"}`,
            background: isHeld ? "var(--success-soft)" : rec ? "var(--accent-soft)" : "var(--card)", color: "var(--fg)",
          },
          sourcePosition: "right" as never, targetPosition: "left" as never,
        };
      }),
      ...entries.map((n, i): Node => {
        const s = schemeById(n.schemeId)!;
        const ready = n.missing.length === 0;
        const dim = selected && !hi.has(`s:${n.entryId}`);
        return {
          id: `s:${n.entryId}`, position: { x: 430, y: i * 78 },
          data: { label: `${ready ? "✓" : "○"} ${l(s.name)} · ${nameOf(n.memberId)}` },
          style: {
            width: 260, borderRadius: 14, fontSize: 13, padding: 8, opacity: dim ? 0.25 : 1,
            border: `2px solid ${ready ? "var(--success)" : "var(--primary)"}`, background: "var(--card)", color: "var(--fg)",
          },
          sourcePosition: "right" as never, targetPosition: "left" as never,
        };
      }),
    ];
    const es: Edge[] = edgesRaw.map((e, i) => {
      const active = selected ? hi.has(e.from) && hi.has(e.to) : false;
      const rec = e.kind === "need" && plan.top && recommended.has(e.from.slice(2)) && !heldSet.has(e.from.slice(2));
      return {
        id: `e${i}`, source: e.from, target: e.to, animated: !!(rec || active),
        className: rec || active ? "flow-edge-glow" : undefined,
        style: {
          stroke: rec ? "var(--accent)" : active ? "var(--primary)" : "var(--border)",
          strokeWidth: rec || active ? 3 : 1.5, strokeDasharray: e.kind === "prereq" ? "5 4" : undefined,
          opacity: selected && !active ? 0.15 : 1,
        },
      };
    });
    return { nodes: ns, edges: es };
  }, [plan, members, held, asOf, selected, l, t]);

  return (
    <div style={{ height: 520 }} className="overflow-hidden rounded-3xl border-2" data-testid="doc-graph" role="img" aria-label={t("docs.graphAria")}>
      <ReactFlow
        nodes={nodes} edges={edges} fitView minZoom={0.3} nodesDraggable={false}
        onNodeClick={(_, n) => setSelected((s) => (s === n.id ? null : n.id))}
        onPaneClick={() => setSelected(null)}
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
