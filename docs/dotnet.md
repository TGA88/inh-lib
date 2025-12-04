

<!-- OrderManagement.Api.Http/OrderManagement.Api.Http.csproj -->
<Project Sdk="Microsoft.NET.Sdk.Web">
  <ItemGroup>
    <!-- FastEndpoints -->
    <PackageReference Include="FastEndpoints" Version="7.1.1" />
    
    <!-- Projects -->
    <ProjectReference Include="..\OrderManagement.Application\OrderManagement.Application.csproj" />
    <ProjectReference Include="..\OrderManagement.Infrastructure.Postgres\OrderManagement.Infrastructure.Postgres.csproj" />
  </ItemGroup>
</Project>
```

---

## 📁 Complete Project Structure
```
OrderManagement.sln
│
├── src/
│   ├── OrderManagement.Api.Http/
│   │   ├── Program.cs                              
│   │   │   └── services.AddApplication()           ⬅️ from Application
│   │   │   └── services.AddPostgres()              ⬅️ from Infrastructure.Postgres
│   │   ├── Endpoints/
│   │   └── OrderManagement.Api.Http.csproj
│   │       └── References: Application + Infrastructure.Postgres
│   │
│   ├── OrderManagement.Api.Grpc/
│   │   ├── Program.cs
│   │   │   └── services.AddApplication()
│   │   │   └── services.AddPostgres()
│   │   ├── Protos/
│   │   ├── Services/
│   │   └── OrderManagement.Api.Grpc.csproj
│   │       └── References: Application + Infrastructure.Postgres
│   │
│   ├── OrderManagement.Api.GraphQL/
│   │   ├── Program.cs
│   │   │   └── services.AddApplication()
│   │   │   └── services.AddPostgres()
│   │   ├── Queries/
│   │   ├── Mutations/
│   │   └── OrderManagement.Api.GraphQL.csproj
│   │       └── References: Application + Infrastructure.Postgres
│   │
│   ├── OrderManagement.Application/
│   │   ├── Features/
│   │   │   └── Orders/
│   │   │   │   ├── Commands/
│   │   │   │   │    └── CreateOrder/               ⬅️ ทุกอย่างอยู่ที่เดียว!
│   │   │   │   │           ├── CreateOrderCommand.cs
│   │   │   │   │           ├── CreateOrderCommandHandler.cs
│   │   │   │   │           └── CreateOrderValidator.cs
│   │   │   │   └── Queries/
│   │   │   │          └── GetOrder/
│   │   │   │               ├── GetOrderQuery.cs
│   │   │   │               └── GetOrderQueryHandler.cs
│   │   │   └── Products/
│   │   │       ├── Commands/
│   │   │       └── Queries/
│   │   ├── Extensions/                             ⬅️ Extensions here!
│   │   │   └── ApplicationExtensions.cs
│   │   └── OrderManagement.Application.csproj
│   │       └── References: Core + DI.Abstractions
│   │
│   ├── OrderManagement.Core/
│   │       ├── Domain/
│   │       │   ├── Entities/
│   │       │   │   ├── Order.cs
│   │       │   │   ├── Customer.cs
│   │       │   │   └── Product.cs
│   │       │   ├── ValueObjects/
│   │       │   └── Enums/
│   │       └── Interfaces/
│   │           ├── IOrderRepository.cs              ⬅️ EF (Commands)
│   │           └── IOrderQueryService.cs            ⬅️ Dapper (Queries)
│   │
│   ├── OrderManagement.Infrastructure/
│   │   ├── Persistence/
│   │   │   ├── ApplicationDbContextBase.cs          ⬅️ 50 DbSets here! ✅
│   │   │   └── Configurations/                     ⬅️ EF Configs only!
│   │   │       ├── OrderConfiguration.cs
│   │   │       ├── CustomerConfiguration.cs
│   │   │       └── ProductConfiguration.cs
│   │   └── OrderManagement.Infrastructure.csproj
│   │       └── References: Core + EF.Core
│   │
│   └── OrderManagement.Infrastructure.Postgres/
│       ├── Persistence/
│       │   └── PostgresDbContext.cs
│       ├── Repositories/
│       ├── Queries/
│       ├── Extensions/                             ⬅️ Extensions here!
│       │   └── PostgresExtensions.cs
│       └── OrderManagement.Infrastructure.Postgres.csproj
│           └── References: Core + Infrastructure + EF.Postgres + Dapper
```

---

## 📊 Dependency Graph (ถูกต้อง!)
```
Api.Http
  ├─ Application
  │   └─ Core
  └─ Infrastructure.Postgres
      ├─ Core
      └─ Infrastructure
          └─ Core

