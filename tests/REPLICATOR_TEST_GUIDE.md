# MongoDB Replicator Performance Test Guide

Hướng dẫn để test tốc độ lấy dữ liệu từ MongoDB read replica pool.

## 📦 Files

- `src/__tests__/replicator.performance.test.ts` - Unit test suite (Jest)
- `src/__tests__/replicator.perf.runner.ts` - Standalone test runner (TypeScript)

---

## 🚀 Cách chạy

### Option 1: Chạy bằng Jest (Recommended)

```bash
# Chạy tất cả test performance
npm test -- replicator.performance.test

# Chạy một test cụ thể
npm test -- replicator.performance.test -t "should measure findById"

# Chạy với verbose output
npm test -- replicator.performance.test --verbose

# Chạy với coverage
npm test -- replicator.performance.test --coverage
```

### Option 2: Chạy standalone script

```bash
# Chạy performance test không cần Jest
ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts

# Hoặc sau khi build
npm run build
node dist/__tests__/replicator.perf.runner.js
```

### Option 3: Chạy từ TypeScript trực tiếp

```bash
# Sử dụng ts-node-dev (development)
ts-node -r tsconfig-paths/register src/__tests__/replicator.perf.runner.ts
```

---

## 📊 Output Example

```
╔════════════════════════════════════════════════════════════╗
║        MongoDB Replicator Performance Test Suite            ║
╚════════════════════════════════════════════════════════════╝

🔗 Connecting to MongoDB...
✓ Connected to primary (write)

🔗 Setting up read replica pool...
✓ Read replica 1 connected
✓ Read replica 2 connected
✓ Read replica 3 connected

📝 Seeding test data...
✓ Inserted 500 test documents

⏳ Waiting for replication to sync (2s)...
✓ Replication synced

📊 Test 1: findById (Primary Connection)
   Average: 12.45ms
   Min: 10.23ms | Max: 15.67ms

📊 Test 2: findOne (Primary Connection)
   Average: 8.32ms
   Min: 7.15ms | Max: 11.42ms

...

═══════════════════════════════════════════════════════════
📈 PERFORMANCE SUMMARY
═══════════════════════════════════════════════════════════

1. findById (primary)                    
   Average: 12.45ms | Min: 10.23ms | Max: 15.67ms
   Total: 311.25ms (25 iterations)

2. findOne (primary)                     
   Average: 8.32ms | Min: 7.15ms | Max: 11.42ms
   Total: 208.00ms (25 iterations)

...

═══════════════════════════════════════════════════════════
Primary Average: 10.23ms
Replica Average: 10.56ms
Difference: 0.33ms (3.2%)
═══════════════════════════════════════════════════════════

✓ Test completed successfully
```

---

## 🧪 Test Cases

### Jest Unit Tests (`replicator.performance.test.ts`)

1. **findById Performance** - Đo tốc độ tìm kiếm theo ID
2. **findOne Performance** - Đo tốc độ tìm 1 document
3. **findMany Performance** - Đo tốc độ lấy tất cả documents
4. **Count Performance** - Đo tốc độ đếm documents
5. **Filtered Find Performance** - Đo tốc độ tìm với filter
6. **Replica Pool Round-Robin** - Kiểm tra phân bổ load
7. **Batch Operations** - Đo tốc độ chạy nhiều query cùng lúc

### Standalone Runner (`replicator.perf.runner.ts`)

1. findById (Primary)
2. findOne (Primary)
3. find() many (Primary)
4. countDocuments (Primary)
5. find() with filter (Primary)
6. findById (Replica)
7. find() many (Replica)

---

## 📈 Metrics Tracked

Mỗi test sẽ đo:

- **Average Time** - Thời gian trung bình (ms)
- **Min Time** - Thời gian nhanh nhất (ms)
- **Max Time** - Thời gian chậm nhất (ms)
- **Total Time** - Tổng thời gian toàn bộ iterations (ms)
- **Iterations** - Số lần chạy

---

## 🔧 Configuration

### Thay đổi số iterations

File: `src/__tests__/replicator.performance.test.ts`
```typescript
const ITERATIONS = 10;  // Thay đổi số này
const NUM_DOCUMENTS = 100;  // Thay đổi số document test
```

### Thay đổi read pool size

File: `.env`
```env
MONGODB_READ_POOL_SIZE=3  # Số read connection (default: 3)
```

---

## 📋 Pre-requisites

1. **MongoDB Atlas** hoặc **MongoDB Replica Set** đã setup
2. **MONGODB_URI** trong `.env` với format:
   ```
   MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?replicaSet=rs0&...
   ```
3. **Replica Set** phải có ít nhất 3 nodes (Primary + Secondary + Arbiter)

---

## ⚠️ Notes

- Test sử dụng **mock data** (không ảnh hưởng production)
- Tự động cleanup dữ liệu sau khi test hoàn thành
- Tests chạy **serial** (không parallel) để tránh race condition
- Thời gian lấy dữ liệu phụ thuộc vào:
  - Network latency
  - Database load
  - Replication lag
  - Connection pool status

---

## 🔍 Troubleshooting

### Error: "MONGODB_URI is not defined"
```bash
# Đảm bảo .env file có MONGODB_URI
echo "MONGODB_URI=mongodb+srv://..." > .env
```

### Error: "Connection timeout"
- Kiểm tra MongoDB connection string
- Kiểm tra firewall/network access
- Kiểm tra replica set setup

### Slow performance
- Kiểm tra replication lag: `rs.status()` trong MongoDB
- Kiểm tra network latency
- Tăng connection pool size: `maxPoolSize: 20`

---

## 📚 More Information

- [MongoDB Replication Documentation](https://docs.mongodb.com/manual/replication/)
- [Mongoose Connection Documentation](https://mongoosejs.com/docs/connections.html)
- [MongoDB Read Preference](https://docs.mongodb.com/manual/core/read-preference/)

---

## 📝 Sample Test Output Interpretation

```
Primary Average: 10.23ms
Replica Average: 10.56ms
Difference: 0.33ms (3.2%)
```

✅ **Good**: Replica có tốc độ tương tự Primary (replication lag không đáng kể)
⚠️ **Warning**: Nếu chênh lệch > 10%, có thể network hoặc replica bị lag
❌ **Bad**: Nếu chênh lệch > 50%, cần kiểm tra replica set health

---

## 🎯 Best Practices

1. **Chạy test nhiều lần** để lấy trung bình chính xác
2. **Kiểm tra replication lag** trước test: `rs.printSecondaryReplicationInfo()`
3. **Chạy vào lúc production ít traffic** nếu test trên production
4. **Sử dụng read replica** cho read-heavy workloads
5. **Monitor metrics** trong MongoDB Cloud Console

---

Chúc bạn test thành công! 🚀
