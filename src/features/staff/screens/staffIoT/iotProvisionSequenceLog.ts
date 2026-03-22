/**
 * Log trình tự luồng provision IoT (Metro / adb logcat).
 * Prefix cố định để lọc: adb logcat | findstr IOT_PROV_SEQ
 */
const TAG = "[IOT_PROV_SEQ]";

export type IotProvisionKind = "controller" | "node";

export function iotProvSeqLog(
  kind: IotProvisionKind,
  step: number,
  total: number,
  message: string,
  detail?: Record<string, unknown>
): void {
  const head = `${TAG} [${kind}] (${step}/${total}) ${message}`;
  if (detail && Object.keys(detail).length > 0) {
    console.log(head, detail);
  } else {
    console.log(head);
  }
}

export function iotProvSeqFail(
  kind: IotProvisionKind,
  step: number,
  total: number,
  phase: string,
  err: unknown
): void {
  const msg = err instanceof Error ? err.message : String(err);
  const stepLabel = step > 0 ? String(step) : "pre";
  console.log(`${TAG} [${kind}] FAIL tại (${stepLabel}/${total}) phase=${phase}`, { message: msg });
}
