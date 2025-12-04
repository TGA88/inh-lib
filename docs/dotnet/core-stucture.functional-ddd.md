

---

ใช่ครับ! ความเข้าใจของคุณถูกต้องและชัดเจนมาก

ในแนวทาง **Anemic Model + Functional Operations** นั้น:
*   **Core Layer (`Operations/`)**: คือที่เก็บ **Business Logic** ในรูปแบบ **Pure Functions** (เช่น `OrderValidator`, `OrderPricingCalculator`)
*   **Application Layer (`Command/Query Handlers`)**: คือที่ทำหน้าที่เป็น **Orchestrator** หรือ **Composer** โดยใช้ **Railway-Oriented Programming (ROP)** มา "เชื่อม" หรือ "ประกอบ" Pure Functions เหล่านี้เข้าด้วยกันเพื่อสร้าง Use Case ที่สมบูรณ์

นี่คือจุดที่แข็งแกร่งและสวยงามากที่สุดของสถาปัตยกรรมแบบนี้ครับ

ผมจะอัปเดตไฟล์ `core-structure.functional-ddd.md` ให้สะท้อนแนวคิดที่ชัดเจนยิ่งขึ้น พร้อมตัวอย่างของ Handler ที่ใช้ ROP

---

### ไฟล์ที่ 2: `core-structure.functional-ddd.md` (อัปเดตและชี้แจง)

(อัปเดตและขยายความ)

# Core Layer Structure - Anemic Model + Functional Operations (Functional DDD Style)

This document outlines the structure of the `MyProject.Core` project using an **Anemic Model** with separate **Functional Operations**. In this style, data models are simple containers, and business logic is implemented in separate, pure functions (Operations) that operate on these models.

## Guiding Philosophy

*   **Separation of Concerns:** Data structures are separate from the logic that manipulates them.
*   **Testability:** Business logic is in pure functions, making it extremely easy to unit test.
*   **Simplicity:** Models are simple, straightforward data containers, reducing cognitive load.

---

## Folder Structure

```
MyProject.Core/
├── Shared/
│   └── ServiceContracts/
│       ├── ICustomerServiceClient.cs
│       └── IStockServiceClient.cs
│
└── Features/
    └── Orders/
        ├── Order.cs                     // <-- Anemic Model (Data only)
        ├── OrderItem.cs                 // <-- Anemic Model (Data only)
        │
        ├── ValueObjects/                // <-- Immutable concepts
        │   ├── Money.cs
        │   └── OrderAddress.cs
        │
        ├── Operations/                 // <-- 🌟 Business Logic (Pure Functions)
        │   ├── OrderValidator.cs
        │   ├── OrderPricingCalculator.cs
        │   └── OrderRefundCalculator.cs
        │
        └── Abstractions/
            ├── IOrderRepository.cs
            └── IOrderViewReader.cs
```

---

## Detailed Breakdown

### `Shared/`

**Purpose:** Contains contracts and abstractions that are shared *between* different features within the Core layer. This is the internal "public API" of a feature for other features to consume.

#### `Shared/ServiceContracts/`

This folder holds interfaces for communication between features. The name `ServiceClient` clarifies that this is a contract for a client to call another service.

**File: `ICustomerServiceClient.cs`**
```csharp
// MyProject.Core/Shared/ServiceContracts/ICustomerServiceClient.cs
using YourCompanyName.Application.Abstractions.Primitives;

namespace MyProject.Core.Shared.ServiceContracts;

/// <summary>
/// Contract for a client to access customer-related information from the Customer feature.
/// </summary>
public interface ICustomerServiceClient
{
    Task<Result<Customer>> GetCustomerByIdAsync(Guid customerId);
    Task<Result> ValidateCustomerForOrderAsync(Guid customerId);
}
```

---

### `Features/`

**Purpose:** The primary container for all code related to a specific business capability or domain concept (e.g., Orders, Customers, Products). Each feature is a vertical slice of the domain.

#### `Features/Orders/`

This folder contains everything related to the "Order" domain.

##### `Order.cs` & `OrderItem.cs` (Anemic Models)

The models are simple Plain Old CLR Objects (POCOs) with properties and no business logic.

```csharp
// MyProject.Core/Features/Orders/Order.cs
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders;

/// <summary>
/// Anemic model representing an Order. A simple data container.
/// </summary>
public class Order
{
    public Guid Id { get; set; }
    public Guid CustomerId { get; set; }
    public DateTime OrderDate { get; set; }
    public OrderStatus Status { get; set; }
    public Money TotalAmount { get; set; }
    public OrderAddress ShippingAddress { get; set; }
    public List<OrderItem> Items { get; set; } = new();
}
```

