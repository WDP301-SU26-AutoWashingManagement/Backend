/**
 * replicator.before-after.test.ts
 *
 * Comprehensive test suite để so sánh hiệu năng bằng bảng trực quan
 * BEFORE: Sử dụng primary connection cho tất cả queries
 * AFTER: Sử dụng read replica pool cho read queries
 */

import mongoose, { Connection, Model } from 'mongoose';
import { getReadConnection, getWriteConnection, connectDB, disconnectDB } from '../src/configs/db.config';
import { BaseRepository } from '../src/common/repositories/base.repository';

// ─── Types ────────────────────────────────────────────────────────────────

interface TestDocument extends mongoose.Document {
  name: string;
  email: string;
  age: number;
  city: string;
  salary: number;
  department: string;
  createdAt: Date;
}

interface BenchmarkResult {
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
  p95: number;
}

interface AggregatedRow {
  'Before (ms)': string;
  'After (ms)': string;
  'Latency Change': string;
  'Before (ops/s)': string;
  'After (ops/s)': string;
  'Throughput Gain': string;
}

// ─── Schema & Model ────────────────────────────────────────────────────────

const testSchema = new mongoose.Schema<TestDocument>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  age: { type: Number, default: 0 },
  city: { type: String, default: '' },
  salary: { type: Number, default: 0 },
  department: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

// ─── Repositories ──────────────────────────────────────────────────────────

class BeforeRepository extends BaseRepository<TestDocument> {
  constructor(model: Model<TestDocument>) { super(model); }
  async findByEmailBefore(email: string) { return this.model.findOne({ email }).exec(); }
  async findAllBefore() { return this.model.find({}).exec(); }
  async findByDepartmentBefore(dept: string) { return this.model.find({ department: dept }).exec(); }
  async countAllBefore() { return this.model.countDocuments({}).exec(); }
  async findByIdBefore(id: string) { return this.model.findById(id).exec(); }
  async findWithComplexFilterBefore(filters: any) { return this.model.find(filters).exec(); }
}

class AfterRepository extends BaseRepository<TestDocument> {
  constructor(model: Model<TestDocument>) { super(model); }
  async findByEmailAfter(email: string) { return this.findOne({ email }); }
  async findAllAfter() { return this.findMany({}); }
  async findByDepartmentAfter(dept: string) { return this.find({ department: dept }); }
  async countAllAfter() { return this.count({}); }
  async findByIdAfter(id: string) { return this.findById(id); }
  async findWithComplexFilterAfter(filters: any) { return this.find(filters); }
}

// ─── Test Suite ────────────────────────────────────────────────────────────

