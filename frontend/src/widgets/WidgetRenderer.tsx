import type { ComponentType } from "react";
import { widgetRegistry } from "@/widgets/registry";
import type { WidgetConfig, WidgetPropsMap, WidgetType } from "@/widgets/types";

type WidgetRendererProps = {
  widgets: readonly WidgetConfig[];
};

/**
 * Renders a page's widget list in order. Unknown types (e.g. from a CMS that's
 * ahead of this build) are skipped with a warning instead of breaking the page.
 */
export function WidgetRenderer({ widgets }: WidgetRendererProps) {
  return widgets.map((widget) => {
    const type: string = widget.type;
    if (!Object.hasOwn(widgetRegistry, type)) {
      console.warn(`[WidgetRenderer] Unknown widget type "${type}" (id "${widget.id}"), skipping.`);
      return null;
    }

    // The config union guarantees `props` matches `type`; TypeScript can't follow that through the lookup.
    const Component = widgetRegistry[widget.type] as ComponentType<WidgetPropsMap[WidgetType]>;
    return <Component key={widget.id} {...widget.props} />;
  });
}
