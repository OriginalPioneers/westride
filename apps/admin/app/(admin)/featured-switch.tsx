"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@astryxdesign/core/Switch";
import { setFeaturedAction, type FeaturedKind } from "./actions";

/** The Featured toggle in a table row. Applies at once; the row's state follows the server. */
export function FeaturedSwitch({
  kind,
  id,
  name,
  isFeatured,
}: {
  kind: FeaturedKind;
  id: string;
  name: string;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(isFeatured);
  const [error, setError] = useState<string | null>(null);

  return (
    <Switch
      label={`Feature ${name}`}
      isLabelHidden
      size="sm"
      value={value}
      changeAction={async (next) => {
        setError(null);
        setValue(next);
        const result = await setFeaturedAction({ kind, id, isFeatured: next });
        if (result.status === "error") {
          setValue(!next);
          setError(result.message);
          return;
        }
        router.refresh();
      }}
      status={error ? { type: "error", message: error } : undefined}
    />
  );
}
