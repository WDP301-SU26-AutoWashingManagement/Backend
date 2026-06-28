/**
 * src/common/utils/performance.tracker.ts
 *
 * Utility class để track và analyze performance metrics
 * Có thể sử dụng trong production để monitor query performance
 */

export interface PerformanceMetrics {
  operation: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
  percentile95: number;
  percentile99: number;
  stdDeviation: number;
  throughput: number; // ops/sec
}

export class PerformanceTracker {
  private measurements: Map<string, number[]> = new Map();
  private startTimes: Map<string, number> = new Map();

  /**
   * Start timing a specific operation
   */
  start(operationId: string): void {
    this.startTimes.set(operationId, performance.now());
  }

  /**
   * End timing and record measurement
   */
  end(operationId: string, operationName: string): number {
    const startTime = this.startTimes.get(operationId);
    if (!startTime) {
      throw new Error(`No start time found for operation: ${operationId}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }

    this.measurements.get(operationName)!.push(duration);
    this.startTimes.delete(operationId);

    return duration;
  }

  /**
   * Record measurement directly (for manual timing)
   */
  record(operationName: string, duration: number): void {
    if (!this.measurements.has(operationName)) {
      this.measurements.set(operationName, []);
    }
    this.measurements.get(operationName)!.push(duration);
  }

  /**
   * Calculate statistics for an operation
   */
  getMetrics(operationName: string): PerformanceMetrics | null {
    const times = this.measurements.get(operationName);
    if (!times || times.length === 0) {
      return null;
    }

    const sorted = [...times].sort((a, b) => a - b);
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / times.length;
    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    const total = sum;
    const iterations = times.length;

    // Calculate percentiles
    const percentile95 = sorted[Math.floor(times.length * 0.95)];
    const percentile99 = sorted[Math.floor(times.length * 0.99)];

    // Calculate standard deviation
    const variance = times.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / times.length;
    const stdDeviation = Math.sqrt(variance);

    // Calculate throughput (operations per second)
    const totalSeconds = total / 1000;
    const throughput = totalSeconds > 0 ? iterations / totalSeconds : 0;

    return {
      operation: operationName,
      avgTime: avg,
      minTime: min,
      maxTime: max,
      totalTime: total,
      iterations,
      percentile95,
      percentile99,
      stdDeviation,
      throughput,
    };
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    const metrics: PerformanceMetrics[] = [];

    for (const operation of this.measurements.keys()) {
      const metric = this.getMetrics(operation);
      if (metric) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Reset tracker
   */
  reset(operationName?: string): void {
    if (operationName) {
      this.measurements.delete(operationName);
      // Also delete any pending start times for this operation
      for (const [key, val] of this.startTimes.entries()) {
        if (key.includes(operationName)) {
          this.startTimes.delete(key);
        }
      }
    } else {
      this.measurements.clear();
      this.startTimes.clear();
    }
  }

  /**
   * Print formatted report
   */
  printReport(operationNames?: string[]): void {
    const operations = operationNames || Array.from(this.measurements.keys());

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📊 PERFORMANCE METRICS REPORT');
    console.log('═══════════════════════════════════════════════════════════\n');

    for (const operation of operations) {
      const metrics = this.getMetrics(operation);
      if (!metrics) continue;

      console.log(`Operation: ${metrics.operation}`);
      console.log(`  Iterations:   ${metrics.iterations}`);
      console.log(`  Average Time: ${metrics.avgTime.toFixed(2)}ms`);
      console.log(`  Min Time:     ${metrics.minTime.toFixed(2)}ms`);
      console.log(`  Max Time:     ${metrics.maxTime.toFixed(2)}ms`);
      console.log(`  Total Time:   ${metrics.totalTime.toFixed(2)}ms`);
      console.log(`  P95:          ${metrics.percentile95.toFixed(2)}ms`);
      console.log(`  P99:          ${metrics.percentile99.toFixed(2)}ms`);
      console.log(`  Std Dev:      ${metrics.stdDeviation.toFixed(2)}ms`);
      console.log(`  Throughput:   ${metrics.throughput.toFixed(2)} ops/sec`);
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Export metrics as JSON
   */
  toJSON(): Record<string, PerformanceMetrics> {
    const result: Record<string, PerformanceMetrics> = {};

    for (const operation of this.measurements.keys()) {
      const metrics = this.getMetrics(operation);
      if (metrics) {
        result[operation] = metrics;
      }
    }

    return result;
  }

  /**
   * Compare two operations
   */
  compare(op1: string, op2: string): void {
    const metrics1 = this.getMetrics(op1);
    const metrics2 = this.getMetrics(op2);

    if (!metrics1 || !metrics2) {
      console.log('❌ One or both operations not found');
      return;
    }

    const diff = metrics2.avgTime - metrics1.avgTime;
    const diffPercent = (diff / metrics1.avgTime) * 100;

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log(`📊 COMPARISON: ${op1} vs ${op2}`);
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`${op1.padEnd(30)} ${metrics1.avgTime.toFixed(2)}ms`);
    console.log(`${op2.padEnd(30)} ${metrics2.avgTime.toFixed(2)}ms`);
    console.log('');
    console.log(`Difference: ${Math.abs(diff).toFixed(2)}ms (${Math.abs(diffPercent).toFixed(1)}%)`);

    if (diff > 0) {
      console.log(`👉 ${op2} is ${Math.abs(diffPercent).toFixed(1)}% slower`);
    } else {
      console.log(`👉 ${op2} is ${Math.abs(diffPercent).toFixed(1)}% faster`);
    }

    console.log('═══════════════════════════════════════════════════════════\n');
  }

  /**
   * Check if operation meets SLA
   */
  checkSLA(operationName: string, maxTimeMs: number): boolean {
    const metrics = this.getMetrics(operationName);
    if (!metrics) return false;

    return metrics.avgTime <= maxTimeMs;
  }

  /**
   * Get violations of SLA
   */
  getSLAViolations(operationName: string, maxTimeMs: number): number {
    const times = this.measurements.get(operationName);
    if (!times) return 0;

    return times.filter((t) => t > maxTimeMs).length;
  }
}

// ─── Singleton instance ────────────────────────────────────────────────────

let instance: PerformanceTracker | null = null;

export function getPerformanceTracker(): PerformanceTracker {
  if (!instance) {
    instance = new PerformanceTracker();
  }
  return instance;
}

// ─── Decorator for automatic tracking ──────────────────────────────────────

export function TrackPerformance(operationName?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    const tracker = getPerformanceTracker();
    const name = operationName || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const operationId = `${name}_${Date.now()}_${Math.random()}`;
      tracker.start(operationId);

      try {
        const result = await originalMethod.apply(this, args);
        tracker.end(operationId, name);
        return result;
      } catch (error) {
        tracker.end(operationId, `${name}_error`);
        throw error;
      }
    };

    return descriptor;
  };
}
