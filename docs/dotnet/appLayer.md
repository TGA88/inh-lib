
# เอกสารสมบูรณ์: MyProject.Application - ชั้นการใช้งาน (Application Layer)

เอกสารนี้อธิบายโครงสร้าง หลักการ และวิธีการใช้งานโปรเจกต์ `MyProject.Application` ซึ่งเป็นชั้นกลางของระบบ ออกแบบมาตามหลักการ **Clean Architecture, Vertical Slice, CQRS, Railway-Oriented Programming (ROP)** และ **FastEndpoints**

## หลักการและปรัชญา

*   **Vertical Slice Architecture:** จัดระเบียบโค้ดตามฟีเจอร์ (Feature) ทำให้ทุกอย่างที่เกี่ยวข้องกับ Use Case หนึ่งๆ อยู่ใกล้กัน
*   **CQRS (Command Query Responsibility Segregation):** แยก Use Cases ที่เป็นการเขียน (Commands) และการอ่าน (Queries) ออกจากกันเพื่อความชัดเจน
*   **Co-location:** รวม Command, Handler, DTOs และ Validator ที่เกี่ยวข้องกันไว้ในโฟลเดอร์เดียวกันเพื่อความสะดวกในการค้นหาและแก้ไข
*   **Thin Handlers:** Handlers ทำหน้าที่เป็น Orchestrator เท่านั้น ไม่มี Business Logic ซับซ้อน โดยจะเรียกใช้ Pure Functions จาก Core Layer
*   **Fail Fast:** ใช้ FluentValidation เพื่อตรวจสอบความถูกต้องของข้อมูลที่ระดับ Presentation Layer ก่อนที่จะเสียทรัพยากรใน Application Layer

---

## โครงสร้างโฟลเดอร์ที่สมบูรณ์

```
MyProject.Application/
├── Features/                              # 🌟 จุดเริ่มต้นของทุกอย่าง จัดตามฟีเจอร์
│   └── Orders/                           # Feature ชื่อ "Orders"
│       ├── Commands/                     # 🌟 Use Cases สำหรับการเขียน (Write)
│       │   └── PlaceOrder/
│       │       ├── PlaceOrderCommand.cs       # Input Model / Request DTO
│       │       ├── PlaceOrderCommandValidator.cs # ⭐ FluentValidation
│       │       ├── PlaceOrderHandler.cs       # Orchestrator
│       │       └── PlaceOrderResultDto.cs     # Output Model / Response DTO
│       │
│       └── Queries/                      # 🌟 Use Cases สำหรับการอ่าน (Read)
│           └── GetOrderById/
│               ├── GetOrderByIdQuery.cs       # Input Model
│               ├── GetOrderByIdQueryValidator.cs # ⭐ FluentValidation
│               ├── GetOrderByIdHandler.cs     # Orchestrator
│               └── OrderDto.cs                # Output Model / Response DTO
│
├── Common/                               # สิ่งที่ใช้ร่วมกันข้าม Use Cases (ถ้ามี)
│   └── Mappings/
│       └── MappingProfile.cs               # AutoMapper Profile (ถ้าใช้)
│
└── Extensions/                           # 🌟 จุดเริ่มต้นของการลงทะเบียน Services
    └── ApplicationServiceExtensions.cs    # Extension สำหรับ Presentation Layer
```

---

## ตัวอย่างโค้ดที่สมบูรณ์

### 1. Use Case: PlaceOrder (Command)

#### `PlaceOrderCommand.cs`
ทำหน้าที่เป็นทั้ง **Command** และ **Request DTO** สำหรับ FastEndpoints

```csharp
// MyProject.Application/Features/Orders/Commands/PlaceOrder/PlaceOrderCommand.cs
using YourCompanyName.Application.Abstractions.Messaging;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// Represents a command to place a new order.
/// Serves as the request model for PlaceOrderEndpoint.
/// </summary>
public record PlaceOrderCommand(
    [property: Required] Guid CustomerId,
    [property: Required, MinLength(1)] List<OrderItemDto> Items
) : ICommandRequest;
```