describe('MongoDB Replicator - Before/After Comparison Test', () => {
  let testModel: Model<TestDocument>;
  let beforeRepo: BeforeRepository;
  let afterRepo: AfterRepository;
  
  const summaryReportData: Record<string, AggregatedRow> = {};
  
  const NUM_DOCUMENTS = 500;
  const ITERATIONS = 20;

  // Tính toán các chỉ số thống kê từ mảng kết quả time execution
  function analyzeTimes(times: number[]): BenchmarkResult {
    const sorted = [...times].sort((a, b) => a - b);
    const total = times.reduce((a, b) => a + b, 0);
    const iters = times.length;
    return {
      avgTime: total / iters,
      minTime: sorted[0],
      maxTime: sorted[sorted.length - 1],
      throughput: iters / (total / 1000),
      p95: sorted[Math.floor(iters * 0.95)] || sorted[sorted.length - 1],
    };
  }

  // Cơ chế chạy xen kẽ (Interleaved Iterations) để loại bỏ bias
  async function runAndLogComparison(
    testKey: string, 
    title: string, 
    beforeFn: () => Promise<any>, 
    afterFn: () => Promise<any>, 
    runIters = ITERATIONS
  ) {
    const beforeTimes: number[] = [];
    const afterTimes: number[] = [];

    // Warmup cả 2 môi trường trước khi đo đạc thực tế
    await beforeFn();
    await afterFn();

    // Thực hiện vòng lặp xen kẽ đảo vị trí liên tục
    for (let i = 1; i <= runIters; i++) {
      if (i % 2 !== 0) {
        // Vòng lẻ: Before -> After
        const sBefore = performance.now();
        await beforeFn();
        beforeTimes.push(performance.now() - sBefore);

        const sAfter = performance.now();
        await afterFn();
        afterTimes.push(performance.now() - sAfter);
      } else {
        // Vòng chẵn: After -> Before
        const sAfter = performance.now();
        await afterFn();
        afterTimes.push(performance.now() - sAfter);

        const sBefore = performance.now();
        await beforeFn();
        beforeTimes.push(performance.now() - sBefore);
      }
    }

    const beforeRes = analyzeTimes(beforeTimes);
    const afterRes = analyzeTimes(afterTimes);

    console.log(`\n🔹 ${title}`);
    console.table({
      'BEFORE (Primary)': {
        'Avg (ms)': `${beforeRes.avgTime.toFixed(2)}ms`,
        'P95 (ms)': `${beforeRes.p95.toFixed(2)}ms`,
        'Throughput': `${beforeRes.throughput.toFixed(1)} ops/s`
      },
      'AFTER (Replica)': {
        'Avg (ms)': `${afterRes.avgTime.toFixed(2)}ms`,
        'P95 (ms)': `${afterRes.p95.toFixed(2)}ms`,
        'Throughput': `${afterRes.throughput.toFixed(1)} ops/s`
      }
    });

    const improvement = ((beforeRes.avgTime - afterRes.avgTime) / beforeRes.avgTime) * 100;
    const throughputGain = ((afterRes.throughput - beforeRes.throughput) / beforeRes.throughput) * 100;

    summaryReportData[testKey.toUpperCase()] = {
      'Before (ms)': `${beforeRes.avgTime.toFixed(2)}ms`,
      'After (ms)': `${afterRes.avgTime.toFixed(2)}ms`,
      'Latency Change': `${improvement > 0 ? '✅ Faster' : '⚠️ Slower'} (${Math.abs(improvement).toFixed(1)}%)`,
      'Before (ops/s)': beforeRes.throughput.toFixed(1),
      'After (ops/s)': afterRes.throughput.toFixed(1),
      'Throughput Gain': `${throughputGain > 0 ? '+' : ''}${throughputGain.toFixed(1)}%`
    };
  }

  beforeAll(async () => {
    await connectDB();
    const writeConn = getWriteConnection();
    testModel = writeConn.model<TestDocument>('BeforeAfterTest', testSchema);

    try { await testModel.collection.drop(); } catch (e) {}

    beforeRepo = new BeforeRepository(testModel);
    afterRepo = new AfterRepository(testModel);

    const testDocs = Array.from({ length: NUM_DOCUMENTS }, (_, i) => ({
      name: `Employee ${i + 1}`,
      email: `emp${i + 1}@company.com`,
      age: (i % 40) + 20,
      city: ['New York', 'San Francisco', 'London', 'Tokyo'][i % 4],
      salary: 50000 + (i % 50) * 1000,
      department: ['Engineering', 'Sales', 'HR', 'Finance'][i % 4],
    }));

    await beforeRepo.insertMany(testDocs);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    try { await testModel.collection.drop(); } catch (e) {}
    await disconnectDB();
  });

  // ─── Tests ───────────────────────────────────────────────────────────────

  it('Test 1: findById Performance', async () => {
    const testId = (await testModel.find({}))[0]._id.toString();
    await runAndLogComparison('findById', 'findById Performance', 
      () => beforeRepo.findByIdBefore(testId), 
      () => afterRepo.findByIdAfter(testId)
    );
  });

  it('Test 2: findOne Performance', async () => {
    await runAndLogComparison('findOne', 'findOne (by Email) Performance', 
      () => beforeRepo.findByEmailBefore('emp1@company.com'), 
      () => afterRepo.findByEmailAfter('emp1@company.com')
    );
  });

  it('Test 3: findMany (Full Scan) Performance', async () => {
    await runAndLogComparison('findMany', 'findMany (Full Scan 500 docs)', 
      () => beforeRepo.findAllBefore(), 
      () => afterRepo.findAllAfter(), 
      10
    );
  });

  it('Test 4: Filtered Query Performance', async () => {
    await runAndLogComparison('filtered', 'Filtered Query (department = Engineering)', 
      () => beforeRepo.findByDepartmentBefore('Engineering'), 
      () => afterRepo.findByDepartmentAfter('Engineering')
    );
  });

  it('Test 5: Count Performance', async () => {
    await runAndLogComparison('count', 'countDocuments Performance', 
      () => beforeRepo.countAllBefore(), 
      () => afterRepo.countAllAfter()
    );
  });

  it('Test 6: Concurrent Reads Performance', async () => {
    const concurrentQueries = 5;
    await runAndLogComparison('concurrent', `Concurrent Reads (${concurrentQueries} parallel queries)`,
      () => Promise.all(Array.from({ length: concurrentQueries }, (_, i) => beforeRepo.findByEmailBefore(`emp${(i % NUM_DOCUMENTS) + 1}@company.com`))),
      () => Promise.all(Array.from({ length: concurrentQueries }, (_, i) => afterRepo.findByEmailAfter(`emp${(i % NUM_DOCUMENTS) + 1}@company.com`)))
    );
  });

  it('Test 7: Complex Filter Performance', async () => {
    const complexFilter = { age: { $gte: 30, $lte: 50 }, salary: { $gte: 60000 }, department: 'Engineering' };
    await runAndLogComparison('complex', 'Complex Filter Performance', 
      () => beforeRepo.findWithComplexFilterBefore(complexFilter), 
      () => afterRepo.findWithComplexFilterAfter(complexFilter)
    );
  });

  it('Test 8: Load Test Analysis', async () => {
    const readOperations = 50;
    const writeOperations = 5;

    const beforeStart = performance.now();
    for (let i = 0; i < readOperations; i++) await beforeRepo.countAllBefore();
    for (let i = 0; i < writeOperations; i++) await beforeRepo.create({ name: `T1 ${i}`, email: `t1_${i}@t.com` });
    const beforeTime = performance.now() - beforeStart;

    const afterStart = performance.now();
    for (let i = 0; i < readOperations; i++) await afterRepo.countAllAfter();
    for (let i = 0; i < writeOperations; i++) await afterRepo.create({ name: `T2 ${i}`, email: `t2_${i}@t.com` });
    const afterTime = performance.now() - afterStart;

    const improvement = ((beforeTime - afterTime) / beforeTime) * 100;

    console.log('\n🔹 Test 8: Mixed Load Test (Simultaneous Reads + Writes)');
    console.table({
      'Mixed Traffic': {
        'BEFORE Execution (ms)': `${beforeTime.toFixed(2)}ms`,
        'AFTER Execution (ms)': `${afterTime.toFixed(2)}ms`,
        'Efficiency Gain': `${improvement > 0 ? '✅' : '⚠️'} ${Math.abs(improvement).toFixed(1)}%`
      }
    });

    summaryReportData['LOAD_TEST'] = {
      'Before (ms)': `${beforeTime.toFixed(1)}ms`,
      'After (ms)': `${afterTime.toFixed(1)}ms`,
      'Latency Change': `${improvement > 0 ? '✅ Faster' : '⚠️ Slower'} (${Math.abs(improvement).toFixed(1)}%)`,
      'Before (ops/s)': 'N/A',
      'After (ops/s)': 'N/A',
      'Throughput Gain': 'N/A'
    };

    await testModel.deleteMany({ email: /@t.com/ });
  });

  it('Test 9: Comprehensive Summary Report', async () => {
    console.log('\n┌──────────────────────────────────────────────────────────┐');
    console.log('│              COMPREHENSIVE COMPARISON REPORT             │');
    console.log('└──────────────────────────────────────────────────────────┘\n');

    console.table(summaryReportData);

    console.log('💡 RECOMMENDATIONS:');
    console.log('  1. Deploy replicator in production immediately for read-heavy flows.');
    console.log('  2. Tune MONGODB_READ_POOL_SIZE to match replica node count.');
    console.log('  3. Ensure maxStalenessSeconds is handled properly for business-critical read queries.');
  });
});