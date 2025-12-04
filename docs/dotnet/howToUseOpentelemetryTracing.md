

ยินดีด้วยครับ! การใช้ OpenTelemetry (OTel) กับ .NET แล้วส่งข้อมูล Trace ไปเก็บแสดงผลที่ Grafana Tempo เป็นการผสมผสานเทคโนโลยีที่ยอดเยี่ยมสำหรับการตรวจสอบและแก้ไขปัญหาในแอปพลิเคชัน (Observability) ครับ

ผมจะแนะนำขั้นตอนทั้งหมดตั้งแต่เริ่มต้นจนเห็นผลลัพธ์ใน Grafana กันเลยครับ ทำตามนี้ได้เลย

---

### **ภาพรวมขั้นตอน**

1.  **เตรียมสภาพแวดล้อม (Backend):** ติดตั้ง Grafana และ Tempo ด้วย Docker Compose
2.  **สร้างโปรเจค .NET:** สร้างโปรเจクト Web API ง่ายๆ ขึ้นมา
3.  **ติดตั้ง Package:** เพิ่ม NuGet packages ของ OpenTelemetry ที่จำเป็น
4.  **Config OpenTelemetry:** ตั้งค่าให้ .NET แอปพลิเคชันส่งข้อมูล Trace ไปยัง Tempo
5.  **เพิ่ม Manual Tracing (Optional แต่แนะนำ):** สร้าง Trace ของเราเองเพื่อติดตามตรรกะทางธุรกิจ
6.  **รันและตรวจสอบผล:** ดู Trace ที่ปรากฏใน Grafana

---

### **Step 1: เตรียม Grafana และ Tempo ด้วย Docker Compose**

นี่คือวิธีที่ง่ายที่สุดในการเริ่มต้น สร้างไฟล์ชื่อ `docker-compose.yml` ในโฟลเดอร์ว่างๆ แล้ววางโค้ดนี้ลงไปครับ

```yaml
# docker-compose.yml
version: "3.7"

services:
  # Grafana Tempo - สำหรับเก็บและค้นหา Trace
  tempo:
    image: grafana/tempo:latest
    command:
      - "-storage.trace.backend=local" # ใช้ local storage
      - "-storage.trace.local.path=/tmp/tempo" # พื้นที่เก็บข้อมูล
      - "-auth.enabled=false" # ปิด auth เพื่อความสะดวก
      - "-server.http-listen-port=3200"
    ports:
      - "3200:3200" # Port สำหรับ UI ของ Tempo (ไม่ได้ใช้ใน guide นี้ แต่มีไว้ดีกว่า)
      - "4317:4317" # OTLP gRPC receiver
      - "4318:4318" # OTLP HTTP receiver <-- .NET จะส่งมาที่นี่
    volumes:
      - ./tempo-data:/tmp/tempo

  # Grafana - สำหรับแสดงผลข้อมูลจาก Tempo
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin # รหัสผ่านสำหรับเข้าใช้งาน
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning # สำหรับตั้งค่า Datasource อัตโนมัติ
```

**สร้างโฟลเดอร์และไฟล์สำหรับ Provisioning Grafana:**

สร้างโฟลเดอร์ `grafana/provisioning/datasources` และภายในโฟลเดอร์นั้น ให้สร้างไฟล์ `datasource.yml` แล้วใส่เนื้อหานี้:

```yaml
# grafana/provisioning/datasources/datasource.yml
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    isDefault: true
```

**รัน Docker:**

เปิด Terminal หรือ Command Prompt ในโฟลเดอร์ที่เก็บ `docker-compose.yml` แล้วรันคำสั่ง:

```bash
docker-compose up -d
```

ตอนนี้คุณมี Grafana ที่ `http://localhost:3000` (user: `admin`, pass: `admin`) และ Tempo ที่พร้อมรับข้อมูลแล้วครับ

---

### **Step 2 & 3: สร้างโปรเจค .NET และติดตั้ง Package**

1.  เปิด Terminal แล้วสร้างโปรเจค Web API ใหม่:

    ```bash
    dotnet new webapi -n OtelTempoDemo
    cd OtelTempoDemo
    ```

2.  ติดตั้ง NuGet packages ที่จำเป็นสำหรับ OpenTelemetry:

    ```bash
    dotnet add package OpenTelemetry
    dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
    dotnet add package OpenTelemetry.Instrumentation.AspNetCore
    dotnet add package OpenTelemetry.Instrumentation.Http
    ```

---

### **Step 4: Config OpenTelemetry ใน .NET**

นี่คือส่วนสำคัญที่สุดครับ เปิดไฟล์ `Program.cs` และแก้ไขโค้ดให้เป็นดังนี้:

```csharp
using OpenTelemetry;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

var builder = WebApplication.CreateBuilder(args);

// กำหนดชื่อของ Service ของเรา
var serviceName = "OtelTempoDemo";

// เพิ่ม OpenTelemetry ใน Dependency Injection
builder.Services.AddOpenTelemetry()
    .ConfigureResource(resource => resource
        .AddService(serviceName)) // เพิ่ม attribute service.name ให้กับทุกๆ Span
    .WithTracing(builder => builder
        .AddSource(serviceName) // กำหนดชื่อสำหรับ Manual Instrumentation
        .AddAspNetCoreInstrumentation() // เก็บ Trace จาก HTTP Request/Response อัตโนมัติ
        .AddHttpClientInstrumentation() // เก็บ Trace จาก HttpClient ที่เรียกออกไปข้างนอกอัตโนมัติ
        .AddOtlpExporter(options => 
        {
            // กำหนด Endpoint ของ Tempo (OTLP HTTP Receiver)
            options.Endpoint = new Uri("http://localhost:4318");
        }));

// Add services to the container.
builder.Services.AddControllers();
// ... (ส่วนอื่นๆ ที่ Visual Studio สร้างให้) ...

var app = builder.Build();

// ... (ส่วนอื่นๆ ที่ Visual Studio สร้างให้) ...

app.UseAuthorization();
app.MapControllers();
app.Run();
```

**คำอธิบายโค้ด:**

*   `AddService(serviceName)`: ทำให้ทุก Trace ที่ส่งไปจะมีข้อมูล `service.name="OtelTempoDemo"` แนบไปด้วย ซึ่งจะช่วยให้เรากรองหา Service นี้ใน Grafana ได้ง่ายขึ้น
*   `AddAspNetCoreInstrumentation()`: เป็น "Automatic Instrumentation" ที่จะสร้าง Span หลัก (Root Span) ให้ทุกครั้งที่มี HTTP Request เข้ามาที่ API ของเรา เช่น `GET /weatherforecast`
*   `AddHttpClientInstrumentation()`: ถ้า API ของเราเรียกใช้งาน API ภายนอกด้วย `HttpClient`, มันจะสร้าง Span ลูก (Child Span) ให้โดยอัตโนมัติ
*   `AddOtlpExporter()`: ส่วนนี้จะบอกให้ OpenTelemetry ส่งข้อมูล Trace ที่เก็บได้ไปยัง Endpoint ของ Tempo ผ่าน OTLP Protocol ตรงๆ

---

### **Step 5: เพิ่ม Manual Tracing (แนะนำอย่างยิ่ง)**

Automatic Instrumentation ดีมาก แต่บ่อยครั้งเราอยากจะติดตามตรรกะภายในฟังก์ชันของเราเอง เราสามารถสร้าง "Manual Span" ได้ครับ

เปิดไฟล์ Controller ใดๆ ก็ได้ เช่น `Controllers/WeatherForecastController.cs` แล้วแก้ไข:

```csharp
using Microsoft.AspNetCore.Mvc;
using OpenTelemetry.Trace; // เพิ่ม using นี้เข้ามา

namespace OtelTempoDemo.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class WeatherForecastController : ControllerBase
    {
        private static readonly string[] Summaries = new[]
        {
            "Freezing", "Bracing", "Chilly", "Cool", "Mild", "Warm", "Balmy", "Hot", "Sweltering", "Scorching"
        };

        private readonly ILogger<WeatherForecastController> _logger;
        private static readonly ActivitySource MyActivitySource = new ActivitySource("OtelTempoDemo"); // สร้าง ActivitySource ตรงกับที่กำหนดใน Program.cs

        public WeatherForecastController(ILogger<WeatherForecastController> logger)
        {
            _logger = logger;
        }

        [HttpGet(Name = "GetWeatherForecast")]
        public IEnumerable<WeatherForecast> Get()
        {
            // เริ่มต้นสร้าง Manual Span ชื่อ "Calculate-Weather"
            using (var activity = MyActivitySource.StartActivity("Calculate-Weather"))
            {
                // เพิ่มข้อมูล (Tags/Attributes) ให้กับ Span
                activity?.SetTag("custom.operation", "forecast-calculation");
                activity?.SetTag("custom.user", "somchai");

                // จำลองการทำงานบางอย่างที่ใช้เวลา
                Thread.Sleep(100); 

                _logger.LogInformation("Calculating weather forecast...");

                var forecast = Enumerable.Range(1, 5).Select(index => new WeatherForecast
                {
                    Date = DateOnly.FromDateTime(DateTime.Now.AddDays(index)),
                    TemperatureC = Random.Shared.Next(-20, 55),
                    Summary = Summaries[Random.Shared.Next(Summaries.Length)]
                })
                .ToArray();

                // เพิ่มข้อมูลลงใน Span ก่อนจบ
                activity?.SetStatus(ActivityStatusCode.Ok);

                return forecast;
            }
        }
    }
}
```

