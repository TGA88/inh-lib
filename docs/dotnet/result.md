เราจะสร้างระบบนี้ขึ้นมา 3 ส่วนหลักๆ

1. Result Type & Base ROP Extensions: โครงสร้างพื้นฐานของ Railway-Oriented Programming
2. Tracing Infrastructure: ตัวเชื่อมต่อกับ OpenTelemetry
3. Instrumented ROP Extensions: ส่วนที่ "ใส่เวทมนตร์" ให้ Pipeline ทำ Tracing อัตโนมัติ

---

ส่วนที่ 1: Result Type & Base ROP Extensions
นี่คือหัวใจของ ROP เราจะสร้างไว้ในโปรเจกต์ YourCompanyName.Application.Abstractions

ไฟล์: Primitives/Result.cs

```
// YourCompanyName.Application.Abstractions/Primitives/Result.cs

namespace YourCompanyName.Application.Abstractions.Primitives;

public class Result
{
    public bool IsSuccess { get; }
    public bool IsFailure => !IsSuccess;
    public string Error { get; }

    protected Result(bool isSuccess, string error)
    {
        if (isSuccess && error != string.Empty)
            throw new InvalidOperationException();
        if (!isSuccess && error == string.Empty)
            throw new InvalidOperationException();

        IsSuccess = isSuccess;
        Error = error;
    }

    public static Result Success() => new(true, string.Empty);
    public static Result Failure(string error) => new(false, error);
}

public class Result<T> : Result
{
    public T Value { get; }

    protected Result(T value, bool isSuccess, string error) : base(isSuccess, error)
    {
        Value = value;
    }

    public static Result<T> Success(T value) => new(value, true, string.Empty);
    public static new Result<T> Failure(string error) => new(default(T)!, false, error);
    
    // Implicit conversion for ease of use
    public static implicit operator Result<T>(Result result) =>
        result.IsSuccess ? Success(default(T)!) : Failure(result.Error);
}
```
---

ไฟล์: Primitives/ResultExtensions.cs (เวอร์ชันพื้นฐาน ยังไม่มี Tracing)

```
// YourCompanyName.Application.Abstractions/Primitives/ResultExtensions.cs

namespace YourCompanyName.Application.Abstractions.Primitives;

public static class ResultExtensions
{
    public static Result<TOut> Map<TIn, TOut>(this Result<TIn> result, Func<TIn, TOut> func) =>
        result.IsSuccess ? Result<TOut>.Success(func(result.Value)) : Result<TOut>.Failure(result.Error);

    public static async Task<Result<TOut>> MapAsync<TIn, TOut>(this Result<TIn> result, Func<TIn, Task<TOut>> func) =>
        result.IsSuccess ? Result<TOut>.Success(await func(result.Value)) : Result<TOut>.Failure(result.Error);

    public static async Task<Result> ThenAsync<T>(this Result<T> result, Func<T, Task<Result>> func) =>
        result.IsSuccess ? await func(result.Value) : Result.Failure(result.Error);

    public static Result Then<T>(this Result<T> result, Func<T, Result> func) =>
        result.IsSuccess ? func(result.Value) : Result.Failure(result.Error);
    
    public static async Task<Result> TapAsync<T>(this Result<T> result, Func<T, Task> func)
    {
        if (result.IsSuccess) await func(result.Value);
        return result;
    }
}
```
---
ส่วนที่ 2: Tracing Infrastructure
ส่วนนี้เป็นตัวกลางที่จะพูดคุยกับ OpenTelemetry

ไฟล์: Tracing/ActivitySourceProvider.cs

```
// YourCompanyName.Application.Abstractions/Tracing/ActivitySourceProvider.cs

using System.Diagnostics;

namespace YourCompanyName.Application.Abstractions.Tracing;

/// <summary>
/// Centralized provider for OpenTelemetry ActivitySource.
/// This should be registered in your OpenTelemetry configuration.
/// </summary>
public static class ActivitySourceProvider
{
    public static readonly ActivitySource Source = new("MyProject.Application");
}
```
---
ส่วนที่ 3: Instrumented ROP Extensions (ส่วนสำคัญที่สุด!)
นี่คือไฟล์ที่จะทำให้ชีวิตคุณง่ายขึ้น มันจะ Override พฤติกรรมของ ROP ให้ทำ Tracing ให้เราโดยอัตโนมัติ

ไฟล์: Tracing/InstrumentedResultExtensions.cs

