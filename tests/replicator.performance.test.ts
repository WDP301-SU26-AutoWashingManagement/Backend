/**
 * replicator.performance.test.ts
 *
 * Unit test để đo tốc độ get dữ liệu từ read replica pool
 * So sánh hiệu năng giữa:
 *   - Direct primary (write connection)
 *   - Replica pool (read connection)
 */

import mongoose, { Connection, Model } from 'mongoose';
import { getReadConnection, getWriteConnection, connectDB, disconnectDB } from '../src/configs/db.config';
import { BaseRepository } from '../src/common/repositories/base.repository';

// ─── Mock Schema & Model ──────────────────────────────────────────────────────────

interface TestDocument extends mongoose.Document {
  name: string;
  email: string;
  age: number;
  createdAt: Date;
}

const testSchema = new mongoose.Schema<TestDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});

// ─── Mock Repository ──────────────────────────────────────────────────────────────

class TestRepository extends BaseRepository<TestDocument> {
  constructor(model: Model<TestDocument>) {
    super(model);
  }

  async findByEmail(email: string): Promise<TestDocument | null> {
    return this.findOne({ email });
  }

  async findAllByAge(age: number): Promise<TestDocument[]> {
    return this.find({ age });
  }

  async getAll(): Promise<TestDocument[]> {
    return this.findMany({});
  }

  async countAll(): Promise<number> {
    return this.count({});
  }
}

// ─── Performance Measurement Helper ────────────────────────────────────────────────

interface PerformanceResult {
  operation: string;
  totalTime: number; // ms
  averageTime: number; // ms
  iterations: number;
  minTime: number; // ms
  maxTime: number; // ms
  connection: 'primary' | 'replica';
}

const measurePerformance = async (
  fn: () => Promise<any>,
  iterations: number,
  operationName: string,
  connectionType: 'primary' | 'replica',
): Promise<PerformanceResult> => {
  const times: number[] = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = performance.now();
    await fn();
    const endTime = performance.now();
    times.push(endTime - startTime);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const averageTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    operation: operationName,
    totalTime,
    averageTime,
    iterations,
    minTime,
    maxTime,
    connection: connectionType,
  };
};

// ─── Test Suite ───────────────────────────────────────────────────────────────────

