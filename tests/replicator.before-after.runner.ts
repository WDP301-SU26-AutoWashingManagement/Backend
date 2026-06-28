/**
 * replicator.before-after.runner.ts
 *
 * Standalone runner để so sánh hiệu năng TRƯỚC VÀ SAU khi vận dụng replicator
 * Đã tối ưu hóa cơ chế lặp xen kẽ (Interleaved Iterations) nhằm loại bỏ Cache Bias.
 *
 * Usage:
 * ts-node -r tsconfig-paths/register src/__tests__/replicator.before-after.runner.ts
 * npm run test:before-after
 */

import mongoose from 'mongoose';
import { env } from '../src/configs/env.config';

// ─── Types ────────────────────────────────────────────────────────────────

interface TestDoc extends mongoose.Document {
  name: string;
  email: string;
  age: number;
  city: string;
  salary: number;
  department: string;
  createdAt: Date;
}

interface TestResult {
  avgTime: number;
  minTime: number;
  maxTime: number;
  p95: number;
  throughput: number;
}

const testSchema = new mongoose.Schema<TestDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, default: 0 },
  city: { type: String, default: '' },
  salary: { type: Number, default: 0 },
  department: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// ─── Metrics Utility ───────────────────────────────────────────────────────

function analyzeResults(times: number[]): TestResult {
  const sorted = [...times].sort((a, b) => a - b);
  const total = times.reduce((a, b) => a + b, 0);
  const iters = times.length;
  
  return {
    avgTime: total / iters,
    minTime: sorted[0],
    maxTime: sorted[sorted.length - 1],
    p95: sorted[Math.floor(iters * 0.95)] || sorted[sorted.length - 1],
    throughput: iters / (total / 1000),
  };
}

// ─── Interleaved Benchmark Execution ───────────────────────────────────────

async function runTest(testName: string, beforeFn: () => Promise<any>, afterFn: () => Promise<any>, iterations: number = 25) {
  console.log(`\n🔹 Running: ${testName} (${iterations} interleaved iterations)...`);

  const beforeTimes: number[] = [];
  const afterTimes: number[] = [];

  // Warmup hệ thống (1 lần duy nhất cho cả Before và After)
  await beforeFn();
  await afterFn();

  // Thực thi lặp hoán đổi vị trí theo cơ chế mong muốn
  for (let i = 1; i <= iterations; i++) {
    if (i % 2 !== 0) {
      // Iteration lẻ: Before -> After
      const sBefore = performance.now();
      await beforeFn();
      beforeTimes.push(performance.now() - sBefore);

      const sAfter = performance.now();
      await afterFn();
      afterTimes.push(performance.now() - sAfter);
    } else {
      // Iteration chẵn: After -> Before
      const sAfter = performance.now();
      await afterFn();
      afterTimes.push(performance.now() - sAfter);

      const sBefore = performance.now();
      await beforeFn();
      beforeTimes.push(performance.now() - sBefore);
    }
  }

  const before = analyzeResults(beforeTimes);
  const after = analyzeResults(afterTimes);

  // In bảng chi tiết kết quả xử lý
  console.table({
    'BEFORE (Primary)': {
      'Avg Latency (ms)': `${before.avgTime.toFixed(2)}ms`,
      'P95 (ms)': `${before.p95.toFixed(2)}ms`,
      'Min/Max (ms)': `${before.minTime.toFixed(1)} / ${before.maxTime.toFixed(1)}`,
      'Throughput (ops/s)': before.throughput.toFixed(2),
    },
    'AFTER (Replica)': {
      'Avg Latency (ms)': `${after.avgTime.toFixed(2)}ms`,
      'P95 (ms)': `${after.p95.toFixed(2)}ms`,
      'Min/Max (ms)': `${after.minTime.toFixed(1)} / ${after.maxTime.toFixed(1)}`,
      'Throughput (ops/s)': after.throughput.toFixed(2),
    }
  });

  const improvement = ((before.avgTime - after.avgTime) / before.avgTime) * 100;
  const throughputGain = ((after.throughput - before.throughput) / before.throughput) * 100;

  console.log(`   ⚡ Latency: ${improvement > 0 ? '✅' : '⚠️'} ${Math.abs(improvement).toFixed(2)}% ${improvement > 0 ? 'faster' : 'slower'}`);
  console.log(`   ⚡ Throughput: ${throughputGain > 0 ? '✅' : '⚠️'} ${Math.abs(throughputGain).toFixed(2)}% ${throughputGain > 0 ? 'improvement' : 'decline'}\n`);

  return { before, after, improvement, throughputGain };
}

// ─── Main Test Runner ──────────────────────────────────────────────────────

