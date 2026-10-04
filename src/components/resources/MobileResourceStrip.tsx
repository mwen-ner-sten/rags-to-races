"use client";

import { useId, useState } from "react";
import type { TabId } from "@/components/navigation/tabs";
import Button from "@/components/ui/Button";
import CurrencyBar from "@/components/currency/CurrencyBar";
import ResourceRow from "./ResourceRow";
import { useResourceRates } from "./useResourceRates";
import { visibleRates } from "./selectRelevant";

interface Props {
  activeTab: TabId;
}

/**
 * Shared resource strip under the header. Collapsed: the three resources most
 * relevant to the active tab. Expanded: every visible resource as a full
 * resource row. Used on desktop and mobile.
 */
export default function MobileResourceStrip({ activeTab }: Props) {
  const [open, setOpen] = useState(false);
  const rates = useResourceRates();
  const panelId = useId();
  const all = visibleRates(rates);

  return (
    <section className="resource-strip" aria-label="Resources" data-testid="resource-strip">
      <div className="resource-strip__bar">
        <CurrencyBar activeTab={activeTab} rates={rates} limit={3} size="sm" />
        <Button
          variant="ghost"
          size="sm"
          className="resource-strip__toggle"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Hide all resources" : `Show all ${all.length} resources`}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" focusable="false" style={{ transform: open ? "rotate(180deg)" : undefined }}>
            <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Button>
      </div>
      <div id={panelId} className="resource-strip__list" hidden={!open}>
        {all.map((rate) => (
          <ResourceRow key={rate.id} rate={rate} compact />
        ))}
      </div>
    </section>
  );
}
