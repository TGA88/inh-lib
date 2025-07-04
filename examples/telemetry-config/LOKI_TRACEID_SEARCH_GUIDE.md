# วิธี Search Logs ด้วย traceId ใน Loki (ไม่ใช้ Label)

## ⚡ สำคัญ: เหตุผลที่ไม่ใช้ traceId เป็น Label

### ❌ ปัญหาของ High Cardinality:
- **traceId**: มีค่าเฉพาะ (unique) ในทุก request
- **spanId**: มีค่าเฉพาะในทุก span
- **Cardinality**: สูงมาก → ส่งผลต่อ performance Loki
- **Memory usage**: เพิ่มขึ้นอย่างรวดเร็ว
- **Query performance**: ช้าลง

### ✅ วิธีแก้: ใช้ JSON Parsing แทน Labels

## 🔍 วิธี Search Logs ด้วย traceId

### 1. **Basic Search**
```logql
# หา logs ที่มี traceId เฉพาะ
{job="docker-direct"} | json | traceId="your-trace-id-here"
```

### 2. **Search with Pattern**
```logql
# หา logs ที่มี traceId ขึ้นต้นด้วย
{job="docker-direct"} | json | traceId =~ "3ff5c08c.*"
```

### 3. **Search Multiple TraceIDs**
```logql
# หา logs จากหลาย traceId
{job="docker-direct"} | json | traceId =~ "(trace-id-1|trace-id-2|trace-id-3)"
```

### 4. **Search by Service + TraceID**
```logql
# กรองตาม service และ traceId
{job="docker-direct"} | json | service="fastify-telemetry-example" | traceId="your-trace-id"
```

### 5. **Search by SpanID**
```logql
# หา logs ด้วย spanId
{job="docker-direct"} | json | spanId="your-span-id"
```

## 📊 Grafana Dashboard Queries

### Panel: "Logs by TraceID"
```logql
# แสดง logs พร้อม format ที่อ่านง่าย
{job="docker-direct"} 
| json 
| traceId != "" 
| line_format "{{.timestamp}} [{{.level}}] {{.message}} | traceId={{.traceId}} spanId={{.spanId}}"
```

### Panel: "Search Specific TraceID"
```logql
# Variable: $traceId
{job="docker-direct"} 
| json 
| traceId="${traceId}"
| line_format "{{.timestamp}} [{{.level}}] {{.service}} | {{.method}} {{.url}} | {{.message}}"
```

### Panel: "Error Logs with TraceID"
```logql
# หา error logs ที่มี traceId
{job="docker-direct"} 
| json 
| level="error" 
| traceId != ""
| line_format "ERROR [{{.traceId}}] {{.message}}"
```

## 🔧 Practical Examples

### ตัวอย่าง 1: หา Logs ของ Request เฉพาะ
```bash
# 1. เรียก API เพื่อสร้าง trace
curl http://localhost:3001/health

# 2. Get traceId จาก Tempo API
curl "http://localhost:3200/api/search" | jq '.traces[0].traceID'

# 3. Search logs ใน Loki
curl -G "http://localhost:3100/loki/api/v1/query_range" \
  --data-urlencode 'query={job="docker-direct"} | json | traceId="your-trace-id"' \
  --data-urlencode "start=$(date -d '1 hour ago' +%s)000000000" \
  --data-urlencode "end=$(date +%s)000000000"
```

### ตัวอย่าง 2: Timeline ของ Trace
```logql
# เรียงลำดับ logs ตาม timestamp สำหรับ trace เฉพาะ
{job="docker-direct"} 
| json 
| traceId="your-trace-id" 
| line_format "{{.timestamp}} | {{.service}} | {{.method}} {{.url}} | {{.message}}"
```

### ตัวอย่าง 3: Find Related Spans
```logql
# หา spans ทั้งหมดที่เกี่ยวข้องกับ trace
{job="docker-direct"} 
| json 
| traceId="your-trace-id"
| spanId != ""
| line_format "Span: {{.spanId}} | {{.message}}"
```

## 🎯 Grafana Variable สำหรับ TraceID

### 1. สร้าง Variable
- **Name**: `traceId`
- **Type**: `Textbox`
- **Default**: `(empty)`

### 2. ใช้ใน Query
```logql
{job="docker-direct"} | json | traceId="${traceId}"
```

### 3. Dropdown จาก Recent Traces
```logql
# Variable Query เพื่อดึง traceId ล่าสุด
label_values({job="docker-direct"} | json | traceId != "", traceId)
```

## 🚀 Advanced Search Patterns

### 1. **Request Flow Tracking**
```logql
# ติดตาม request ทั้งหมดจาก traceId
{job="docker-direct"} 
| json 
| traceId="your-trace-id"
| line_format "{{.timestamp}} | {{.method}} {{.url}} → {{.statusCode}} ({{.duration}}ms)"
```

### 2. **Error Investigation**
```logql
# หา errors ที่เกี่ยวข้องกับ trace
{job="docker-direct"} 
| json 
| traceId="your-trace-id"
| level =~ "(error|ERROR|Error)"
| line_format "ERROR: {{.message}} | {{.stackTrace}}"
```

### 3. **Performance Analysis**
```logql
# วิเคราะห์ performance ด้วย traceId
{job="docker-direct"} 
| json 
| traceId="your-trace-id" 
| duration != ""
| line_format "{{.method}} {{.url}} took {{.duration}}ms"
```

## 📈 Benefits ของ Approach นี้

### ✅ ข้อดี:
1. **Low Cardinality**: ไม่กระทบ Loki performance
2. **Flexible Search**: ใช้ regex patterns ได้
3. **Fast Queries**: เร็วกว่าการใช้ high-cardinality labels
4. **Memory Efficient**: ใช้ memory น้อยกว่า
5. **Scalable**: รองรับ high-volume logs

### ⚠️ ข้อควรระวัง:
1. **JSON Parsing Cost**: ต้อง parse JSON ในเวลา query
2. **Index Efficiency**: ช้ากว่า label-based queries เล็กน้อย
3. **Complex Queries**: syntax ซับซ้อนกว่า

## 🎯 Best Practices

1. **ใช้ Labels สำหรับ Low Cardinality**: service, level, method
2. **ใช้ JSON Parsing สำหรับ High Cardinality**: traceId, spanId, requestId
3. **Combine ทั้งสอง**: `{service="app"} | json | traceId="xxx"`
4. **Index Strategy**: เลือก labels ที่ใช้บ่อยสุดสำหรับ filtering
5. **Time Range**: ใช้ time range ที่แคบเพื่อประสิทธิภาพดีขึ้น

## สรุป:
**ไม่ต้องใช้ traceId เป็น label แต่ยังคงสามารถ search ได้อย่างมีประสิทธิภาพผ่าน JSON parsing!** 🎉
