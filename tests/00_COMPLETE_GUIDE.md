# 🚀 MongoDB Replicator Performance Test Suite - Complete Guide

## 📋 Overview

Tôi đã tạo một **hoàn chỉnh test suite** để đo tốc độ lấy dữ liệu từ MongoDB read replica pool của bạn. Package này bao gồm:

1. **Unit Test Suite (Jest)** - Comprehensive performance tests
2. **Standalone Test Runner** - TypeScript script chạy độc lập
3. **Performance Tracker Utility** - Advanced metrics collection
4. **Complete Documentation** - Hướng dẫn chi tiết

---

## 📦 Generated Files

### 1. `replicator.performance.test.ts` (13KB)
**Jest Unit Test Suite** - Đo tốc độ qua Jest framework

**Bao gồm 7 test cases:**
- ✅ `findById performance on replica` - Tìm kiếm theo ID
- ✅ `findOne performance on replica` - Tìm 1 document
- ✅ `findMany performance on replica` - Lấy tất cả documents
- ✅ `count performance on replica` - Đếm documents
- ✅ `filtered find performance on replica` - Tìm với filter
- ✅ `replica pool round-robin distribution` - Kiểm tra load balancing
- ✅ `batch operations performance` - Multiple queries cùng lúc

**Usage:**
```bash
npm test -- replicator.performance.test
```

---

### 2. `replicator.perf.runner.ts` (9.9KB)
**Standalone Test Runner** - TypeScript script không cần Jest

**Chạy 7 performance tests:**
1. findById (Primary Connection)
2. findOne (Primary Connection)  
3. find() [many] (Primary Connection)
4. countDocuments (Primary Connection)
5. find() with filter (Primary Connection)
6. findById (Replica Connection)
7. find() [many] (Replica Connection)

**Usage:**
```bash
ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts
```

**Output mẫu:**
```
╔════════════════════════════════════════════════════════════╗
║        MongoDB Replicator Performance Test Suite            ║
╚════════════════════════════════════════════════════════════╝

📊 Test 1: findById (Primary Connection)
   Average: 12.45ms
   Min: 10.23ms | Max: 15.67ms

📈 PERFORMANCE SUMMARY
   Primary Average: 10.23ms
   Replica Average: 10.56ms
   Difference: 0.33ms (3.2%)

✅ All tests completed successfully!
```

---

### 3. `performance.tracker.ts` (8.9KB)
**Advanced Performance Metrics Utility** - Sử dụng trong production

**Features:**
- ⏱️ Start/end timing
- 📊 Calculate statistics (avg, min, max, p95, p99)
- 📈 Calculate throughput (ops/sec)
- 🔄 Compare operations
- ✅ Check SLA compliance
- 📝 Generate reports
- 🎯 Decorator support for automatic tracking

**Usage:**
```typescript
import { getPerformanceTracker } from '@/common/utils/performance.tracker';

const tracker = getPerformanceTracker();

// Start tracking
tracker.start('op1');
await someAsyncOperation();
tracker.end('op1', 'my_operation');

// Print report
tracker.printReport();

// Check SLA
const isOk = tracker.checkSLA('my_operation', 100); // 100ms limit

// Compare operations
tracker.compare('op1', 'op2');
```

---

### 4. `REPLICATOR_TEST_GUIDE.md` (6.8KB)
**Complete Documentation**

Bao gồm:
- 🚀 Cách chạy test (Jest, Standalone, TypeScript)
- 📊 Output examples
- 🧪 Chi tiết test cases
- 📈 Metrics tracked
- 🔧 Configuration
- ⚠️ Troubleshooting guide
- 🎯 Best practices

---

### 5. `PACKAGE_JSON_SCRIPTS.json` (908B)
**NPM Scripts để thêm vào package.json**

