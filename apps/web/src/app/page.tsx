import { Hero } from "@/components/hero/Hero";
import { Thesis } from "@/components/sections/Thesis";
import { LiveStrip } from "@/components/sections/LiveStrip";
import { History } from "@/components/sections/History";
import { Why } from "@/components/sections/Why";
import { Architecture } from "@/components/sections/Architecture";
import { Speed } from "@/components/sections/Speed";
import { Token } from "@/components/sections/Token";
import { Build } from "@/components/sections/Build";
import { UseCases } from "@/components/sections/UseCases";
import { RoadmapPreview } from "@/components/sections/RoadmapPreview";
import { FAQ } from "@/components/sections/FAQ";
import { readDeployments } from "@/lib/deployments";

export default function Home() {
  // devnet.json present at build time → show the Genesis Seats stat even before the RPC answers.
  const seatsVisible = readDeployments().present;
  return (
    <>
      <Hero />
      <Thesis />
      <LiveStrip seatsVisible={seatsVisible} />
      <History />
      <Why />
      <Architecture />
      <Speed />
      <Token />
      <Build />
      <UseCases />
      <RoadmapPreview />
      <FAQ />
    </>
  );
}