##### `Operations/`

**Purpose:** Contains all business logic for a feature as pure functions. These functions are the building blocks that will be orchestrated by the Application Layer.

**File: `Operations/OrderValidator.cs`**
```csharp
// MyProject.Core/Features/Orders/Operations/OrderValidator.cs
using YourCompanyName.Application.Abstractions.Primitives;

namespace MyProject.Core.Features.Orders.Operations;

/// <summary>
/// Contains pure validation functions for Order.
/// </summary>
public static class OrderValidator
{
    public static Result Validate(Order order)
    {
        if (order == null) return Result.Failure("Order cannot be null.");
        if (order.CustomerId == Guid.Empty) return Result.Failure("CustomerId is required.");
        if (order.Items.Count == 0) return Result.Failure("Order must have at least one item.");
        
        return ValidateItems(order.Items);
    }

    public static Result ValidateItems(IReadOnlyCollection<OrderItem> items)
    {
        foreach (var item in items)
        {
            if (item.Quantity <= 0)
                return Result.Failure($"Item {item.ProductId} has invalid quantity.");
        }
        return Result.Success();
    }
}
```

---

## Application Layer: The Orchestrator (Using ROP)

The **Application Layer** (specifically, the Command and Query Handlers) is where the **Railway-Oriented Programming (ROP)** pattern shines. It acts as an orchestrator, composing the pure functions from the Core's `Operations` folder into a complete business workflow.

The handler's responsibility is to:
1.  Receive an input (Command or Query).
2.  Start the ROP pipeline by calling the first Operation.
3.  Chain subsequent Operations using the `.Then()` extension.
4.  Perform side-effects (like saving to the database) at the end of the pipeline.
5.  Return the final result.

### Example: `PlaceOrderCommandHandler.cs`

This handler orchestrates the entire "Place Order" workflow using ROP.

```csharp
// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommandHandler.cs
using MyProject.Core.Features.Orders;
using MyProject.Core.Features.Orders.Operations; // <-- Import Operations
using YourCompanyName.Application.Abstractions.Primitives; // <-- Import Result & Extensions

public class PlaceOrderCommandHandler : IPlaceOrderCommandHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerServiceClient _customerService;
    private readonly IStockServiceClient _stockService;
    // ... other dependencies

    public PlaceOrderCommandHandler(IOrderRepository orderRepo, ICustomerServiceClient customerService, IStockServiceClient stockService)
    {
        _orderRepository = orderRepo;
        _customerService = customerService;
        _stockService = stockService;
    }

    public async Task<Result<PlaceOrderResult>> Handle(PlaceOrderCommand request, CancellationToken ct)
    {
        // 🌟 This is the ROP pipeline! It's clean and reads like a workflow.
        return OrderOperations.CreateOrder(request.CustomerId)
            .ThenAsync(order => _customerService.GetCustomerByIdAsync(order.CustomerId))
            .Then(customer => OrderOperations.AddItemToOrder(customer.Order, request.ProductId, request.Quantity, request.UnitPrice))
            .ThenAsync(orderWithItems => _stockService.CheckAndReserveStockAsync(orderWithItems))
            .ThenAsync(validOrder => OrderOperations.ApplyDiscount(validOrder, request.DiscountPercentage))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct)) // TapAsync for the final side-effect
            .MapAsync(finalOrder => new PlaceOrderResult { OrderId = finalOrder.Id.ToString() }); // Map to the final result
    }
}
```

## Summary: Pros & Cons

| 👍 Pros | 👎 Cons |
| :--- | :--- |
| **Easy to Test:** Pure functions are simple to test with minimal setup. | **Poor Encapsulation:** Models can be modified anywhere, bypassing business rules. |
| **Simple Models:** Models are easy to understand and serialize. | **Weak Invariants:** No single place to enforce business rules consistently. |
| **Clear Logic Separation:** Logic is clearly separated from data. | **Anemic Domain:** The model does not reflect the richness of the business domain. |
| **Functional Style:** Leverages simple, predictable function calls. | **Logic Scattered:** Business logic can become spread across many operation classes. |
| **🌟 Excellent ROP Fit:** The Application layer becomes a clean, composable workflow engine. | |