# 📊 Complete Dashboard Architecture Summary

## 🎯 Dashboard Overview ที่ควรมี

### **1. 🚀 Performance Overview Dashboard**
**Data Source**: Metrics (Prometheus)

```yaml
purpose: "ภาพรวม performance ของทุก routes"
panels:
  - "📈 Request Rate by Route" 
  - "⏱️ Response Time 95th percentile"
  - "💾 Memory Usage (System-wide)"
  - "🔧 CPU Usage (System-wide)"
  - "📊 Request Rate vs Duration Correlation"

key_metrics:
  - http_requests_total (Counter)
  - http_request_duration_seconds (Histogram)  
  - memory_usage_percent (Gauge)
  - cpu_usage_percent (Gauge)

queries:
  - "sum(rate(http_requests_total[5m])) by (route)"
  - "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))"
```

### **2. 🏆 Top 10 Performance Dashboard** 
**Data Source**: Metrics (Prometheus)

```yaml
purpose: "หา routes ที่มีปัญหาด้าน performance มากที่สุด"
panels:
  - "🏆 Top 10 Memory Usage per Request"
  - "⚡ Top 10 CPU Usage per Request" 
  - "🚀 Top 10 Request Rate"
  - "🐌 Top 10 Slowest Routes"
  - "📋 Combined Resource Analysis Table"

key_metrics:
  - http_request_memory_usage_bytes (Histogram)
  - http_request_cpu_time_seconds (Histogram)
  - http_requests_total (Counter)
  - http_request_duration_seconds (Histogram)

queries:
  - "topk(10, histogram_quantile(0.95, sum(rate(http_request_memory_usage_bytes_bucket[5m])) by (le, route)))"
  - "topk(10, histogram_quantile(0.95, sum(rate(http_request_cpu_time_seconds_bucket[5m])) by (le, route)))"
  - "topk(10, sum(rate(http_requests_total[5m])) by (route))"
```

### **3. 🚨 Error Analysis Dashboard**
**Data Source**: Metrics (Prometheus) 

```yaml
purpose: "วิเคราะห์ errors แยกตาม routes"
panels:
  - "📊 Error Rate Overview (% และ count)"
  - "🏆 Top 10 Error Routes (Count)"  
  - "📈 Top 10 Error Routes (Percentage)"
  - "🔥 Error Trends by Route"
  - "📋 Error Details by Status Code"

key_metrics:
  - http_requests_total{status_code=~"4..|5.."} (Counter)

queries:
  - "topk(10, sum(rate(http_requests_total{status_code=~\"4..|5..\"}[5m])) by (route))"
  - "topk(10, (sum(rate(http_requests_total{status_code=~\"4..|5..\"}[5m])) by (route) / sum(rate(http_requests_total[5m])) by (route)) * 100)"
```

### **4. 🔍 Individual Trace Analysis Dashboard**
**Data Source**: Traces (Tempo)

```yaml
purpose: "วิเคราะห์ traces รายตัวสำหรับ root cause analysis"
panels:
  - "🐌 Top 10 Slowest Traces per Route"
  - "💾 Top 10 Memory Intensive Traces"
  - "⚡ Top 10 CPU Intensive Traces"  
  - "🚨 Recent Error Traces"
  - "📋 Complete Trace Analysis Table"

key_data:
  - Individual trace data with resource attributes
  - span.http.route, span.request.memory_usage_bytes
  - span.request.cpu_time_ms, duration

queries:
  - "{ span.http.route=\"${route}\" && duration > ${min_duration} } | select(traceID, duration, span.http.method) | limit 10"
  - "{ span.http.route=\"${route}\" && span.request.memory_usage_bytes > ${min_memory} } | select(traceID, span.request.memory_usage_bytes, duration) | limit 10"
```

### **5. 🗄️ Database Performance Dashboard**
**Data Source**: Metrics (Prometheus)

```yaml
purpose: "วิเคราะห์ database performance แยกตาม commands"
panels:
  - "🗄️ Query Time by Command (95th percentile)"
  - "📊 Query Rate by Database"  
  - "🔗 Connection Pool Usage"
  - "💿 Database Memory Usage"
  - "🏆 Top 10 Slowest Queries"

key_metrics:
  - db_query_duration_seconds (Histogram)
  - db_connection_pool_usage_percent (Gauge)
  - db_memory_usage_bytes (Gauge)

queries:
  - "histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, db_command))"
  - "topk(10, histogram_quantile(0.99, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, table)))"
```