Api.Grpc
  ├─ Application
  │   └─ Core
  └─ Infrastructure.Postgres
      ├─ Core
      └─ Infrastructure
          └─ Core

Api.GraphQL
  ├─ Application
  │   └─ Core
  └─ Infrastructure.Postgres
      ├─ Core
      └─ Infrastructure
          └─ Core
```

**✅ ไม่มี circular dependency!**

---

## 🔄 ถ้ามีหลาย Database
```
OrderManagement.Infrastructure.Postgres/
  └── Extensions/
      └── PostgresExtensions.cs
          └── AddPostgres(services, config)

OrderManagement.Infrastructure.Oracle/
  └── Extensions/
      └── OracleExtensions.cs
          └── AddOracle(services, config)

---


// FastEndpoints version
public class CreateOrderEndpoint : Endpoint<CreateOrderRequest, OrderResponse>
{
    private readonly IOrderService _orderService; // Still one service
    
    public override void Configure()
    {
        Post("/api/orders");
    }
    
    public override async Task HandleAsync(CreateOrderRequest req, CancellationToken ct)
    {
        var dto = new CreateOrderDto
        {
            CustomerName = req.CustomerName,
            Email = req.Email,
            Amount = req.Amount
        };
        
        var order = await _orderService.CreateOrderAsync(dto);
        
        await SendAsync(new OrderResponse
        {
            Id = order.Id,
            CustomerName = order.CustomerName,
            Amount = order.Amount,
            Status = order.Status.ToString()
        }, cancellation: ct);
    }
}
```

---

## 🎯 CQRS Approach

### **Solution Structure**
```
OrderManagement.sln
│
├── src/
│   ├── OrderManagement.Api/              ⬅️ .csproj
│   │   ├── Features/                     # Vertical Slices
│   │   │   └── Orders/
│   │   │       ├── CreateOrder/          # One use case = one folder
│   │   │       │   ├── CreateOrderCommand.cs
│   │   │       │   ├── CreateOrderCommandHandler.cs
│   │   │       │   ├── CreateOrderValidator.cs
│   │   │       │   └── CreateOrderEndpoint.cs
│   │   │       │
│   │   │       ├── GetOrder/             # Separate folder for query
│   │   │       │   ├── GetOrderQuery.cs
│   │   │       │   ├── GetOrderQueryHandler.cs
│   │   │       │   └── GetOrderEndpoint.cs
│   │   │       │
│   │   │       ├── ListOrders/
│   │   │       │   └── ...
│   │   │       │
│   │   │       └── CancelOrder/
│   │   │           └── ...
│   │   │
│   │   ├── Middleware/
│   │   └── Program.cs
│   │
│   ├── OrderManagement.Core/             ⬅️ .csproj
│   │   ├── Domain/
│   │   │   ├── Entities/
│   │   │   ├── Interfaces/               # Only repository interfaces
│   │   │   │   └── IOrderRepository.cs
│   │   │   └── Exceptions/
│   │   │
│   │   └── Common/                       # Shared abstractions
│   │       ├── ICommandHandler.cs
│   │       ├── IQueryHandler.cs
│   │       └── Result.cs
│   │
│   └── OrderManagement.Infrastructure/   ⬅️ .csproj
│       └── (same as before)