#### `PlaceOrderCommandValidator.cs`
ใช้ FluentValidation สำหรับตรวจสอบความถูกต้องของข้อมูลที่รับเข้ามา

```csharp
// MyProject.Application/Features/Orders/Commands/PlaceOrder/PlaceOrderCommandValidator.cs
using FluentValidation;
using MyProject.Application.Features.Orders.Commands.PlaceOrder;

/// <summary>
/// FluentValidation rules for PlaceOrderCommand.
/// </summary>
public class PlaceOrderCommandValidator : AbstractValidator<PlaceOrderCommand>
{
    public PlaceOrderCommandValidator()
    {
        RuleFor(x => x.CustomerId)
            .NotEmpty().WithMessage("CustomerId is required.");

        RuleFor(x => x.Items)
            .NotEmpty().WithMessage("Order must have at least one item.")
            .Must(items => items.All(item => item.Quantity > 0))
            .WithMessage("All items must have a quantity greater than zero.");

        RuleForEach(x => x.Items)
            .ChildRules(item =>
            {
                item.RuleFor(i => i.ProductId)
                    .NotEmpty().WithMessage("ProductId is required for each item.");
                item.RuleFor(i => i.UnitPrice)
                    .GreaterThan(0).WithMessage("UnitPrice must be greater than zero.");
            });
    }
}
```

#### `PlaceOrderResultDto.cs`
เป็น **Response DTO** ที่ส่งกลับไปยัง Client หลังจากสร้าง Order สำเร็จ

```csharp
// MyProject.Application/Features/Orders/Commands/PlaceOrder/PlaceOrderResultDto.cs

/// <summary>
/// Represents the result of a successful PlaceOrder command.
/// </summary>
public record PlaceOrderResultDto(Guid OrderId);
```

#### `PlaceOrderHandler.cs`
เป็น **Orchestrator** ที่ประกอบ Pure Functions จาก Core Layer และ Services จาก Infrastructure Layer

```csharp
// MyProject.Application/Features/Orders/Commands/PlaceOrder/PlaceOrderHandler.cs
using YourCompanyName.Application.Abstractions.Messaging;
using YourCompanyName.Application.Abstractions.Tracing;
using YourCompanyName.Application.Abstractions.Primitives;
using MyProject.Core.Features.Orders.Operations; // สมมติว่า Operations อยู่ที่นี่

/// <summary>
/// Handles the PlaceOrderCommand using a Railway-Oriented Programming pipeline.
/// </summary>
public class PlaceOrderHandler : ICommandRequestHandler<PlaceOrderCommand, PlaceOrderResultDto>
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerServiceClient _customerService;
    private readonly IStockServiceClient _stockService;

    public PlaceOrderHandler(IOrderRepository orderRepo, ICustomerServiceClient customerService, IStockServiceClient stockService)
    {
        _orderRepository = orderRepo;
        _customerService = customerService;
        _stockService = stockService;
    }

    public async Task<Result<PlaceOrderResultDto>> Handle(PlaceOrderCommand command, CancellationToken ct)
    {
        // 🌟 ROP Pipeline ที่สะอาด อ่านง่าย และ Trace ได้เอง!
        return OrderFactory.CreateOrder(command.CustomerId)
            .ThenAsync(order => _customerService.ValidateCustomerForOrderAsync(order.CustomerId))
            .ThenAsync(order => _stockService.CheckAndReserveStockAsync(order))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct))
            .Map(finalOrder => new PlaceOrderResultDto(finalOrder.Id));
    }
}
```

---

### 2. Use Case: GetOrderById (Query)

#### `GetOrderByIdQuery.cs`
ทำหน้าที่เป็นทั้ง **Query** และ **Request DTO**

```csharp
// MyProject.Application/Features/Orders/Queries/GetOrderById/GetOrderByIdQuery.cs
using YourCompanyName.Application.Abstractions.Messaging;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// Represents a query to retrieve an order by its ID.
/// </summary>
public record GetOrderByIdQuery(
    [property: Required] Guid OrderId
) : IQueryRequest<OrderDto>;
```

#### `GetOrderByIdQueryValidator.cs`

