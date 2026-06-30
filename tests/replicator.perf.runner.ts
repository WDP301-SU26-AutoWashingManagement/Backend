/**
 * replicator.perf.runner.ts
 *
 * Simple standalone script để chạy performance test
 * Usage: ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts
 */

import mongoose from 'mongoose';
import { env } from '../configs/env.config';
import { logger } from '../common/utils/logger';

// ─── Mock Test Document ───────────────────────────────────────────────────────────

interface TestDoc extends mongoose.Document {
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

const testSchema = new mongoose.Schema<TestDoc>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// ─── Performance Measurement ───────────────────────────────────────────────────────

interface TestResult {
  name: string;
  avgTime: number;
  minTime: number;
  maxTime: number;
  totalTime: number;
  iterations: number;
}

const measureAsync = async (
  fn: () => Promise<any>,
  iterations: number,
  testName: string,
): Promise<TestResult> => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    name: testName,
    avgTime,
    minTime,
    maxTime,
    totalTime,
    iterations,
  };
};

// ─── Main Test Runner ─────────────────────────────────────────────────────────────

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║        MongoDB Replicator Performance Test Suite            ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Connect using default connection (primary for writes)
    console.log('🔗 Connecting to MongoDB...');
    const conn = await mongoose.connect(env.MONGODB_URI, {
      readPreference: 'primary',
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 8_000,
      socketTimeoutMS: 30_000,
      connectTimeoutMS: 15_000,
    });

    console.log('✓ Connected to primary (write)\n');

    // Create replica read connections
    console.log('🔗 Setting up read replica pool...');
    const readConns = [];
    for (let i = 0; i < 3; i++) {
      const readConn = mongoose.createConnection(env.MONGODB_URI, {
        readPreference: 'secondaryPreferred',
        maxStalenessSeconds: 90,
        maxPoolSize: 5,
        minPoolSize: 1,
        serverSelectionTimeoutMS: 8_000,
        socketTimeoutMS: 30_000,
      });
      await readConn.asPromise();
      readConns.push(readConn);
      console.log(`✓ Read replica ${i + 1} connected`);
    }

    console.log('\n');

    // Create test model on primary connection
    const TestModel = conn.model<TestDoc>('PerfTest', testSchema);

    // Cleanup
    try {
      await TestModel.collection.drop();
    } catch (err) {
      // Ignore
    }

    // Seed test data
    console.log('📝 Seeding test data...');
    const testDocs = Array.from({ length: 500 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      age: (i % 30) + 18,
    }));

    await TestModel.insertMany(testDocs);
    console.log(`✓ Inserted ${testDocs.length} test documents\n`);

    // Wait for replication
    console.log('⏳ Waiting for replication to sync (2s)...');
    await new Promise((resolve) => setTimeout(resolve, 2000));
    console.log('✓ Replication synced\n');

    // Test results array
    const results: TestResult[] = [];

    // ── Test 1: findById on primary
    console.log('📊 Test 1: findById (Primary Connection)');
    const allDocs = await TestModel.find({});
    const testId = allDocs[0]._id;

    const test1Result = await measureAsync(
      () => TestModel.findById(testId),
      25,
      'findById (primary)',
    );
    results.push(test1Result);
    console.log(`   Average: ${test1Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test1Result.minTime.toFixed(2)}ms | Max: ${test1Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 2: findOne on primary
    console.log('📊 Test 2: findOne (Primary Connection)');
    const test2Result = await measureAsync(
      () => TestModel.findOne({ email: 'user1@test.com' }),
      25,
      'findOne (primary)',
    );
    results.push(test2Result);
    console.log(`   Average: ${test2Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test2Result.minTime.toFixed(2)}ms | Max: ${test2Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 3: find many on primary
    console.log('📊 Test 3: find() [many] (Primary Connection)');
    const test3Result = await measureAsync(
      () => TestModel.find({}),
      15,
      'find() (primary)',
    );
    results.push(test3Result);
    console.log(`   Average: ${test3Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test3Result.minTime.toFixed(2)}ms | Max: ${test3Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 4: countDocuments on primary
    console.log('📊 Test 4: countDocuments (Primary Connection)');
    const test4Result = await measureAsync(
      () => TestModel.countDocuments({}),
      25,
      'countDocuments (primary)',
    );
    results.push(test4Result);
    console.log(`   Average: ${test4Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test4Result.minTime.toFixed(2)}ms | Max: ${test4Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 5: find with filter on primary
    console.log('📊 Test 5: find() with filter (Primary Connection)');
    const test5Result = await measureAsync(
      () => TestModel.find({ age: { $gte: 30 } }).limit(10),
      20,
      'find() with filter (primary)',
    );
    results.push(test5Result);
    console.log(`   Average: ${test5Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test5Result.minTime.toFixed(2)}ms | Max: ${test5Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 6: Same operations on replica
    console.log('📊 Test 6: findById (Replica Connection)');
    const ReadModel = readConns[0].model<TestDoc>('PerfTest', testSchema);

    const test6Result = await measureAsync(
      () => ReadModel.findById(testId),
      25,
      'findById (replica)',
    );
    results.push(test6Result);
    console.log(`   Average: ${test6Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test6Result.minTime.toFixed(2)}ms | Max: ${test6Result.maxTime.toFixed(2)}ms\n`);

    // ── Test 7: find on replica
    console.log('📊 Test 7: find() [many] (Replica Connection)');
    const test7Result = await measureAsync(
      () => ReadModel.find({}),
      15,
      'find() (replica)',
    );
    results.push(test7Result);
    console.log(`   Average: ${test7Result.avgTime.toFixed(2)}ms`);
    console.log(`   Min: ${test7Result.minTime.toFixed(2)}ms | Max: ${test7Result.maxTime.toFixed(2)}ms\n`);

    // ── Print summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📈 PERFORMANCE SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    results.forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.name.padEnd(30)}`);
      console.log(
        `   Average: ${result.avgTime.toFixed(2)}ms | Min: ${result.minTime.toFixed(2)}ms | Max: ${result.maxTime.toFixed(2)}ms`,
      );
      console.log(`   Total: ${result.totalTime.toFixed(2)}ms (${result.iterations} iterations)\n`);
    });

    // Comparison: Primary vs Replica
    const primaryAvg = results
      .filter((r) => r.name.includes('primary'))
      .reduce((sum, r) => sum + r.avgTime, 0) / results.filter((r) => r.name.includes('primary')).length;

    const replicaAvg = results
      .filter((r) => r.name.includes('replica'))
      .reduce((sum, r) => sum + r.avgTime, 0) / results.filter((r) => r.name.includes('replica')).length;

    console.log('═══════════════════════════════════════════════════════════');
    console.log(`Primary Average: ${primaryAvg.toFixed(2)}ms`);
    console.log(`Replica Average: ${replicaAvg.toFixed(2)}ms`);
    console.log(
      `Difference: ${Math.abs(primaryAvg - replicaAvg).toFixed(2)}ms (${((Math.abs(primaryAvg - replicaAvg) / primaryAvg) * 100).toFixed(1)}%)`,
    );
    console.log('═══════════════════════════════════════════════════════════\n');

    // Cleanup
    console.log('🧹 Cleaning up...');
    await TestModel.collection.drop();
    await conn.close();

    for (const readConn of readConns) {
      await readConn.close();
    }

    console.log('✓ Cleanup complete\n');
    console.log('✅ All tests completed successfully!\n');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