Thêm vào `package.json` của bạn:
```json
{
  "scripts": {
    "test:perf": "ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts",
    "test:perf:jest": "jest --config jest.config.perf.js --runInBand --forceExit",
    "test:perf:watch": "jest --config jest.config.perf.js --runInBand --watch",
    "test:perf:verbose": "jest --config jest.config.perf.js --runInBand --forceExit --verbose"
  }
}
```

---

## 🚀 Quick Start

### Bước 1: Copy files vào project

```bash
# Copy test files
cp replicator.performance.test.ts src/__tests__/
cp replicator.perf.runner.ts src/__tests__/
cp performance.tracker.ts src/common/utils/
```

### Bước 2: Thêm NPM scripts

Mở `package.json` và thêm vào `scripts` section:
```json
"test:perf": "ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts",
"test:perf:jest": "jest replicator.performance.test --runInBand --forceExit"
```

### Bước 3: Chạy test

```bash
# Option 1: Chạy standalone (fastest)
npm run test:perf

# Option 2: Chạy Jest
npm run test:perf:jest

# Option 3: Chạy trực tiếp
ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts
```

---

## 📊 Test Metrics

### Mỗi test đo những gì?

| Metric | Giải thích |
|--------|-----------|
| **Average Time** | Thời gian trung bình (ms) |
| **Min Time** | Thời gian nhanh nhất (ms) |
| **Max Time** | Thời gian chậm nhất (ms) |
| **Total Time** | Tổng thời gian (ms) |
| **P95/P99** | Percentile (nếu dùng tracker) |
| **Std Dev** | Standard deviation (nếu dùng tracker) |
| **Throughput** | Operations per second (nếu dùng tracker) |

---

## 🔧 Configuration

### Thay đổi số iterations (lần chạy test)

**File:** `replicator.performance.test.ts` (Line 57-58)
```typescript
const NUM_DOCUMENTS = 100;  // Số documents test
const ITERATIONS = 10;      // Số lần chạy mỗi test
```

### Thay đổi read pool size

**File:** `.env`
```env
MONGODB_READ_POOL_SIZE=3  # Mặc định: 3
```

### Thay đổi timeout (nếu test chạy lâu)

**File:** `jest.config.perf.js`
```javascript
testTimeout: 120000, // 120 seconds
```

---

## 📈 Expected Results

### Một setup bình thường:

```
Primary Average: 10.23ms
Replica Average: 10.56ms
Difference: 0.33ms (3.2%)
```

### Giải thích:
- ✅ **Tốt**: Replica gần tương đương Primary (< 5% chênh lệch)
- ⚠️ **Trung bình**: Replica chậm hơn Primary 5-10%
- ❌ **Xấu**: Replica chậm hơn Primary > 10% (kiểm tra replication lag)

---

## 🎯 Use Cases

### 1. Verify Replicator Setup
```bash
npm run test:perf
```
✅ Chắc chắn replicator đang hoạt động bình thường

### 2. Monitor Performance Over Time
```bash
# Run periodically (e.g., daily)
0 2 * * * cd /path/to/app && npm run test:perf >> perf.log
```

### 3. Test Before Deployment
```bash
npm run test:perf:jest
```
✅ Chắc chắn hiệu năng không bị ảnh hưởng

### 4. Compare Different Configurations
```typescript
// Sử dụng performance.tracker.ts
tracker.compare('replica_config_1', 'replica_config_2');
```

### 5. Monitor SLA in Production
```typescript
import { getPerformanceTracker } from '@/common/utils/performance.tracker';

const tracker = getPerformanceTracker();

// Check if query meets 100ms SLA
if (!tracker.checkSLA('user_findById', 100)) {
  alert('⚠️ Query is slower than SLA!');
}
```

---

## 🔍 Troubleshooting

### ❌ Error: "Cannot find module '@/common/utils/performance.tracker'"

**Fix:** Kiểm tra `tsconfig.json` có `paths` mapping:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### ❌ Error: "MONGODB_URI is not defined"

**Fix:** Thêm vào `.env`:
```env
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?replicaSet=rs0
```

### ❌ Error: "Connection timeout"