```
// YourCompanyName.Application.Abstractions/Tracing/InstrumentedResultExtensions.cs

using System.Diagnostics;
using System.Runtime.CompilerServices;
using YourCompanyName.Application.Abstractions.Primitives;

namespace YourCompanyName.Application.Abstractions.Tracing;

/// <summary>
/// Extension methods for Result that automatically create OpenTelemetry Spans.
/// Use these methods in your Application Layer handlers to get automatic tracing.
/// </summary>
public static class InstrumentedResultExtensions
{
    private static string GetOperationName(string? expression)
    {
        if (string.IsNullOrWhiteSpace(expression)) return "Operation";
        
        // Example: "order => _stockService.CheckAndReserveStockAsync(order)"
        // Becomes: "CheckAndReserveStockAsync"
        var parts = expression.Split('.');
        var lastPart = parts.LastOrDefault();
        return lastPart?.Split('(').FirstOrDefault() ?? "Operation";
    }

    public static async Task<Result> ThenAsync<T>(
        this Result<T> result,
        Func<T, Task<Result>> func,
        [CallerArgumentExpression("func")] string? operationName = null)
    {
        if (result.IsFailure) return result;

        var name = GetOperationName(operationName);
        using var activity = ActivitySourceProvider.Source.StartActivity(name);

        var nextResult = await func(result.Value);

        if (nextResult.IsFailure)
        {
            activity?.SetStatus(ActivityStatusCode.Error, nextResult.Error);
            activity?.SetTag("error.message", nextResult.Error);
        }
        else
        {
            activity?.SetStatus(ActivityStatusCode.Ok);
        }

        return nextResult;
    }

    public static async Task<Result<TOut>> MapAsync<TIn, TOut>(
        this Result<TIn> result,
        Func<TIn, Task<TOut>> func,
        [CallerArgumentExpression("func")] string? operationName = null)
    {
        if (result.IsFailure) return Result<TOut>.Failure(result.Error);

        var name = GetOperationName(operationName);
        using var activity = ActivitySourceProvider.Source.StartActivity(name);
        
        var value = await func(result.Value);
        
        activity?.SetStatus(ActivityStatusCode.Ok);

        return Result<TOut>.Success(value);
    }
    
    public static async Task<Result> TapAsync<T>(
        this Result<T> result,
        Func<T, Task> func,
        [CallerArgumentExpression("func")] string? operationName = null)
    {
        if (result.IsFailure) return result;

        var name = GetOperationName(operationName);
        using var activity = ActivitySourceProvider.Source.StartActivity(name);
        
        await func(result.Value);
        
        activity?.SetStatus(ActivityStatusCode.Ok);

        return result;
    }
    
    // คุณสามารถเพิ่มเวอร์ชันอื่นๆ ที่ต้องการได้ เช่น Then, Map, Tap (แบบ Synchronous)
}
```

---

วิธีการใช้งาน (ที่ง่ายที่สุด)
1. ใน Handler ของคุณ
แค่เปลี่ยน using ให้ชี้มาที่ Extension ใหม่ของเรา แค่นี้ก็เสร็จ!

```
// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommandHandler.cs

using MediatR;
using MyProject.Application.Features.Orders.PlaceOrder;
using MyProject.Core.Features.Orders;
using MyProject.Core.Features.Orders.Operations;
using MyProject.Core.Shared.ServiceContracts;

// ⭐ เปลี่ยนมาใช้ Extension ที่มี Tracing ฝังอยู่
using YourCompanyName.Application.Abstractions.Tracing; 
using YourCompanyName.Application.Abstractions.Primitives;

public class PlaceOrderCommandHandler : IRequestHandler<PlaceOrderCommand, Result<PlaceOrderResult>>
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerServiceClient _customerService;
    private readonly IStockServiceClient _stockService;

    public PlaceOrderCommandHandler(IOrderRepository orderRepo, ICustomerServiceClient customerService, IStockServiceClient stockService)
    {
        _orderRepository = orderRepo;
        _customerService = customerService;
        _stockService = stockService;
    }

    public async Task<Result<PlaceOrderResult>> Handle(PlaceOrderCommand request, CancellationToken ct)
    {
        // 🌟 โค้ดสะอาดเหมือนเดิม! แต่ตอนนี้มัน Trace ได้เอง!
        return OrderFactory.CreateOrder(request.CustomerId)
            .ThenAsync(order => _customerService.ValidateCustomerForOrderAsync(order.CustomerId))
            .ThenAsync(order => _stockService.CheckAndReserveStockAsync(order))
            .ThenAsync(validOrder => OrderPricingCalculator.CalculateFinalPrice(validOrder))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct))
            .MapAsync(finalOrder => Task.FromResult(new PlaceOrderResult { OrderId = finalOrder.Id }));
    }
}
```
---

2. ตั้งค่า OpenTelemetry ใน Program.cs
อย่าลืมบอกให้ OpenTelemetry รู้จัก ActivitySource ของเราด้วย

