# วิธี Search Logs ด้วย TraceID ใน Grafana

## 🎯 วิธีการ Search ด้วย TraceID

### 1. การใช้ LogQL Filters ใน Grafana Explore

#### Basic Search:
```logql
{job="docker-direct"} | json | traceId="your-trace-id-here"
```

#### Advanced Search with Formatting:
```logql
{job="docker-direct"} 
| json 
| traceId="b2c6befdf7a7e21410b398abb175ccac" 
| line_format "{{.timestamp}} [{{.level}}] {{.message}} | traceId={{.traceId}} spanId={{.spanId}}"
```

#### Search by TraceID Pattern:
```logql
{job="docker-direct"} | json | traceId =~ "b2c6.*"
```

### 2. การใช้ Text Search (Line Contains):
```logql
{job="docker-direct"} |= "b2c6befdf7a7e21410b398abb175ccac"
```

### 3. การใช้ JSON Parsing + Filter:
```logql
{job="docker-direct"} 
| json 
| traceId != "" 
| traceId = "b2c6befdf7a7e21410b398abb175ccac"
```

## 🚀 วิธีใช้ใน Grafana Dashboard

### 1. เข้า Grafana Explore:
- URL: http://localhost:3000/explore
- เลือก Loki datasource

### 2. ใส่ Query:
```logql
{job="docker-direct"} | json | traceId="YOUR_TRACE_ID"
```

### 3. ใน Dashboard Panel:
```logql
{job="docker-direct"} 
| json 
| traceId != "" 
| line_format "{{.timestamp}} [{{.level}}] {{.message}} | trace={{.traceId}}"
```

## 📊 Dashboard Variables (แนะนำ)

### สร้าง Variable สำหรับ TraceID:
1. Dashboard Settings → Variables → Add Variable
2. Name: `trace_id`
3. Type: `Textbox`
4. Label: `Trace ID`

### ใช้ Variable ใน Query:
```logql
{job="docker-direct"} | json | traceId="${trace_id}"
```

## 🔍 ตัวอย่าง Queries ที่มีประโยชน์

### 1. หา Logs ทั้งหมดของ Trace:
```logql
{job="docker-direct"} | json | traceId="b2c6befdf7a7e21410b398abb175ccac"
```

### 2. หา Error Logs ใน Trace:
```logql
{job="docker-direct"} 
| json 
| traceId="b2c6befdf7a7e21410b398abb175ccac" 
| level="error"
```

### 3. หา Logs ทั้งหมดที่มี TraceID:
```logql
{job="docker-direct"} | json | traceId != ""
```

### 4. หา Logs ด้วย Span ID:
```logql
{job="docker-direct"} | json | spanId="a27c31df7f1fd866"
```

### 5. หา HTTP Request Logs:
```logql
{job="docker-direct"} 
| json 
| traceId="b2c6befdf7a7e21410b398abb175ccac" 
| method != ""
```

## 🎨 การ Format ผลลัพธ์

### Simple Format:
```logql
{job="docker-direct"} 
| json 
| traceId="your-trace-id" 
| line_format "{{.message}}"
```

### Detailed Format:
```logql
{job="docker-direct"} 
| json 
| traceId="your-trace-id" 
| line_format "{{.timestamp}} [{{.level}}] {{.service}}: {{.message}} (trace={{.traceId}}, span={{.spanId}})"
```

### JSON Format:
```logql
{job="docker-direct"} 
| json 
| traceId="your-trace-id" 
| line_format "{{toJSON .}}"
```

## 🔧 การหา TraceID จาก Tempo

### 1. จาก Tempo API:
```bash
curl "http://localhost:3200/api/search" | jq '.traces[0].traceID'
```

### 2. จาก Grafana Tempo Datasource:
- Explore → เลือก Tempo
- ใส่ query: `{service.name="fastify-unified-example"}`
- คลิกที่ trace เพื่อดู traceID

### 3. จาก Application Logs:
```logql
{job="docker-direct"} | json | traceId != "" | head 10
```

## 📋 Step-by-Step Guide

### สำหรับการ Debug Trace:

1. **หา TraceID จาก Error:**
```logql
{job="docker-direct"} | json | level="error" | traceId != ""
```

2. **ใช้ TraceID เพื่อหา Context ทั้งหมด:**
```logql
{job="docker-direct"} | json | traceId="FOUND_TRACE_ID"
```

3. **ดู Timeline ของ Trace:**
```logql
{job="docker-direct"} 
| json 
| traceId="FOUND_TRACE_ID" 
| line_format "{{.timestamp}} {{.spanId}} {{.message}}"
```

## 💡 Tips & Best Practices

### 1. ใช้ Time Range:
- เลือก time range ที่เหมาะสม (เช่น last 1 hour)
- TraceID มักจะอยู่ในช่วงเวลาสั้นๆ

### 2. ใช้ Regex สำหรับ Partial Search:
```logql
{job="docker-direct"} | json | traceId =~ "b2c6.*"
```

### 3. Combine กับ Service Filter:
```logql
{job="docker-direct"} | json | service="fastify-unified-example" | traceId="your-trace-id"
```

### 4. Export Results:
- ใน Grafana สามารถ export logs เป็น CSV
- หรือใช้ API: `curl "http://localhost:3100/loki/api/v1/query_range?query=..."`

## สรุป:
✅ **ใช่ครับ! ใน Grafana สามารถ search log messages ด้วย traceId ได้** โดยใช้:
- LogQL JSON parsing: `| json | traceId="your-id"`
- Text search: `|= "your-trace-id"`
- Pattern matching: `| traceId =~ "pattern"`

**ไม่จำเป็นต้องมี traceId เป็น label เพราะสามารถ search ใน message content ได้!** 🎯