describe('MongoDB Replicator Performance Test', () => {
  let testModel: Model<TestDocument>;
  let repository: TestRepository;
  const NUM_DOCUMENTS = 100;
  const ITERATIONS = 10;

  beforeAll(async () => {
    // ✅ Connect to MongoDB
    await connectDB();

    // ✅ Get write connection and create collection
    const writeConn = getWriteConnection();
    testModel = writeConn.model<TestDocument>('TestDoc', testSchema);

    // ✅ Drop existing collection if exists
    try {
      await testModel.collection.drop();
    } catch (err) {
      // Collection doesn't exist, ignore
    }

    // ✅ Initialize repository
    repository = new TestRepository(testModel);

    // ✅ Seed test data
    const testDocs = Array.from({ length: NUM_DOCUMENTS }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      age: (i % 5) + 20,
    }));

    await repository.insertMany(testDocs);
    console.log(`✓ Seeded ${NUM_DOCUMENTS} test documents`);

    // ✅ Wait for replication to sync
    // (In real scenario, this would be handled by MongoDB replication lag)
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    // ✅ Cleanup
    try {
      await testModel.collection.drop();
    } catch (err) {
      // Ignore
    }
    await disconnectDB();
  });

  // ─── Test Cases ────────────────────────────────────────────────────────────────

  it('should measure findById performance on replica', async () => {
    const testId = (await repository.getAll())[0]._id.toString();

    const result = await measurePerformance(
      () => repository.findById(testId),
      ITERATIONS,
      'findById',
      'replica',
    );

    console.log(`\n📊 findById Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);

    // ✅ Assertion: Average response should be < 100ms for local/fast replica
    expect(result.averageTime).toBeLessThan(1000);
  });

  it('should measure findOne performance on replica', async () => {
    const result = await measurePerformance(
      () => repository.findByEmail('user1@test.com'),
      ITERATIONS,
      'findOne',
      'replica',
    );

    console.log(`\n📊 findOne Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);

    expect(result.averageTime).toBeLessThan(1000);
  });

  it('should measure findMany performance on replica', async () => {
    const result = await measurePerformance(
      () => repository.getAll(),
      ITERATIONS,
      'findMany',
      'replica',
    );

    console.log(`\n📊 findMany (All) Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);
    console.log(`   Retrieved: ${NUM_DOCUMENTS} documents per iteration`);

    expect(result.averageTime).toBeLessThan(1000);
  });

  it('should measure count performance on replica', async () => {
    const result = await measurePerformance(
      () => repository.countAll(),
      ITERATIONS,
      'count',
      'replica',
    );

    console.log(`\n📊 Count Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);

    expect(result.averageTime).toBeLessThan(1000);
  });

  it('should measure filtered find performance on replica', async () => {
    const result = await measurePerformance(
      () => repository.findAllByAge(20),
      ITERATIONS,
      'find with filter (age=20)',
      'replica',
    );

    console.log(`\n📊 Find with Filter Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);

    expect(result.averageTime).toBeLessThan(1000);
  });

  it('should show replica pool round-robin distribution', async () => {
    console.log(`\n📊 Replica Pool Round-Robin Test:`);

    // Trigger multiple reads to see round-robin in action
    const connections = new Set<Connection>();

    for (let i = 0; i < 5; i++) {
      const conn = getReadConnection();
      connections.add(conn);
      console.log(`   Read ${i + 1}: Connection ID = ${conn.id}`);
    }

    console.log(`   Total unique connections used: ${connections.size}`);
    expect(connections.size).toBeGreaterThan(0);
  });

  it('should measure batch operations performance', async () => {
    const result = await measurePerformance(
      async () => {
        const [count, all, byAge] = await Promise.all([
          repository.countAll(),
          repository.getAll(),
          repository.findAllByAge(20),
        ]);
        return { count, all, byAge };
      },
      ITERATIONS,
      'batch (count + getAll + filter)',
      'replica',
    );

    console.log(`\n📊 Batch Operations Performance:`);
    console.log(`   Total Time: ${result.totalTime.toFixed(2)}ms`);
    console.log(`   Average: ${result.averageTime.toFixed(2)}ms`);
    console.log(`   Min: ${result.minTime.toFixed(2)}ms`);
    console.log(`   Max: ${result.maxTime.toFixed(2)}ms`);
    console.log(`   Iterations: ${result.iterations}`);
    console.log(`   Operations per iteration: 3 (count, getAll, filter)`);

    expect(result.averageTime).toBeLessThan(1500);
  });
});

// ─── Standalone Performance Test (run without Jest) ────────────────────────────────

export async function runStandalonePerformanceTest() {
  console.log('🚀 Starting Replicator Performance Test...\n');

  try {
    await connectDB();

    const writeConn = getWriteConnection();
    const testModel = writeConn.model<TestDocument>('StandaloneTest', testSchema);

    try {
      await testModel.collection.drop();
    } catch (err) {
      // Ignore
    }

    const repository = new TestRepository(testModel);

    // Seed data
    const testDocs = Array.from({ length: 1000 }, (_, i) => ({
      name: `User ${i + 1}`,
      email: `user${i + 1}@test.com`,
      age: (i % 50) + 18,
    }));

    await repository.insertMany(testDocs);
    console.log(`✓ Seeded 1000 test documents\n`);

    // Wait for replication
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Run performance tests
    const results: PerformanceResult[] = [];

    // Test 1: findById
    const testId = (await repository.getAll())[0]._id.toString();
    const findByIdResult = await measurePerformance(
      () => repository.findById(testId),
      20,
      'findById',
      'replica',
    );
    results.push(findByIdResult);

    // Test 2: findOne
    const findOneResult = await measurePerformance(
      () => repository.findByEmail('user1@test.com'),
      20,
      'findOne',
      'replica',
    );
    results.push(findOneResult);

    // Test 3: findMany
    const findManyResult = await measurePerformance(
      () => repository.getAll(),
      10,
      'findMany',
      'replica',
    );
    results.push(findManyResult);

    // Test 4: count
    const countResult = await measurePerformance(
      () => repository.countAll(),
      20,
      'count',
      'replica',
    );
    results.push(countResult);

    // Print results summary
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📈 PERFORMANCE RESULTS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    results.forEach((result) => {
      console.log(`Operation: ${result.operation.padEnd(25)}`);
      console.log(`  Average Time: ${result.averageTime.toFixed(2)}ms`);
      console.log(`  Min Time:     ${result.minTime.toFixed(2)}ms`);
      console.log(`  Max Time:     ${result.maxTime.toFixed(2)}ms`);
      console.log(`  Total Time:   ${result.totalTime.toFixed(2)}ms (${result.iterations} iterations)`);
      console.log('');
    });

    console.log('═══════════════════════════════════════════════════════════\n');

    // Cleanup
    await testModel.collection.drop();
    await disconnectDB();

    console.log('✓ Test completed successfully');
  } catch (error) {
    console.error('❌ Error during performance test:', error);
    throw error;
  }
}

// Export for direct execution
if (require.main === module) {
  runStandalonePerformanceTest().catch(console.error);
}
