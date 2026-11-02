import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { getCloudAvailability, getCloudRates } from "@/lib/cloud/config";
import {
  cloudImagePriceMicros,
  cloudModelPrices,
  cloudTranscriptionHourMicros,
  microsToDollars,
} from "@/lib/cloud/pricing";
import { PricingOverview } from "./pricing-overview";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "WeStride is free when you bring your own Meta AI account and compute. WeStride Cloud runs Meta models and sandboxes for you, pay as you go.",
};

export default async function PricingPage() {
  const { userId } = await auth();
  const rates = getCloudRates();
  const availability = getCloudAvailability();
  return (
    <PricingOverview
      isSignedIn={userId !== null}
      cloudOffered={availability.ai || availability.compute}
      rates={rates}
      models={cloudModelPrices(rates)}
      imagePrice={microsToDollars(cloudImagePriceMicros(rates))}
      transcriptionHourPrice={microsToDollars(cloudTranscriptionHourMicros(rates))}
    />
  );
}