```csharp
// MyProject.Application/Features/Orders/Queries/GetOrderById/GetOrderByIdQueryValidator.cs
using FluentValidation;
using MyProject.Application.Features.Orders.Queries.GetOrderById;

/// <summary>
/// FluentValidation rules for GetOrderByIdQuery.
/// </summary>
public class GetOrderByIdQueryValidator : AbstractValidator<GetOrderByIdQuery>
{
    public GetOrderByIdQueryValidator()
    {
        RuleFor(x => x.OrderId)
            .NotEmpty().WithMessage("OrderId is required.");
    }
}
```

#### `OrderDto.cs`
เป็น **Response DTO** สำหรับส่งข้อมูล Order กลับไป

```csharp
// MyProject.Application/Features/Orders/Queries/GetOrderById/OrderDto.cs

/// <summary>
/// Data Transfer Object for an Order, used for read operations.
/// </summary>
public class OrderDto
{
    public Guid Id { get; set; }
    public DateTime OrderDate { get; set; }
    public string Status { get; set; }
    public List<OrderItemDto> Items { get; set; } = new();
}
```

#### `GetOrderByIdHandler.cs`

```csharp
// MyProject.Application/Features/Orders/Queries/GetOrderById/GetOrderByIdHandler.cs
using YourCompanyName.Application.Abstractions.Messaging;
using YourCompanyName.Application.Abstractions.Tracing;
using YourCompanyName.Application.Abstractions.Primitives;

/// <summary>
/// Handles the GetOrderByIdQuery.
/// </summary>
public class GetOrderByIdHandler : IQueryRequestHandler<GetOrderByIdQuery, OrderDto>
{
    private readonly IOrderViewReader _orderViewReader; // สมมติว่าเป็น Dapper Reader

    public GetOrderByIdHandler(IOrderViewReader orderViewReader)
    {
        _orderViewReader = orderViewReader;
    }

    public async Task<Result<OrderDto>> Handle(GetOrderByIdQuery query, CancellationToken ct)
    {
        var orderDto = await _orderViewReader.GetOrderByIdAsync(query.OrderId, ct);

        if (orderDto == null)
        {
            return Result.Failure<OrderDto>("Order not found.");
        }

        return Result.Success(orderDto);
    }
}
```

---

### 3. ส่วนประกอบที่ใช้ร่วมกัน (Common)

#### `MappingProfile.cs` (ถ้าใช้ AutoMapper)

```csharp
// MyProject.Application/Common/Mappings/MappingProfile.cs
using AutoMapper;
using MyProject.Core.Features.Orders;
using MyProject.Application.Features.Orders.Queries.GetOrderById;

public class MappingProfile : Profile
{
    public MappingProfile()
    {
        CreateMap<Order, OrderDto>()
            .ForMember(dest => dest.Status, opt => opt.MapFrom(src => src.Status.ToString()));
    }
}
```

---

### 4. การลงทะเบียน Services (Extensions)

#### `ApplicationServiceExtensions.cs`
เป็นจุดกลางสำหรับ Presentation Layer ในการลงทะเบียน Services ทั้งหมดของ Application Layer

```csharp
// MyProject.Application/Extensions/ApplicationServiceExtensions.cs
using Microsoft.Extensions.DependencyInjection;
using System.Reflection;
using FluentValidation; // ⭐ เพิ่ม using
using YourCompanyName.Application.Abstractions.Messaging;

namespace MyProject.Application.Extensions;

/// <summary>
/// Provides extension methods for IServiceCollection to register application services.
/// This encapsulates the registration logic of the Application Layer.
/// </summary>
public static class ApplicationServiceExtensions
{
    /// <summary>
    /// Registers all command handlers, query handlers, and validators from the specified assembly.
    /// </summary>
    public static IServiceCollection AddApplicationServices(this IServiceCollection services, Assembly? assembly = null)
    {
        assembly ??= Assembly.GetCallingAssembly();

        // Register all Command Handlers
        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(classes => classes.AssignableTo(typeof(ICommandRequestHandler<>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        // Register all Query Handlers
        services.Scan(scan => scan
            .FromAssemblies(assembly)
            .AddClasses(classes => classes.AssignableTo(typeof(IQueryRequestHandler<,>)))
            .AsImplementedInterfaces()
            .WithScopedLifetime());

        // ⭐ Register all Validators from the assembly
        services.AddValidatorsFromAssembly(assembly);

        // สามารถเพิ่มการลงทะเบียน Services อื่นๆ ที่เกี่ยวข้องกับ Application Layer ได้ที่นี่
        // services.AddAutoMapper(assembly);

        return services;
    }
}
```

