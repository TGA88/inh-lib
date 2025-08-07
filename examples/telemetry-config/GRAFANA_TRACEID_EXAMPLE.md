# 🎯 ตัวอย่างการใช้งาน TraceID Search ใน Grafana

## ✅ ทดสอบสำเร็จแล้ว!

### TraceID ที่ทดสอบ: `bd2f49a5691f1fb6c84116387a54b5b6`

## 🔍 LogQL Queries ที่ใช้ได้จริง:

### 1. Search ด้วย TraceID (Text Search):
```logql
{job="docker-direct"} |= "bd2f49a5691f1fb6c84116387a54b5b6"
```
**ผลลัพธ์**: ✅ พบ logs

### 2. Search Logs ที่มี TraceID ทั้งหมด:
```logql
{job="docker-direct"} |= "traceId"
```
**ผลลัพธ์**: ✅ พบ logs ของแอปและ Loki

### 3. Filter เฉพาะ Application Logs:
```logql
{job="docker-direct"} |= "traceId" != "component=frontend"
```

### 4. JSON Parsing (สำหรับ structured logs):
```logql
{job="docker-direct"} | json | traceId = "bd2f49a5691f1fb6c84116387a54b5b6"
```

## 🚀 วิธีใช้ใน Grafana:

### 1. เปิด Grafana Explore:
```
http://localhost:3000/explore
```

### 2. เลือก Loki Datasource

### 3. ใส่ Query:
```logql
{job="docker-direct"} |= "YOUR_TRACE_ID_HERE"
```

### 4. ตัวอย่างที่ทำงานได้:
```logql
{job="docker-direct"} |= "bd2f49a5691f1fb6c84116387a54b5b6"
```

## 📋 Step-by-Step การ Debug:

### 1. หา TraceID จาก Tempo:
```bash
curl "http://localhost:3200/api/search" | jq -r '.traces[0].traceID'
```
**ตัวอย่างผลลัพธ์**: `f4e066f557d61e8ed7d32ee9a235fc44`

### 2. ใช้ TraceID ใน Grafana:
```logql
{job="docker-direct"} |= "f4e066f557d61e8ed7d32ee9a235fc44"
```

### 3. ดู Logs Context:
```logql
{job="docker-direct"} |= "traceId" | line_format "{{.log}}"
```

## 🎨 การ Format Output:

### Simple Format:
```logql
{job="docker-direct"} |= "traceId" | json | line_format "{{.message}}"
```

### Detailed Format:
```logql
{job="docker-direct"} 
|= "traceId" 
| json 
| line_format "{{.timestamp}} [{{.level}}] {{.message}} | trace={{.traceId}}"
```

## 🔧 Queries สำหรับ Dashboard:

### Panel: "Logs by TraceID"
```logql
{job="docker-direct"} | json | traceId != "" | line_format "{{.timestamp}} [{{.level}}] {{.message}} | traceId={{.traceId}} spanId={{.spanId}}"
```

### Panel: "Search Logs"
```logql
{job="docker-direct"} |= "${trace_id}"
```
*หมายเหตุ: ต้องสร้าง Variable `trace_id` ใน Dashboard*

## 💡 Tips:

### 1. ใช้ Time Range ที่เหมาะสม:
- Last 15 minutes สำหรับ real-time debugging
- Last 1 hour สำหรับ historical analysis

### 2. Combine Filters:
```logql
{job="docker-direct"} |= "traceId" |= "error"
```

### 3. ใช้ Regex สำหรับ Partial Match:
```logql
{job="docker-direct"} |~ "traceId.*bd2f49a5"
```

## 📊 ตัวอย่าง Output:

### Application Log ที่พบ:
```
  traceId: 'bd2f49a5691f1fb6c84116387a54b5b6',
```

### Loki Query Result:
```json
{
  "log": "  traceId: 'bd2f49a5691f1fb6c84116387a54b5b6',",
  "stream": "stdout",
  "time": "2025-08-07T14:35:58.123456789Z"
}
```

## ✅ สรุป:

**ใช่ครับ! ใน Grafana สามารถ search log messages ด้วย traceId ได้อย่างสมบูรณ์**

### วิธีที่ดีที่สุด:
1. **Text Search**: `{job="docker-direct"} |= "your-trace-id"`
2. **JSON Parsing**: `{job="docker-direct"} | json | traceId = "your-trace-id"`
3. **Pattern Matching**: `{job="docker-direct"} |~ "traceId.*partial-id"`

### ประโยชน์:
- ไม่ต้องใช้ traceId เป็น label (หลีกเลี่ยง high cardinality)
- Search ได้เร็ว
- Support partial matching
- ใช้ได้กับ structured และ plain text logs

**พร้อมใช้งานแล้ว!** 🎉