async function main() {
  console.log('\n=============================================================');
  console.log('🚀 MONGODB REPLICATOR - PERFORMANCE BENCHMARK RUNNER 🚀');
  console.log('=============================================================\n');

  try {
    console.log('🔗 Connecting to Primary (Write) Database...');
    const primaryConn = await mongoose.connect(env.MONGODB_URI, {
      readPreference: 'primary',
      maxPoolSize: 10,
      minPoolSize: 1,
    });
    console.log('   ✓ Connection established.');

    console.log('\n🔗 Setting up read replica pool...');
    const readConns = [];
    for (let i = 0; i < 3; i++) {
      const readConn = mongoose.createConnection(env.MONGODB_URI, {
        readPreference: 'secondaryPreferred',
        maxStalenessSeconds: 90,
        maxPoolSize: 5,
        minPoolSize: 1,
      });
      await readConn.asPromise();
      readConns.push(readConn);
      console.log(`   ✓ Read replica ${i + 1} ready.`);
    }

    const TestModel = primaryConn.model<TestDoc>('BeforeAfterTest', testSchema);
    const ReadModel = readConns[0].model<TestDoc>('BeforeAfterTest', testSchema);

    try {
      await TestModel.collection.drop();
    } catch (err) {
      // Ignore
    }

    console.log('\n📝 Seeding test data (500 documents)...');
    const testDocs = Array.from({ length: 500 }, (_, i) => ({
      name: `Employee ${i + 1}`,
      email: `emp${i + 1}@company.com`,
      age: (i % 40) + 20,
      city: ['New York', 'San Francisco', 'London', 'Tokyo'][i % 4],
      salary: 50000 + (i % 50) * 1000,
      department: ['Engineering', 'Sales', 'HR', 'Finance'][i % 4],
    }));

    await TestModel.insertMany(testDocs);
    console.log('⏳ Waiting for replication lag to sync (2s)...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✓ Environment ready. Starting tests...\n');

    const allDocs = await TestModel.find({});
    const testId = allDocs[0]._id;

    const results = [];

    // Test 1
    results.push({ test: 'findById', ...(await runTest('Test 1: findById Performance', () => TestModel.findById(testId), () => ReadModel.findById(testId), 25)) });

    // Test 2
    results.push({ test: 'findOne', ...(await runTest('Test 2: findOne Performance', () => TestModel.findOne({ email: 'emp1@company.com' }), () => ReadModel.findOne({ email: 'emp1@company.com' }), 25)) });

    // Test 3
    results.push({ test: 'findMany', ...(await runTest('Test 3: find() All Documents (Full Scan)', () => TestModel.find({}), () => ReadModel.find({}), 10)) });

    // Test 4
    results.push({ test: 'filtered', ...(await runTest('Test 4: Filtered Query (department = Engineering)', () => TestModel.find({ department: 'Engineering' }), () => ReadModel.find({ department: 'Engineering' }), 25)) });

    // Test 5
    results.push({ test: 'count', ...(await runTest('Test 5: countDocuments Performance', () => TestModel.countDocuments({}), () => ReadModel.countDocuments({}), 25)) });

    // Test 6
    const complexFilter = { age: { $gte: 30, $lte: 50 }, salary: { $gte: 60000 } };
    results.push({ test: 'complex', ...(await runTest('Test 6: Complex Filter (age 30-50, salary ≥ 60k)', () => TestModel.find(complexFilter), () => ReadModel.find(complexFilter), 20)) });

    // Test 7
    results.push({ 
      test: 'concurrent', 
      ...(await runTest(
        'Test 7: Concurrent Reads (5 parallel queries)', 
        async () => Promise.all(Array.from({ length: 5 }, (_, i) => TestModel.findOne({ email: `emp${(i % 500) + 1}@company.com` }))), 
        async () => Promise.all(Array.from({ length: 5 }, (_, i) => ReadModel.findOne({ email: `emp${(i % 500) + 1}@company.com` }))), 
        15
      )) 
    });

    // ── Summary Report ─────────────────────────────────────────────────────
    console.log('\n┌──────────────────────────────────────────────────────────┐');
    console.log('│              COMPREHENSIVE COMPARISON REPORT             │');
    console.log('└──────────────────────────────────────────────────────────┘\n');

    const tableSummary: Record<string, any> = {};
    let totalImprovement = 0;
    let totalThroughputGain = 0;
    let improvementCount = 0;

    results.forEach((r) => {
      const status = r.improvement > 0 ? '✅ Faster' : '⚠️ Slower';
      tableSummary[r.test.toUpperCase()] = {
        'Before (ms)': `${r.before.avgTime.toFixed(2)}ms`,
        'After (ms)': `${r.after.avgTime.toFixed(2)}ms`,
        'Latency Change': `${status} (${Math.abs(r.improvement).toFixed(1)}%)`,
        'Before (ops/s)': r.before.throughput.toFixed(1),
        'After (ops/s)': r.after.throughput.toFixed(1),
        'Throughput Gain': `${r.throughputGain > 0 ? '+' : ''}${r.throughputGain.toFixed(1)}%`
      };

      if (r.improvement > 0) {
        totalImprovement += r.improvement;
        totalThroughputGain += r.throughputGain;
        improvementCount++;
      }
    });

    console.table(tableSummary);

    const avgImprovement = totalImprovement / improvementCount;
    const avgThroughputGain = totalThroughputGain / improvementCount;

    console.log('┌──────────────────────────────────────────────────────────┐');
    console.log('│                     OVERALL SUMMARY                      │');
    console.log('├──────────────────────────────────────────────────────────┤');
    console.log(`│  🚀 Average Latency Improvement:   ${avgImprovement.toFixed(2).padEnd(21)} │`);
    console.log(`│  📈 Average Throughput Gain:       ${avgThroughputGain.toFixed(2).padEnd(21)} │`);
    console.log('└──────────────────────────────────────────────────────────┘\n');

    // ── Cleanup ────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up...');
    await TestModel.collection.drop();
    await mongoose.disconnect();
    for (const conn of readConns) {
      await conn.close();
    }
    console.log('✅ Benchmark completed successfully!\n');
  } catch (error) {
    console.error('❌ Error during benchmark execution:', error);
    process.exit(1);
  }
}

main().catch(console.error);