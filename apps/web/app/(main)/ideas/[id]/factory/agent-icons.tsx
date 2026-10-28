"use client";

import type { IconType } from "@astryxdesign/core/Icon";
import {
  BanknotesIcon,
  BuildingLibraryIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClipboardDocumentCheckIcon,
  CurrencyDollarIcon,
  GiftIcon,
  HandRaisedIcon,
  HeartIcon,
  LightBulbIcon,
  MapIcon,
  MegaphoneIcon,
  PaintBrushIcon,
  PresentationChartLineIcon,
  PuzzlePieceIcon,
  ScaleIcon,
} from "@heroicons/react/24/outline";
import type { AgentIconName } from "@/lib/idea-factory/agents";

export const AGENT_ICONS: Record<AgentIconName, IconType> = {
  coach: LightBulbIcon,
  market: ChartBarIcon,
  creative: PaintBrushIcon,
  legal: ScaleIcon,
  finance: BanknotesIcon,
  execution: MapIcon,
  acquisition: MegaphoneIcon,
  pricing: CurrencyDollarIcon,
  sales: HandRaisedIcon,
  investor: PresentationChartLineIcon,
  fit: PuzzlePieceIcon,
  impact: HeartIcon,
  grants: GiftIcon,
  donors: HeartIcon,
  governance: BuildingLibraryIcon,
  evaluation: ClipboardDocumentCheckIcon,
};

export { ChartPieIcon as EvaluateIcon };