```
// MyProject.API/Program.cs

using OpenTelemetry;
using OpenTelemetry.Trace;
using YourCompanyName.Application.Abstractions.Tracing;

var builder = WebApplication.CreateBuilder(args);

// ... การลงทะเบียน Services อื่นๆ

// ⭐ ตั้งค่า OpenTelemetry Tracing
builder.Services.AddOpenTelemetry()
    .WithTracing(builder => builder
        .AddSource(ActivitySourceProvider.Source.Name) // <-- สำคัญมาก!
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        // ส่งข้อมูลไปยัง Jaeger หรือ Zipkin
        .AddJaegerExporter() 
    );

var app = builder.Build();

// ...
```

---

สรุปว่าทำไมมันดูแลรักษาง่าย
1.  Centralized Logic: ตรรกะ Tracing ทั้งหมดอยู่ที่ไฟล์ InstrumentedResultExtensions.cs ไฟล์เดียว ถ้าอนาคตต้องการเพิ่ม Tag พิเศษ, เปลี่ยนวิธีการตั้งชื่อ หรือเปลี่ยน Tracing Backend คุณแก้ไขแค่ที่นี่จุดเดียว
2. No Boilerplate in Handlers: โค้ดใน Application Layer ของคุณยังคงสะอาดและอ่านง่าย ไม่มีการรบกวนจากโค้ด Tracing เลย
3. Discoverable: ใครๆ ก็เข้าใจได้ว่าต้อง using YourCompanyName.Application.Abstractions.Tracing ถึงจะได้ Tracing อัตโนมัติ มันเป็นแบบ "Opt-in" ที่ชัดเจน
4. Robust: การใช้ [CallerArgumentExpression] ทำให้การดึงชื่อ Operation แข็งแกร่งและไม่พึ่งพา Reflection ทำให้ประสิทธิภาพสูงและปลอดภัยกับการ Refactoring
---


วิธีที่ง่ายและตรงไปตรงมาที่สุด: The Configurable Static
แนวคิดคือ: Library ของเราจะมี ActivitySource ตัวหนึ่งเป็นค่า Default ไว้ และ อนุญาตให้โปรเจกต์ที่ใช้งานเปลี่ยนชื่อของมันได้ตอนเริ่มต้นระบบเพียงครั้งเดียว

ขั้นตอนที่ 1: สร้าง Configurable Static Provider (เพียงไฟล์เดียว)
นี่คือไฟล์เดียวที่คุณต้องการใน Library ส่วนกลาง ไม่ต้องมี Interface ไม่ต้องมี DI ไม่ต้องมี Service Locator

ไฟล์: YourCompanyName.Application.Abstractions/Tracing/ActivitySourceProvider.cs

```
using System.Diagnostics;

namespace YourCompanyName.Application.Abstractions.Tracing;

/// <summary>
/// Provider สำหรับ ActivitySource ที่ใช้งานง่ายและ Configurable ได้
/// ให้โปรเจกต์ที่ใช้งานตั้งค่า Source.Name ใน Program.cs
/// </summary>
public static class ActivitySourceProvider
{
    // ⭐ สิ่งสำคัญที่สุด: Property แบบ Static ที่สามารถเปลี่ยนค่าได้
    // มีค่า Default ไว้ให้ก่อน
    public static ActivitySource Source { get; set; } = new("Default.Application");
}
```
---

ขั้นตอนที่ 2: ใช้งานใน Instrumented ROP Extensions (ไม่ต้องเปลี่ยนแปลง)
Extension Methods ของเราจะกลับไปใช้แบบเดิมที่ดูง่ายที่สุด

ไฟล์: YourCompanyName.Application.Abstractions/Tracing/InstrumentedResultExtensions.cs
```
using System.Diagnostics;
using System.Runtime.CompilerServices;
using YourCompanyName.Application.Abstractions.Primitives;

public static class InstrumentedResultExtensions
{
    private static string GetOperationName(string? expression)
    {
        if (string.IsNullOrWhiteSpace(expression)) return "Operation";
        var parts = expression.Split('.');
        var lastPart = parts.LastOrDefault();
        return lastPart?.Split('(').FirstOrDefault() ?? "Operation";
    }

    public static async Task<Result> ThenAsync<T>(
        this Result<T> result,
        Func<T, Task<Result>> func,
        [CallerArgumentExpression("func")] string? operationName = null)
    {
        if (result.IsFailure) return result;

        var name = GetOperationName(operationName);
        // 🔥 ใช้ Source จาก Static Provider โดยตรง
        using var activity = ActivitySourceProvider.Source.StartActivity(name);

        var nextResult = await func(result.Value);

        if (nextResult.IsFailure)
        {
            activity?.SetStatus(ActivityStatusCode.Error, nextResult.Error);
            activity?.SetTag("error.message", nextResult.Error);
        }
        else
        {
            activity?.SetStatus(ActivityStatusCode.Ok);
        }

        return nextResult;
    }

    // ... MapAsync, TapAsync ทำเหมือนกัน
}
```
---
ขั้นตอนที่ 3: ตั้งค่าในแต่ละโปรเจกต์ (เพียง 1 บรรทัด)
ใน Program.cs ของแต่ละโปรเจกต์ คุณแค่เปลี่ยนค่าของ ActivitySourceProvider.Source ก่อนที่จะมีการใช้งานครั้งแรก

