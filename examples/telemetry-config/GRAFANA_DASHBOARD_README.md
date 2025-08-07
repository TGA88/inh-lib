# Grafana Dashboard สำหรับ App-Unified Tracing

Dashboard นี้ได้ถูกสร้างขึ้นเพื่อแสดงข้อมูล telemetry ของแอป `fastify-unified-example` ที่ทำงานใน Docker container

## การเข้าถึง Dashboard

1. **URL**: http://localhost:3000/d/app-unified-traces/app-unified-tracing-dashboard
2. **Username**: admin
3. **Password**: admin

## Panels ใน Dashboard

### 1. Traces by Service (fastify-unified-example)
- แสดงการกระจายของ traces โดย service
- ใช้ Tempo datasource
- Query: `{service.name="fastify-unified-example"}`

### 2. Recent Traces (fastify-unified-example)  
- แสดงรายการ traces ล่าสุด
- สามารถคลิกเพื่อดู trace details
- ใช้ Tempo datasource

### 3. Request Rate (fastify-unified-example)
- แสดง rate ของ HTTP requests per second
- ใช้ Prometheus datasource
- Query: `rate(http_requests_total{service_name="fastify-unified-example"}[5m])`

### 4. Response Time (95th & 50th Percentile)
- แสดงเวลาตอบสนองใน percentile 95 และ 50
- ใช้ Prometheus datasource
- แสดงผลเป็น milliseconds

### 5. Error Rate (fastify-unified-example)
- แสดง rate ของ error logs
- ใช้ Loki datasource
- Query: `sum(rate({container_name="fastify-unified-app"} |= "error" [5m]))`

### 6. Recent Logs with TraceId (fastify-unified-example)
- แสดง logs ที่มี traceId
- ใช้ Loki datasource
- Query: `{container_name="fastify-unified-app"} | json | traceId != ""`

### 7. Trace Search (fastify-unified-example)
- ช่วยในการค้นหา traces
- ใช้ Tempo datasource
- สามารถ filter ตาม service name

## การใช้งาน

### เพื่อสร้าง Traces และ Logs ใหม่:

```bash
# Health check endpoint
curl http://localhost:3001/health

# API endpoints (จะมี error แต่ยังสร้าง traces)
curl http://localhost:3001/api/users
curl http://localhost:3001/api/users/123
```

### Datasources ที่ใช้:

1. **Tempo** (http://tempo:3200)
   - เก็บ distributed traces
   - Service name: `fastify-unified-example`

2. **Loki** (http://loki:3100)
   - เก็บ logs
   - Container name: `fastify-unified-app`

3. **Prometheus** (http://prometheus:9090)
   - เก็บ metrics
   - Service name: `fastify-unified-example`

## หมายเหตุ

- Traces จะแสดงทันทีใน Tempo
- Logs จะถูกส่งผ่าน Docker logs และ Promtail เข้า Loki
- Metrics ยังไม่มีการ export จากแอปเลย (จึงอาจไม่แสดงข้อมูลใน Request Rate และ Response Time panels)
- Dashboard จะ refresh ทุก 5 วินาที

## การ Troubleshooting

1. **ไม่มีข้อมูลใน Traces panels**:
   - ตรวจสอบว่า Tempo service ทำงานอยู่: `docker ps | grep tempo`
   - ตรวจสอบ traces ใน Tempo API: `curl "http://localhost:3200/api/search"`

2. **ไม่มีข้อมูลใน Logs panels**:
   - ตรวจสอบว่า Loki service ทำงานอยู่: `docker ps | grep loki`
   - ตรวจสอบ logs ใน Loki API: `curl "http://localhost:3100/loki/api/v1/labels"`

3. **ไม่มีข้อมูลใน Metrics panels**:
   - ตรวจสอบว่า Prometheus service ทำงานอยู่: `docker ps | grep prometheus`
   - ตรวจสอบว่าแอปมีการ export metrics หรือไม่: `curl "http://localhost:3001/metrics"`

## Time Range

Dashboard ตั้งค่าให้แสดงข้อมูลในช่วงเวลา 1 ชั่วโมงที่ผ่านมา (`now-1h` to `now`)
สามารถปรับเปลี่ยนได้จาก time picker ใน Grafana UI
