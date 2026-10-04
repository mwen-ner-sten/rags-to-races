"use client";

import { useEffect, useRef } from "react";
import { TABS, type TabId } from "@/components/navigation/tabs";
import { Icon } from "@/components/icons/Icon";
import { isFeatureAvailable } from "@/config/features";

interface Props { activeTab: TabId; setActiveTab: (tab: TabId) => void; mobile: boolean; open: boolean; close: () => void; }

export default function Sidebar({ activeTab, setActiveTab, mobile, open, close }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!mobile || !node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; node.close(); };
  }, [mobile, open]);
  const content = <>
    <div className="sidebar-heading"><span className="ui-kicker">Your racing world</span>{mobile && <button className="sidebar-close" onClick={close} aria-label="Close navigation">×</button>}</div>
    <nav className="sidebar-links" aria-label="Primary">
      {TABS.filter(t => t.id !== "dev" || isFeatureAvailable("admin_tools")).map(t => <button
        key={t.id} className={`sidebar-link${t.placement === "overflow" ? " sidebar-link--secondary" : ""}`}
        aria-current={activeTab === t.id ? "page" : undefined} data-tutorial-tab={t.id}
        onClick={() => { setActiveTab(t.id); close(); }}>
        <Icon id={t.icon} size={20} /><span>{t.label}</span>
      </button>)}
    </nav>
    <div className="sidebar-foot">From scrap to starting grid.</div>
  </>;
  return mobile
    ? <dialog ref={dialog} id="game-navigation" className="game-sidebar game-sidebar--drawer" aria-label="Game navigation" onCancel={close} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX > rect.right || event.clientY > rect.bottom) close(); } }}>{content}</dialog>
    : <aside id="game-navigation" className="game-sidebar" aria-label="Game navigation">{content}</aside>;
}
