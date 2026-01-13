"use client";

/**
 * This component ensures that all batch operation resume handlers are registered globally.
 * It should be placed in the root layout so that resume functionality works from any page.
 *
 * Without this, if you start a staff delete operation and then navigate to the products page,
 * clicking "Resume" on the staff operation won't work because the staff handler isn't registered.
 */

import { useStaffBatch } from "@/hooks/use-staff-batch";
import { useProductBatch } from "@/hooks/use-product-batch";

export function GlobalBatchHandlers() {
  // These hooks register their resume handlers when mounted
  // By using them here in the layout, handlers are always available
  useStaffBatch();
  useProductBatch();

  // This component doesn't render anything
  return null;
}
