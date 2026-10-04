import os from 'os';

export interface HealthCheckStatus {
  totalRamGb: string;
  freeRamGb: string;
  usedRamPercent: number;
  cpuCount: number;
  anomalyDetected: boolean;
  warningMessage?: string;
}

export function checkSystemWatchdog(): HealthCheckStatus {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const usedPercent = Math.round((usedMem / totalMem) * 100);

  const anomalyDetected = usedPercent > 90;
  const warningMessage = anomalyDetected
    ? `⚠️ System RAM anomaly detected: ${usedPercent}% memory utilized (${(usedMem / 1024 / 1024 / 1024).toFixed(1)}GB / ${(totalMem / 1024 / 1024 / 1024).toFixed(1)}GB).`
    : undefined;

  return {
    totalRamGb: (totalMem / 1024 / 1024 / 1024).toFixed(1),
    freeRamGb: (freeMem / 1024 / 1024 / 1024).toFixed(1),
    usedRamPercent: usedPercent,
    cpuCount: os.cpus().length,
    anomalyDetected,
    warningMessage,
  };
}
