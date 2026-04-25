// SSR-safe wrapper — Leaflet requires a DOM environment, so the inner map
// component is loaded client-only via dynamic import.
import dynamic from "next/dynamic";
import type { RouteResponse } from "@/lib/types";

const FleetMapInner = dynamic(() => import("./FleetMapInner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 text-sm">
      Loading map…
    </div>
  ),
});

interface Props {
  routes: RouteResponse[];
}

export default function FleetMap({ routes }: Props) {
  return <FleetMapInner routes={routes} />;
}