---

## การไหลของข้อมูล (The Flow) และการใช้งาน

### 1. ใน `Program.cs` (Composition Root)

```csharp
// MyProject.API/Program.cs
using MyProject.Application.Extensions; // ⭐ Import Extensions
using YourCompanyName.Application.Abstractions.Tracing;

var builder = WebApplication.CreateBuilder(args);

// 1. ตั้งค่า Tracing
ActivitySourceProvider.Source = new ActivitySource("MyProject.API");
builder.Services.AddOpenTelemetry()
    .WithTracing(b => b.AddSource("MyProject.API").AddAspNetCoreInstrumentation())
    .AddJaegerExporter();

// 2. ⭐ เพียงบรรทัดเดียว! ลงทะเบียน Handlers และ Validators ทั้งหมดจาก Application Layer
builder.Services.AddApplicationServices();

// 3. ลงทะเบียน FastEndpoints
builder.Services.AddFastEndpoints();

var app = builder.Build();
app.UseFastEndpoints();
app.Run();
```

### 2. ใน FastEndpoint

```csharp
// MyProject.API/Endpoints/Orders/PlaceOrderEndpoint.cs
using FastEndpoints;
using YourCompanyName.Application.Abstractions.Primitives;
using MyProject.Application.Features.Orders.Commands.PlaceOrder; // ⭐ Import จาก Use Case

public class PlaceOrderEndpoint : Endpoint<PlaceOrderCommand, PlaceOrderResultDto>
{
    // ⭐ Property Injection ของ FastEndpoints
    public ICommandRequestHandler<PlaceOrderCommand, PlaceOrderResultDto> Handler { get; set; }

    public override void Configure()
    {
        Post("/orders");
        AllowAnonymous();
    }

    public override async Task HandleAsync(PlaceOrderCommand req, CancellationToken ct)
    {
        // เรียกใช้งาน Application Layer
        var result = await Handler.Handle(req, ct);

        // แปลง Result ให้เป็น HTTP Response
        if (result.IsSuccess)
        {
            // SendCreatedAtAsync จะส่ง 201 Created พร้อม Location Header และ Response Body
            await SendCreatedAtAsync<PlaceOrderEndpoint>(result.Value.OrderId, result.Value, ct);
        }
        else
        {
            // SendErrorsAsync จะส่ง 400 Bad Request พร้อมข้อความผิดพลาด
            await SendErrorsAsync(result.Error, ct);
        }
    }
}
```

---

## สรุปและ Best Practices

*   **Co-location:** รวมไฟล์ที่เกี่ยวข้องกับ Use Case เดียวกันไว้ในโฟลเดอร์เดียวกันเพื่อความสะดวกในการค้นหาและแก้ไข
*   **Fail Fast:** การตรวจสอบความถูกต้องที่ระดับ Endpoint ช่วยป้องกันไม่ให้ Request ที่ไม่ถูกต้องเข้ามาถึง Business Logic
*   **Thin Handlers:** Handlers ควรมีหน้าที่เพียงประสานงาน ไม่ควรมี Business Logic ซับซ้อน
*   **Encapsulation:** ใช้ `ApplicationServiceExtensions` เพื่อซ่อนตรรกะการลงทะเบียน DI ไว้ ทำให้ Presentation Layer สะอาดและไม่ต้องรู้รายละเอียด
*   **Use Result Type:** ใช้ `Result` Type และ ROP เพื่อจัดการกับความสำเร็จและความล้มเหลวอย่างเป็นระบบ และได้ Tracing ฟรี

การออกแบบ Application Layer ในลักษณะนี้ทำให้ระบบมีความสม่ำเสมอ เข้าใจง่าย และบำรุงรักษาได้ง่ายในระยะยาวครับ