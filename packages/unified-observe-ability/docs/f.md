Factory => สำหรับ สร้าง Provider สำหรับ metrics,tracer,logger
Provider => สำหรับสร้าง context
Context => สำหรับ จัดการ Corrlelationid ระหว่่าง tracer กับ logger 


ต้องการแบ่ง Package ดังนี้

- @inh-lib/unified-observe-ability-core => สำหรับเก็บ type ของ unified-metrics,unified-tracer,unifed-logger แชร์ระหว่าง @inh-lib/unifield-util-otel กับ @inh-lib/unified-observe-ability

- @inh-lib/unifield-util-otel => สำหรับเก็บ type , factory,adapter ที่แปลงเป็น type ที่อยู่ใน @inh-lib/unified-observe-ability-core

- @inhl-lib/unified-observe-ability => เป็น package สำหรับสร้าง provider และ context โดยใช้ type จาก @inh-lib/unified-observe-ability-core

- project api-service คือ entry point ที่จะ compose  unified-observe-ability เข้า กับ web-framework ที่เราใช้งาน เช่น fastify,hono  และ insturment เข้ากับ component ต่างๆ เช่น httpClient,db-client เพื้อ เก็บ metrics,trace,log