ใน MyProject.API/Program.cs

```
var builder = WebApplication.CreateBuilder(args);

// ⭐ บรรทัดเดียวจบ! ตั้งชื่อให้ตรงกับ Service ของคุณ
ActivitySourceProvider.Source = new ActivitySource("MyProject.API");

// ... การลงทะเบียน Services อื่นๆ

// ⭐ ใช้ชื่อเดียวกันนี้ใน OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracerProviderBuilder => tracerProviderBuilder
        .AddSource("MyProject.API") // <-- ใช้ชื่อเดียวกัน
        .AddAspNetCoreInstrumentation()
        .AddJaegerExporter()
    );

var app = builder.Build();
app.Run();
```

ใน MyProject.Grpc/Program.cs

```
var builder = WebApplication.CreateBuilder(args);

// ⭐ ตั้งชื่อให้ตรงกับ Service ของคุณ
ActivitySourceProvider.Source = new ActivitySource("MyProject.Grpc");

// ... การลงทะเบียน Services อื่นๆ

// ⭐ ใช้ชื่อเดียวกันนี้ใน OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracerProviderBuilder => tracerProviderBuilder
        .AddSource("MyProject.Grpc") // <-- ใช้ชื่อเดียวกัน
        .AddAspNetCoreInstrumentation()
        .AddJaegerExporter()
    );

var app = builder.Build();
app.Run();
```
---

**ทำไมวิธีนี้ถึง "ง่ายกว่า" และ "ดีแก่การ Debug"?**
1. น้อยกว่าครึ่งของโค้ด: ไม่ต้องสร้าง Interface, Implementation, และ Service Locator มีแค่ Static Class ตัวเดียว
2. ชัดเจนและโปร่งใส: เมื่อนักพัฒนาคนใหม่เห็น .ThenAsync() แล้วกด Go to Definition มันจะพาไปที่ InstrumentedResultExtensions จากนั้นจะเห็นว่ามันใช้ ActivitySourceProvider.Source พอกด Go to Definition อีกทีก็จะเจอไฟล์ ActivitySourceProvider.cs ทันที ไม่มีอะไรซับซ้อน
3. จุดกำเนิดของปัญหาชัดเจน: ถ้า Tracing ไม่ทำงาน สิ่งแรกที่ต้องตรวจสอบคือ "มีใครตั้งค่า ActivitySourceProvider.Source หรือไม่" และ "ชื่อที่ตั้งไปตรงกับใน OpenTelemetry หรือไม่" ซึ่งเป็นการ Debug ที่ตรงไปตรงมามาก
4. ไม่มี Magic: ไม่มีการใช้ DI ผ่านทาง Static หรือ Reflection ที่ซ่อนอยู่ ทุกอย่างเป็นการเรียก Property และ Method ตรงๆ
**ข้อเสียเล็กน้อยที่ต้องยอมรับ**
- Global Mutable State: มันคือตัวแปร Global ที่สามารถเปลี่ยนค่าได้ แต่ในความเป็นจริง มันจะถูกตั้งค่าแค่ครั้งเดียวตอน Startup แล้วไม่เปลี่ยนแปลงอีก ดังนั้นความเสี่ยงจึงต่ำมาก
- Testing: ถ้าคุณเขียน Integration Test หลายๆ ตัวที่รันคู่กัน คุณอาจจะต้องระวังว่า Test อันแรกจะไปเปลี่ยนค่า Source และกระทบ Test อันถัดไป (ซึ่งสามารถแก้ไขได้โดยรีเซ็ตค่าใน [TestCleanup] หรือ [AssemblyCleanup])
**สรุป:** วิธีนี้เป็นการแลกเสียอะไรเล็กน้อยในด้าน "ความบริสุทธิ์ทางสถาปัตยกรรม" แต่ได้มาซึ่ง ความเรียบง่าย ความเข้าใจง่าย และความสามารถในการดูแลรักษา ซึ่งตรงตามสิ่งที่คุณต้องการครับ

