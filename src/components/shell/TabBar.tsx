"use client";

import { isFeatureAvailable } from "@/config/features";
import { TABS, type TabId } from "@/components/navigation/tabs";
import Button from "@/components/ui/Button";

const SHOW_DEV_TAB = isFeatureAvailable("admin_tools");

interface Props {
  activeTab: TabId;
  setActiveTab: (t: TabId) => void;
}

/**
 * Desktop horizontal tab bar under the header. Settings lives behind the
 * header gear, so it is not repeated here. Hidden on mobile by `.tab-bar`
 * in globals.css where <MobileNav> owns navigation.
 */
export default function TabBar({ activeTab, setActiveTab }: Props) {
  const tabs = TABS.filter((t) => t.id !== "settings" && (SHOW_DEV_TAB || t.id !== "dev"));

  return (
    <nav className="tab-bar" aria-label="Primary">
      {tabs.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <Button
            key={t.id}
            variant="ghost"
            size="sm"
            active={isActive}
            className="tab-bar__tab"
            data-tutorial-tab={t.id}
            aria-current={isActive ? "page" : undefined}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
          </Button>
        );
      })}
    </nav>
  );
}