### **6. 🔗 Correlation Investigation Dashboard**
**Data Source**: Hybrid (Metrics + Traces)

```yaml
purpose: "เชื่อม metrics alerts กับ individual traces"
panels:
  - "📈 Metrics Alert Timeline"
  - "🔍 Find Traces in Alert Time Range"
  - "📊 Correlation Analysis"
  - "🎯 Investigation Actions"

workflow:
  1. "เห็น metrics spike"
  2. "Set time range ตาม alert"
  3. "Query traces ใน time range นั้น"
  4. "Drill down เข้า trace details"

queries_metrics:
  - "Alert detection queries"
queries_traces:  
  - "{ span.http.route=\"${route}\" && span.start_time > ${alert_start} && span.start_time < ${alert_end} && duration > 2s }"
```

## 📋 Complete Metrics Architecture

### **🎯 Metrics ที่ต้องเก็บ:**

| Category | Metric Name | Type | Labels | Purpose |
|----------|-------------|------|--------|---------|
| **Request** | `http_requests_total` | Counter | `method`, `route`, `status_code` | Request counting |
| **Performance** | `http_request_duration_seconds` | Histogram | `method`, `route`, `status_code` | Response time |
| **Resources** | `http_request_memory_usage_bytes` | Histogram | `method`, `route`, `status_code` | Memory per request |
| **Resources** | `http_request_cpu_time_seconds` | Histogram | `method`, `route`, `status_code` | CPU per request |
| **System** | `memory_usage_percent` | Gauge | `service`, `instance` | System memory |
| **System** | `cpu_usage_percent` | Gauge | `service`, `instance` | System CPU |
| **Database** | `db_query_duration_seconds` | Histogram | `db_command`, `database`, `table` | DB performance |
| **Database** | `db_connection_pool_usage_percent` | Gauge | `database`, `pool_name` | DB connections |
| **Database** | `db_memory_usage_bytes` | Gauge | `database`, `instance` | DB memory |

### **🔍 Trace Attributes ที่ต้องเพิ่ม:**

```typescript
// Span attributes for individual analysis
span.setAttributes({
  'http.method': method,
  'http.route': route,
  'http.status_code': statusCode,
  'request.duration_ms': duration,
  'request.memory_usage_bytes': memoryDelta,      // 🎯 สำคัญ!
  'request.cpu_time_ms': cpuTimeMs,              // 🎯 สำคัญ!
  'request.memory_heap_used': endMemory.heapUsed,
  'user.id': userId,                             // Business context
  'user.tier': userTier                          // Business context
});
```

## 🚀 Implementation Priority

### **Phase 1: Core Performance (สัปดาห์ที่ 1)**
```bash
✅ Performance Overview Dashboard (Metrics)
✅ Basic request/duration/error metrics
✅ Top 10 Performance Dashboard (Metrics)
```

### **Phase 2: Enhanced Resources (สัปดาห์ที่ 2)**
```bash
✅ Add memory/CPU tracking per request
✅ Enhanced instrumentation code
✅ Resource-based alerting
```

### **Phase 3: Error Analysis (สัปดาห์ที่ 3)**
```bash
✅ Error Analysis Dashboard (Metrics)
✅ Error rate vs count analysis
✅ Top error routes identification
```

### **Phase 4: Individual Traces (สัปดาห์ที่ 4)**
```bash
✅ Individual Trace Analysis Dashboard (Traces)
✅ TraceQL queries for root cause
✅ Enhanced span attributes
```

### **Phase 5: Database & Advanced (สัปดาห์ที่ 5+)**
```bash
✅ Database Performance Dashboard
✅ Correlation Investigation Dashboard
✅ Advanced analytics and automation
```

## 🎛️ Dashboard Navigation Strategy

### **📊 Dashboard Hierarchy:**

```
🏠 Main Overview
├── 🚀 Performance Overview (Metrics-based)
│   ├── 🏆 Top 10 Performance (Metrics-based)
│   └── 🔍 Individual Traces (Traces-based)
│
├── 🚨 Error Analysis (Metrics-based)
│   └── 🔍 Error Traces (Traces-based)
│
├── 🗄️ Database Performance (Metrics-based)
│
└── 🔗 Investigation Tools (Hybrid)
    ├── 📈 Metrics to Traces
    └── 🎯 Root Cause Analysis
```

