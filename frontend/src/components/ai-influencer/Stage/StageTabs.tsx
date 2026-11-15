import type { LucideIcon } from "lucide-react";
import type { StageView } from "@/types/ai-influencer";
import styles from "./main.module.css";

export type StageTab = { id: StageView; label: string; icon: LucideIcon; count?: number };

type StageTabsProps = {
  tabs: readonly StageTab[];
  active: StageView;
  onSelect: (view: StageView) => void;
};

export function StageTabs({ tabs, active, onSelect }: StageTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label="Stage views">
      {tabs.map(({ id, label, icon: Icon, count }) => (
        <button
          key={id}
          type="button"
          role="tab"
          id={`stage-tab-${id}`}
          aria-selected={active === id}
          aria-controls="stage-panel"
          onClick={() => onSelect(id)}
        >
          <Icon size={15} aria-hidden="true" />
          {label}
          {count ? <span>{count}</span> : null}
        </button>
      ))}
    </div>
  );
}