**คำอธิบาย:**

*   `ActivitySource MyActivitySource`: ใช้สร้าง Activity (Span) ครับ ชื่อต้องตรงกับที่ `.AddSource()` ใน `Program.cs`
*   `StartActivity("Calculate-Weather")`: สร้าง Span ใหม่ขึ้นมา มันจะเป็นลูกของ Span ที่ `AddAspNetCoreInstrumentation` สร้างไว้โดยอัตโนมัติ
*   `activity?.SetTag()`: เพิ่มข้อมูลเชิงคีย์-แวลู (Key-Value) ให้กับ Span ซึ่งจะช่วยให้เราค้นหาและกรองข้อมูลใน Grafana ได้ดีขึ้น
*   `using (...)`: การใช้ `using` จะจบ Span โดยอัตโนมัติเมื่อออกจากบล็อคคำสั่ง

---

### **Step 6: รันและตรวจสอบผลใน Grafana**

1.  **รัน .NET App:**

    ```bash
    dotnet run
    ```
    จะได้ Port สำหรับเข้าใช้งาน API เช่น `http://localhost:5xxx`

2.  **สร้าง Trace:** เปิด Browser หรือใช้ `curl` เรียกไปที่ Endpoint ของเรา:

    ```bash
    curl http://localhost:5xxx/weatherforecast
    ```
    ลองเรียกซ้ำๆ 2-3 ครั้งเพื่อให้มีข้อมูลเยอะๆ หน่อย

3.  **ดูผลใน Grafana:**
    *   เปิด Browser ไปที่ `http://localhost:3000`
    *   Login ด้วย `admin` / `admin`
    *   ไปที่เมนู **Explore** (ทางซ้ายมือ)
    *   ตรงช่อง "Select data source" ให้เลือก **Tempo**
    *   ในช่องค้นหา (Query) ลองพิมพ์: `{service.name="OtelTempoDemo"}` แล้วกด Enter หรือคลิก `Run query`
    *   คุณจะเห็นรายการ Trace ที่ถูกส่งมา ให้คลิกที่ Trace ID ตัวใดตัวหนึ่ง

**หน้าตาที่คุณจะเห็นใน Grafana:**

คุณจะเห็นแผนภูมิแนวนอน (Gantt Chart) ที่แสดง Span ต่างๆ

*   **Span แรก (Root Span):** จะชื่อ `GET /weatherforecast` (จาก `AspNetCoreInstrumentation`)
*   **Span ลูก:** จะชื่อ `Calculate-Weather` (ที่เราสร้างเอง) และมันจะซ้อนอยู่ภายใน Span แรก
*   ถ้าคลิกที่ Span `Calculate-Weather` คุณจะเห็น **Tags** ที่เราเพิ่มไป เช่น `custom.operation`, `custom.user`




---

### **สรุปและขั้นตอนถัดไป**

*   คุณได้ติดตั้ง OpenTelemetry ใน .NET สำเร็จแล้ว!
*   คุณสามารถใช้ Automatic Instrumentation เพื่อจับ Trace จาก HTTP และ HttpClient ได้ทันที
*   คุณสามารถใช้ Manual Instrumentation (`ActivitySource`) เพื่อติดตามตรรกะทางธุรกิจเฉพาะของคุณได้
*   ข้อมูล Trace ทั้งหมดถูกส่งไปยัง Grafana Tempo และแสดงผลได้อย่างสวยงาม

**Best Practice ถัดไป:**

*   **ใช้ Environment Variables:** แทนที่จะ hardcode `Endpoint` และ `ServiceName` ใน `Program.cs` ควรใช้ Environment Variables เช่น `OTEL_EXPORTER_OTLP_ENDPOINT` และ `OTEL_SERVICE_NAME` ซึ่ง OpenTelemetry รองรับโดย default แล้ว ทำให้จัดการคอนฟิกใน Production ง่ายขึ้น
*   **เพิ่ม Baggage:** ใช้สำหรับส่งข้อมูลข้าม Service (Context Propagation)
*   **ศึกษา Metrics และ Logs:** OpenTelemetry ไม่ได้มีแค่ Tracing นะครับ แต่ยังมี Metrics และ Logs ด้วย ซึ่งสามารถส่งไปแสดงผลใน Grafana (ผ่าน Prometheus) ได้เช่นกัน

หวังว่าคู่มือนี้จะเป็นประโยชน์นะครับ! ลองทำตามดูแล้วจะติดใจครับ