

ได้เลยครับ! ผมจะสร้างเอกสาร Markdown ฉบับสมบูรณ์ พร้อมกับตัวอย่างโค้ดเต็มๆ ที่คุณสามารถนำไปใช้งานได้ทันที

---

# เอกสารประกอบ: YourCompanyName.Application.Abstractions

เอกสารนี้อธิบายถึง Library หลักที่ใช้ในการสร้างแอปพลิเคชัน .NET แบบ Clean Architecture โดยไม่พึ่งพา Library ภายนอกที่หนักแน่น (เช่น MediatR) Library นี้มุ่งเน้นไปที่การสร้างระบบที่ **สะอาด (Clean), ทดสอบง่าย (Testable), และสังเกตการณ์ได้ง่าย (Observable)**

## สารบัญ

1.  [แนวคิดหลัก](#แนวคดหลก)
2.  [ส่วนประกอบที่ 1: Primitives - ประเภท `Result`](#สวนประกอบท-1-primitives--ประภท-result)
3.  [ส่วนประกอบที่ 2: Messaging - รูปแบบ CQRS แบบ Lightweight](#สวนประกอบท-2-messaging--รปแบบ-cqrs-แบบ-lightweight)
4.  [ส่วนประกอบที่ 3: Tracing - การสังเกตการณ์แบบอัตโนมัติ](#สวนประกอบท-3-tracing--การสงเกตการณแบบอตโนมต)
5.  [ส่วนประกอบที่ 4: Dependency Registration - การลงทะเบียนอัตโนมัติ](#สวนประกอบท-4-dependency-registration--การลงทะเบยนอตโนมต)
6.  [การนำไปใช้งานร่วมกัน: ตัวอย่างสมบูรณ์](#การนำไปใชงานรวมกน-ตวอยางสมบรณ)
7.  [ส่วนประกอบที่ 5: การทดสอบ (Testing)](#สวนประกอบท-5-การทดสอบ-testing)
8.  [สรุป](#สรป)

---

## แนวคิดหลัก

Library นี้สร้างขึ้นบนพื้นฐานของแนวคิดต่อไปนี้:

*   **Railway-Oriented Programming (ROP):** ใช้ประเภท `Result` เพื่อจัดการกับทั้งความสำเร็จและความล้มเหลวในลำดับขั้นตอนที่ชัดเจน โดยไม่ต้องใช้ `try-catch` ใน Business Logic
*   **Messaging Pattern:** แยกคำสั่งที่เปลี่ยนแปลงข้อมูล (Commands) และคำขอที่อ่านข้อมูล (Queries) ออกจากกัน ซึ่งเป็นหัวใจของ CQRS
*   **Implicit Tracing:** ฝังความสามารถในการ Tracing (กับ OpenTelemetry) ไว้ใน Pipeline โดยอัตโนมัติ ทำให้นักพัฒนาไม่ต้องเขียนโค้ด Boilerplate

---

## ส่วนประกอบที่ 1: Primitives - ประเภท `Result`

`Result` เป็นประเภทข้อมูลที่แสดงถึงผลลัพธ์จากการดำเนินการ ซึ่งอาจจะสำเร็จพร้อมข้อมูล หรือล้มเหลวพร้อมข้อความผิดพลาด

### `Result.cs` และ `Result<T>.cs`

```csharp
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
    
    // อนุญาตให้แปลงจาก Result ธรรมดาเป็น Result<T> ได้โดยอัตโนมัติ
    public static implicit operator Result<T>(Result result) =>
        result.IsSuccess ? Success(default(T)!) : Failure(result.Error);
}
```

### `ResultExtensions.cs` (ROP พื้นฐาน)

```csharp
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

## ส่วนประกอบที่ 2: Messaging - รูปแบบ CQRS แบบ Lightweight

เราสร้าง Interfaces ของตัวเองสำหรับรูปแบบ CQRS แทนการใช้ MediatR เพื่อลดการพึ่งพาภายนอก

### Interfaces

```csharp
// YourCompanyName.Application.Abstractions/Messaging/ICommandRequest.cs
namespace YourCompanyName.Application.Abstractions.Messaging;
public interface ICommandRequest { }

// YourCompanyName.Application.Abstractions/Messaging/ICommandRequestHandler.cs
namespace YourCompanyName.Application.Abstractions.Messaging;
public interface ICommandRequestHandler<TCommand> where TCommand : ICommandRequest
{
    Task<Result> Handle(TCommand command, CancellationToken ct);
}

// YourCompanyName.Application.Abstractions/Messaging/IQueryRequest.cs
namespace YourCompanyName.Application.Abstractions.Messaging;
public interface IQueryRequest<TResponse> { }

// YourCompanyName.Application.Abstractions/Messaging/IQueryRequestHandler.cs
namespace YourCompanyName.Application.Abstractions.Messaging;
public interface IQueryRequestHandler<TQuery, TResponse>
    where TQuery : IQueryRequest<TResponse>
{
    Task<Result<TResponse>> Handle(TQuery query, CancellationToken ct);
}
```

### ตัวอย่างการใช้งาน

```csharp
// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommand.cs
using YourCompanyName.Application.Abstractions.Messaging;

public record PlaceOrderCommand(Guid CustomerId, List<OrderItemDto> Items) : ICommandRequest;

// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommandHandler.cs
using YourCompanyName.Application.Abstractions.Messaging;
using YourCompanyName.Application.Abstractions.Primitives;

public class PlaceOrderCommandHandler : ICommandRequestHandler<PlaceOrderCommand>
{
    private readonly IOrderRepository _orderRepository;
    // ... dependencies อื่นๆ

    public PlaceOrderCommandHandler(IOrderRepository orderRepo, ...)
    {
        _orderRepository = orderRepo;
        // ...
    }

    public async Task<Result> Handle(PlaceOrderCommand command, CancellationToken ct)
    {
        // ใช้ ROP Pipeline ที่มี Tracing ฝังอยู่
        return OrderFactory.CreateOrder(command.CustomerId)
            .ThenAsync(order => _customerService.ValidateCustomerForOrderAsync(order.CustomerId))
            .ThenAsync(order => _stockService.CheckAndReserveStockAsync(order))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct));
    }
}
```

---

## ส่วนประกอบที่ 3: Tracing - การสังเกตการณ์แบบอัตโนมัติ

### `ActivitySourceProvider.cs` - จุดกำหนดค่า

```csharp
// YourCompanyName.Application.Abstractions/Tracing/ActivitySourceProvider.cs
using System.Diagnostics;

namespace YourCompanyName.Application.Abstractions.Tracing;

/// <summary>
/// Provider สำหรับ ActivitySource ที่ใช้งานง่ายและ Configurable ได้
/// ให้โปรเจกต์ที่ใช้งานตั้งค่า Source.Name ใน Program.cs
/// </summary>
public static class ActivitySourceProvider
{
    // ⭐ สิ่งสำคัญที่สุด: Property แบบ Static ที่สามารถเปลี่ยนค่าได้
    public static ActivitySource Source { get; set; } = new("Default.Application");
}
```

### `InstrumentedResultExtensions.cs` - เวทมนตร์

```csharp
// YourCompanyName.Application.Abstractions/Tracing/InstrumentedResultExtensions.cs
using System.Diagnostics;
using System.Runtime.CompilerServices;
using YourCompanyName.Application.Abstractions.Primitives;

namespace YourCompanyName.Application.Abstractions.Tracing;

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
}
```

---

## ส่วนประกอบที่ 4: Dependency Registration - การลงทะเบียนอัตโนมัติ

สร้างโปรเจกต์ `MyProject.Application.Extensions` และเพิ่มไฟล์นี้เพื่อลงทะเบียน Handlers อัตโนมัติ

### `ServiceCollectionExtensions.cs`

```csharp
// MyProject.Application.Extensions/ServiceCollectionExtensions.cs
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using YourCompanyName.Application.Abstractions.Messaging;

namespace MyProject.Application.Extensions;

public static class ServiceCollectionExtensions
{
    /// <summary>
    /// Scans the assembly and registers all command and query handlers.
    /// </summary>
    public static IServiceCollection AddApplicationHandlers(this IServiceCollection services, Assembly? assembly = null)
    {
        assembly ??= Assembly.GetCallingAssembly();

        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(classes => classes.AssignableTo(typeof(ICommandRequestHandler<>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(classes => classes.AssignableTo(typeof(IQueryRequestHandler<,>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        return services;
    }
}
```

---

## การนำไปใช้งานร่วมกัน: ตัวอย่างสมบูรณ์

### `PlaceOrderCommandHandler.cs` (ใช้ทุกส่วนประกอบ)

```csharp
// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommandHandler.cs
using YourCompanyName.Application.Abstractions.Messaging;
using YourCompanyName.Application.Abstractions.Tracing; // ⭐ ใช้ Extensions ที่มี Tracing
using YourCompanyName.Application.Abstractions.Primitives;

public class PlaceOrderCommandHandler : ICommandRequestHandler<PlaceOrderCommand>
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

    public async Task<Result> Handle(PlaceOrderCommand command, CancellationToken ct)
    {
        // 🌟 Pipeline ที่สะอาด อ่านง่าย และ Trace ได้เอง!
        return OrderFactory.CreateOrder(command.CustomerId)
            .ThenAsync(order => _customerService.ValidateCustomerForOrderAsync(order.CustomerId))
            .ThenAsync(order => _stockService.CheckAndReserveStockAsync(order))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct));
    }
}
```

### `Program.cs` (Composition Root)

```csharp
// MyProject.API/Program.cs
using YourCompanyName.Application.Abstractions.Tracing;
using MyProject.Application.Extensions;

var builder = WebApplication.CreateBuilder(args);

// ... การลงทะเบียน Services อื่นๆ

// ⭐ 1. ตั้งค่าชื่อให้ตรงกับ Service ของคุณ
ActivitySourceProvider.Source = new ActivitySource("MyProject.API");

// ⭐ 2. ใช้ชื่อเดียวกันนี้ใน OpenTelemetry
builder.Services.AddOpenTelemetry()
    .WithTracing(tracerProviderBuilder => tracerProviderBuilder
        .AddSource("MyProject.API") // <-- ใช้ชื่อเดียวกัน
        .AddAspNetCoreInstrumentation()
        .AddHttpClientInstrumentation()
        .AddJaegerExporter()
    );

// ⭐ 3. ลงทะเบียน Handlers ทั้งหมดอัตโนมัติด้วยบรรทัดเดียว
builder.Services.AddApplicationHandlers(typeof(PlaceOrderCommand).Assembly);

var app = builder.Build();
app.Run();
```

---

## ส่วนประกอบที่ 5: การทดสอบ (Testing)

เมื่อต้องการทดสอบโค้ดที่ใช้ `ActivitySourceProvider` อย่าลืมรีเซ็ตค่าใน `[TestCleanup]` เพื่อป้องกัน Test Interdependency

### ตัวอย่างโค้ดทดสอบ (MSTest)

```csharp
// MyProject.Application.Tests/Tracing/ActivitySourceProviderTests.cs
using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Diagnostics;
using YourCompanyName.Application.Abstractions.Tracing;

[TestClass]
public class ActivitySourceProviderTests
{
    private readonly ActivitySource _defaultSource = new("Default.Application");

    [TestInitialize]
    public void Setup()
    {
        ActivitySourceProvider.Source = _defaultSource;
    }

    [TestCleanup]
    public void Cleanup()
    {
        // รีเซ็ตค่ากลับไปเป็น Default หลังจาก Test จบ
        ActivitySourceProvider.Source = _defaultSource;
    }

    [TestMethod]
    public void Test1_ShouldUseConfiguredSource()
    {
        // Arrange
        var testSource = new ActivitySource("Test.Service");
        ActivitySourceProvider.Source = testSource;
        
        // Assert
        Assert.AreEqual("Test.Service", ActivitySourceProvider.Source.Name);
    }

    [TestMethod]
    public void AnotherTest_ShouldStartFromDefault()
    {
        // Assert - การทดสอบนี้จะผ่านเสมอ
        Assert.AreEqual("Default.Application", ActivitySourceProvider.Source.Name);
    }
}
```

---

## สรุป

`YourCompanyName.Application.Abstractions` ไม่ใช่แค่ Library แต่เป็นเฟรมเวิร์คขนาดเล็กที่ให้รากฐานที่แข็งแกร่งสำหรับการสร้างแอปพลิเคชันสมัยใหม่ มันช่วยให้ทีมงาน:
*   **เขียนโค้ด Business Logic ที่สะอาดและอ่านง่าย**
*   **ทดสอบได้ง่ายและมั่นใจได้**
*   **มีข้อมูล Observability ที่มีคุณค่าโดยไม่ต้องเสียเวลาเขียนโค้ด Boilerplate**