**Check:**
1. MongoDB URI đúng?
2. Network access cho MongoDB cluster?
3. Replica set setup?

### ❌ Test quá chậm (> 30s)

**Solution:**
- Tăng `MONGODB_READ_POOL_SIZE` 
- Giảm `ITERATIONS` từ 20 xuống 10
- Kiểm tra network latency

---

## 📚 Advanced Usage

### Track Custom Operations

```typescript
import { getPerformanceTracker } from '@/common/utils/performance.tracker';

const tracker = getPerformanceTracker();

// Custom operation
const opId = 'my_custom_op_' + Date.now();
tracker.start(opId);

// ... your code ...

const duration = tracker.end(opId, 'custom_operation');
console.log(`Operation took ${duration.toFixed(2)}ms`);

// View metrics
const metrics = tracker.getMetrics('custom_operation');
console.log(`Average: ${metrics.avgTime.toFixed(2)}ms`);
```

### Automatic Tracking with Decorator

```typescript
import { TrackPerformance } from '@/common/utils/performance.tracker';

class MyRepository {
  @TrackPerformance('user_findById')
  async findUserById(id: string) {
    return await User.findById(id);
  }
}

// Metrics automatically tracked!
```

### Compare Two Implementations

```typescript
const tracker = getPerformanceTracker();

// Test implementation 1
for (let i = 0; i < 10; i++) {
  tracker.start('test1');
  await impl1.getData();
  tracker.end('test1', 'implementation_1');
}

// Test implementation 2
for (let i = 0; i < 10; i++) {
  tracker.start('test2');
  await impl2.getData();
  tracker.end('test2', 'implementation_2');
}

// Compare
tracker.compare('implementation_1', 'implementation_2');
```

---

## 📝 Integration dengan Existing Code

Bạn có thể integrate performance tracker vào existing repository:

```typescript
// src/common/repositories/base.repository.ts

import { getPerformanceTracker } from '@/common/utils/performance.tracker';

export abstract class BaseRepository<T extends Document> {
  private tracker = getPerformanceTracker();

  find = async (filter: FilterQuery<T>, options: Record<string, any> = {}): Promise<T[]> => {
    const opId = `find_${Date.now()}_${Math.random()}`;
    this.tracker.start(opId);
    
    try {
      const result = await this.rm.find(filter, null, options);
      this.tracker.end(opId, `${this.model.modelName}_find`);
      return result;
    } catch (error) {
      this.tracker.end(opId, `${this.model.modelName}_find_error`);
      throw error;
    }
  };

  // ... other methods ...
}
```

---

## ✅ Checklist

- [x] Test files created
- [x] Documentation provided
- [x] NPM scripts defined
- [x] Performance tracker utility
- [x] Troubleshooting guide
- [x] Examples provided
- [x] Integration guide

---

## 🎯 Next Steps

1. **Copy files** vào project
2. **Update package.json** với NPM scripts
3. **Run tests**: `npm run test:perf`
4. **Review results** và so sánh
5. **Integrate tracker** vào production code (optional)
6. **Monitor regularly** để phát hiện regression

---

## 📞 Support

Nếu gặp vấn đề:

1. Kiểm tra `.env` có `MONGODB_URI`
2. Chắc chắn MongoDB replica set setup
3. Xem `REPLICATOR_TEST_GUIDE.md` phần Troubleshooting
4. Kiểm tra network latency tới MongoDB

---

## 📊 Summary

Bạn hiện có:
- ✅ 1 Jest unit test suite (7 tests)
- ✅ 1 Standalone runner (7 tests)
- ✅ 1 Performance tracker utility (production-ready)
- ✅ Complete documentation (6.8KB)
- ✅ NPM scripts
- ✅ Troubleshooting guide
- ✅ Integration examples

**Tổng cộng: ~50KB code + documentation**

**Tất cả sẵn sàng để chạy! 🚀**

---

Chúc bạn test thành công! 🎉