### **🔗 Navigation Links:**

```yaml
# Cross-dashboard navigation
Performance_Overview:
  drill_down: "Top 10 Performance Dashboard"
  investigate: "Individual Trace Analysis"
  
Top_10_Performance:
  investigate: "Individual Trace Analysis Dashboard"
  context: "Error Analysis Dashboard"
  
Error_Analysis:
  investigate: "Error Traces Dashboard"
  context: "Performance Overview"

Individual_Traces:
  overview: "Performance Overview"
  correlation: "Investigation Dashboard"
```

## 📊 Key PromQL Queries Summary

### **Performance Analysis:**
```promql
# Request rate
sum(rate(http_requests_total[5m])) by (route)

# Response time 95th percentile  
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, route))

# Top 10 memory usage
topk(10, histogram_quantile(0.95, sum(rate(http_request_memory_usage_bytes_bucket[5m])) by (le, route)))

# Top 10 CPU usage
topk(10, histogram_quantile(0.95, sum(rate(http_request_cpu_time_seconds_bucket[5m])) by (le, route)))
```

### **Error Analysis:**
```promql
# Error rate percentage
(sum(rate(http_requests_total{status_code=~"4..|5.."}[5m])) by (route) / sum(rate(http_requests_total[5m])) by (route)) * 100

# Top 10 error routes
topk(10, sum(rate(http_requests_total{status_code=~"4..|5.."}[5m])) by (route))
```

### **Database Analysis:**
```promql
# DB query performance
histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket[5m])) by (le, db_command))

# Connection pool usage
db_connection_pool_usage_percent
```

## 🔍 Key TraceQL Queries Summary

### **Individual Analysis:**
```traceql
# Top slowest traces
{ span.http.route="${route}" && duration > ${min_duration} } | select(traceID, duration, span.http.method) | limit 10

# Top memory intensive traces  
{ span.http.route="${route}" && span.request.memory_usage_bytes > ${min_memory} } | select(traceID, span.request.memory_usage_bytes, duration) | limit 10

# Error traces
{ span.http.route="${route}" && (status=error || span.http.status_code >= 400) } | select(traceID, span.http.status_code, span.error.message) | limit 10
```

## 🚨 Alerting Strategy

### **Metrics-based Alerts:**
```yaml
# Performance alerts
- HighResponseTime: P95 > 2s for 5min
- HighMemoryUsage: P95 > 50MB per request  
- HighErrorRate: Error rate > 5% for 5min
- HighRequestVolume: > 100 req/s sustained

# System alerts  
- HighSystemMemory: > 80% for 10min
- HighSystemCPU: > 80% for 10min
- DatabaseSlow: DB P95 > 5s for 5min
```

### **Investigation Workflow:**
```bash
1. 🚨 Alert fires (Metrics-based)
2. 📊 Check Overview Dashboard (identify scope)
3. 🏆 Check Top 10 Dashboard (find problematic routes)
4. 🔍 Drill down to Traces (find specific issues)
5. 🎯 Root cause analysis (trace details)
6. 🚀 Fix and monitor recovery
```

## ✅ สรุปสำคัญ

### **🎯 Dashboard Strategy:**
- **Metrics**: สำหรับ aggregated analysis, trends, alerts
- **Traces**: สำหรับ individual investigation, root cause
- **Hybrid**: สำหรับ correlation และ drilling down

### **📊 Coverage:**
- ✅ **Performance**: Request rate, duration, memory, CPU
- ✅ **Quality**: Error rates, success rates  
- ✅ **Resources**: System และ per-request resources
- ✅ **Database**: Query performance, connections
- ✅ **Investigation**: Individual traces, root cause

### **🚀 Benefits:**
- **Complete Observability**: จาก high-level ถึง individual traces
- **Efficient Investigation**: จาก metrics alerts ไป traces ได้เลย
- **Performance Optimization**: รู้ว่า route ไหนควร optimize
- **Proactive Monitoring**: Catch issues ก่อนลูกค้าแจ้ง

**Result**: Observability architecture ที่สมบูรณ์ครอบคลุมทุกมิติ! 🎯