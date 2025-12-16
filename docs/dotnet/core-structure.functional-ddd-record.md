# Core Layer Structure - Functional DDD with Anemic Models (C# record-first)

This guide shows how to implement a Functional/ROP-friendly architecture using **anemic models** defined as C# `record` types plus **pure Operations**. It favors testability, immutability, and composability.

## Guiding principles
- Data first: `record` models are simple data carriers; no behavior lives inside them.
- Pure logic: Business rules live in `Operations/*` functions. Keep them side-effect free.
- Composition: Application layer handlers orchestrate Operations with Railway-Oriented Programming (ROP).
- Immutability by default: `record` (and `record struct` when appropriate) gives structural equality and easy cloning via `with`.

## Suggested folder structure (Business Operation–named files)
```
MyProject.Core/
├── Shared/
│   └── ServiceContracts/
│       ├── ICustomerServiceClient.cs
│       └── IStockServiceClient.cs
│
└── Features/
    └── Orders/
        ├── Order.cs                     // record models (anemic)
        ├── OrderItem.cs                 // record models (anemic)
        │
        ├── ValueObjects/                // immutable value types
        │   ├── Money.cs
        │   └── OrderAddress.cs
        │
        ├── Operations/                  // pure business functions per use case
        │   ├── PlaceOrderOperations.cs   // use-case specific
        │   ├── UpdateOrderOperations.cs  // use-case specific
        │   ├── RefundOrderOperations.cs  // use-case specific
        │   └── Shared/                  // cross-operation rules (one rule per file)
        │       ├── ComputeLineTotalRule.cs
        │       ├── SumTotalsRule.cs
        │       ├── ValidateOrderBasicsRule.cs
        │       └── EnsureReservableRule.cs
        │
        └── Abstractions/
            ├── IOrderRepository.cs
            └── IOrderViewReader.cs
```

## Anemic models as records
Use `record` for reference semantics + value equality. Avoid behavior beyond simple factory helpers if needed.

**Order.cs**
```csharp
// MyProject.Core/Features/Orders/Order.cs
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders;

public record Order(
    Guid Id,
    Guid CustomerId,
    DateTime OrderDate,
    OrderStatus Status,
    Money TotalAmount,
    OrderAddress ShippingAddress,
    IReadOnlyList<OrderItem> Items
);
```

**OrderItem.cs**
```csharp
// MyProject.Core/Features/Orders/OrderItem.cs
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders;

public record OrderItem(
    string ProductId,
    int Quantity,
    Money UnitPrice
)
{
    public Money LineTotal => UnitPrice * Quantity;
}
```

**Value objects stay immutable (business constraints live here)**
```csharp
// MyProject.Core/Features/Orders/ValueObjects/Money.cs
namespace MyProject.Core.Features.Orders.ValueObjects;

public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Zero(string currency) => new(0m, currency);
    public static Money operator +(Money left, Money right)
        => EnsureSameCurrency(left, right) with { Amount = left.Amount + right.Amount };

    public static Money operator *(Money money, int quantity)
        => money with { Amount = money.Amount * quantity };

    private static Money EnsureSameCurrency(Money left, Money right)
    {
        if (!string.Equals(left.Currency, right.Currency, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Currency mismatch");
        return left;
    }
}
```
*Why keep Value Objects?* They enforce localized invariants (currency match, valid address, etc.) near the data, reduce duplicated checks inside Operations, and improve type safety. If a type has no domain rule at all, you can inline it as primitives, but most domain concepts (money, email, address) benefit from a VO.

## Functional Operations (pure functions)
Keep them static and side-effect free. Return `Result` for ROP compatibility.

**PlaceOrderOperations.cs** (โฟกัสที่ use case Place Order)
```csharp
// Features/Orders/Operations/PlaceOrderOperations.cs
using YourCompanyName.Application.Abstractions.Primitives;
using MyProject.Core.Features.Orders.Operations.Shared;
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders.Operations;

public static class PlaceOrderOperations
{
    public static Result<Order> CreateDraft(Guid customerId, OrderAddress address, string currency)
    {
        if (customerId == Guid.Empty)
            return Result.Failure<Order>("CustomerId is required");
        if (address is null)
            return Result.Failure<Order>("Shipping address is required");

        var order = new Order(
            Id: Guid.NewGuid(),
            CustomerId: customerId,
            OrderDate: DateTime.UtcNow,
            Status: OrderStatus.Draft,
            TotalAmount: Money.Zero(currency),
            ShippingAddress: address,
            Items: Array.Empty<OrderItem>()
        );
        return Result.Success(order);
    }

    public static Result<Order> AddItem(Order order, string productId, int quantity, Money price)
    {
        if (order is null) return Result.Failure<Order>("Order cannot be null");
        if (string.IsNullOrWhiteSpace(productId)) return Result.Failure<Order>("ProductId is required");

        return ComputeLineTotalRule.Execute(price, quantity)
            .Map(lineTotal => new OrderItem(productId, quantity, price))
            .Map(item => order with { Items = order.Items.Concat(new[] { item }).ToArray() });
    }

    public static Result<Order> SumLineTotals(Order order)
    {
        if (order is null) return Result.Failure<Order>("Order cannot be null");
        var totals = order.Items.Select(i => i.LineTotal);
        return SumTotalsRule.Execute(order.TotalAmount.Currency, totals)
            .Map(sum => order with { TotalAmount = sum });
    }

    public static Result<Order> ApplyDiscount(Order order, decimal percent)
    {
        if (order is null) return Result.Failure<Order>("Order cannot be null");
        if (percent is < 0 or > 100) return Result.Failure<Order>("Discount percent must be 0-100");

        var factor = 1m - (percent / 100m);
        var discounted = order.TotalAmount with { Amount = order.TotalAmount.Amount * factor };
        return Result.Success(order with { TotalAmount = discounted });
    }

    public static Result<Order> CalculateTax(Order order, decimal taxRatePercent)
    {
        if (order is null) return Result.Failure<Order>("Order cannot be null");
        if (taxRatePercent < 0) return Result.Failure<Order>("Tax rate cannot be negative");

        var tax = order.TotalAmount with
        {
            Amount = order.TotalAmount.Amount * (taxRatePercent / 100m)
        };

        var newTotal = order.TotalAmount + tax;
        return Result.Success(order with { TotalAmount = newTotal });
    }
}
```

## Application layer as orchestrator (ROP)
Handlers compose Operations, defer side-effects to boundaries.

```csharp
// MyProject.Application/Features/Orders/PlaceOrder/PlaceOrderCommandHandler.cs
using MyProject.Core.Features.Orders;
using MyProject.Core.Features.Orders.Operations;
using YourCompanyName.Application.Abstractions.Primitives;

public class PlaceOrderCommandHandler : IPlaceOrderCommandHandler
{
    private readonly IOrderRepository _orderRepository;
    private readonly ICustomerServiceClient _customerService;
    private readonly IStockServiceClient _stockService;

    public PlaceOrderCommandHandler(
        IOrderRepository orderRepository,
        ICustomerServiceClient customerService,
        IStockServiceClient stockService)
    {
        _orderRepository = orderRepository;
        _customerService = customerService;
        _stockService = stockService;
    }

    public Task<Result<PlaceOrderResult>> Handle(PlaceOrderCommand cmd, CancellationToken ct)
    {
        return PlaceOrderOperations.CreateDraft(cmd.CustomerId, cmd.ShippingAddress, cmd.Currency)
            .ThenAsync(order => _customerService.ValidateCustomerForOrderAsync(order.CustomerId)
                .Map(() => order))
            .Then(order => PlaceOrderOperations.AddItem(order, cmd.ProductId, cmd.Quantity, cmd.UnitPrice))
            .Then(PlaceOrderOperations.SumLineTotals)
            .Then(order => PlaceOrderOperations.ApplyDiscount(order, cmd.DiscountPercent))
            .Then(order => PlaceOrderOperations.CalculateTax(order, cmd.TaxRatePercent))
            .Then(ValidateOrderBasicsRule.Execute)
            .ThenAsync(validOrder => _stockService.CheckAndReserveStockAsync(validOrder)
                .Map(() => validOrder))
            .TapAsync(finalOrder => _orderRepository.AddAsync(finalOrder, ct))
            .MapAsync(finalOrder => new PlaceOrderResult { OrderId = finalOrder.Id });
    }
}
```

## Why `record` helps here
- Immutability-first: `with` cloning enables pure transformations without mutating inputs.
- Value semantics: Easier equality assertions in tests.
- Clearer intent: Readers see data-only structures; behavior stays in Operations.

## Testing tips
- Unit test Operations in isolation: no mocks needed; assert returned `Result` and new record values.
- Golden-path and edge-paths: cover nulls, empty items, invalid quantities, currency mismatches.
- Handler tests: mock only external ports (repository, services); keep Operations real.

## Trade-offs
- Encapsulation is looser: keep all invariants inside Operations and ensure handlers always go through them.
- More files: one record per file keeps diffs small and discoverable.
- With-expressions copy whole graphs: beware of large collections; if needed, favor immutable collections to avoid accidental mutation.

## Design principles: VO vs anemic models vs Operations vs Validators

- **Value Object (VO) = constraint on a single concept**
    - ใช้เมื่อมี invariant ติดกับค่าเดียว (currency match, email format, address validity, non-negative amount).
    - Immutable, equality สำคัญ, ไม่มี identity. ถ้าไม่มี invariant/semantic เลย ใช้ primitive หรือ record data ตรง ๆ.

- **Anemic model (record Entity/Aggregate)**
    - รวมข้อมูลที่เดินทางหลาย use case; ไม่บรรจุกฎธุรกิจหนัก ๆ ภายใน (อยู่ที่ Operations).
    - ใช้ `record`/`record struct` เพื่อ immutability + with-clone; อนุญาต derived prop เบา ๆ ได้.

- **Operations folder = business rules/workflows as pure functions**
    - ไฟล์หลักตั้งตาม Business Operation (Command/Query) เช่น `PlaceOrderOperations`, `UpdateOrderOperations`; หลายเมธอดในไฟล์เดียวได้ถ้าอยู่ใน use case เดียวกัน.
    - กฎ/ฟังก์ชันที่ใช้ซ้ำข้ามหลาย Operation ใน feature เดียว แยกไป `Operations/Shared/` เป็น **หนึ่งกฎต่อหนึ่งไฟล์** เช่น `ComputeLineTotalRule.cs`, `SumTotalsRule.cs`, `ValidateOrderBasicsRule.cs`, `EnsureReservableRule.cs` เพื่อป้องกัน grab-bag.
    - ทุกฟังก์ชันเป็น pure, ไม่มี side-effect, คืน `Result<T>` / `Result`.

- **Validators ชั้น Application (FluentValidation บน Command/Query DTO)**
    - ตรวจรูปแบบ/shape ของ request (NotEmpty, length, regex, enum valid, list not empty) เพื่อกัน bad input ก่อน map เข้าสู่ domain.
    - ไม่บรรจุกฎธุรกิจเชิง domain ลึก (ไม่เช็ก stock, credit, status transition).

- **Validators ชั้น Core (Operations/VO)**
    - บังคับกฎธุรกิจจริงบน domain model/VO (ต้องมี items, quantity > 0, currency consistent, status transition valid).
    - เป็นส่วนหนึ่งของ pipeline ROP หลัง mapping แล้ว; VO ควรป้องกัน invariant ตอนสร้าง.

### Quick routing cheat sheet
- กฎของ "ค่าเดียว" → VO.
- กฎที่ประกอบหลายค่า/หลาย entity → Operations.
- ตรวจรูปแบบคำสั่งที่เข้ามา → Application Validator.
- กฎที่ต้องรันเสมอก่อน persist/do business → Core Validator/Operations.
- กฎใช้ซ้ำข้ามหลาย Operation ใน feature เดียว → `Operations/Shared/<RuleSet>.cs`.

### Notes on "1 file = 1 rule" ใน Shared
- **ข้อดี:** cohesion สูง หาเร็ว diff เล็ก ลด conflict และป้องกัน grab-bag
- **ข้อเสีย:** ไฟล์อาจเยอะขึ้น กฎที่เกี่ยวข้องต้องเปิดหลายไฟล์ ต้องมี naming guideline เข้มแข็ง
- **Guideline ชื่อ:** ใช้รูปแบบ `{RuleName}Rule.cs` และ method สาธารณะเดียว `Execute(...)`
- **เมื่อไรควรรวม:** ถ้ากฎสั้นมากและสัมพันธ์กันแน่น อาจเริ่มรวมในไฟล์เดียว (พร้อมคอมเมนต์หัวข้อ) แต่เมื่อโต/ซ้ำ หรือ Sonar แจ้ง duplication ให้แยกเป็นไฟล์ละกฎทันที
- **ขอบเขต Shared:** ให้ `Operations/Shared/` เป็นของ feature นั้น; ถ้ากฎใช้ข้ามหลาย feature ค่อยย้ายไป `Core/Shared/Operations/`
- **เอกสารย่อย:** แนะนำมี README สั้นใน `Operations/Shared/` เพื่ออธิบาย naming และหลักแยก/รวม

## Convention (ถ้าเลือกตั้งชื่อไฟล์ตาม Business Operation)
- โครงสร้าง (ใน Feature อยู่แล้ว): `Features/{Feature}/Operations/{OperationName}Operations.cs` เช่น `Features/Orders/Operations/PlaceOrderOperations.cs`, `.../UpdateOrderOperations.cs` (ไม่ต้องใส่ชื่อ feature ซ้ำในไฟล์).
- ภายใน 1 ไฟล์ = concern ต่อ use case นั้น แต่ต้องมีคอมเมนต์สั้นบอกขั้นตอน/ลำดับ.
- การ reuse:
    - ถ้าฟังก์ชันซ้ำ/คล้ายกันระหว่าง Operation files ใน feature เดียว ให้ย้ายไป shared **ภายใน PR เดียวกัน** แล้วอัปเดตจุดเรียกทั้งหมด.
    - แนะนำใช้โฟลเดอร์ `Operations/Shared/` แยกตามชุดกฎ เช่น `Shared/PricingRules.cs`, `Shared/ValidationRules.cs`, `Shared/StockRules.cs` เพื่อลด grab-bag; กรณีกฎยังน้อยจะมีไฟล์เดียว `SharedRules.cs` ก็ได้ แต่ควรแตกออกเมื่อเริ่มโตหรือ Sonar แจ้งซ้ำ.
- การตั้งชื่อเมธอด: ใช้กริยา + stage เช่น `ValidateBasics`, `CalculatePricing`, `ApplyDiscount`, `CheckStock`, `EnsureStatusTransition`.
- Sonar เป็น safety net: ถ้าแจ้ง duplication ให้ refactor แล้วย้ายเข้าคลาส shared ก่อนปิด PR.
- Scope ของ shared ข้าม feature: ใช้ `Core/Shared/Operations/{Name}Rules.cs` ชื่อบ่งบอกโดเมนที่ใช้ร่วมกัน.

### Example shared rules file (ภายใน feature เดียว)
```csharp
// Features/Orders/Operations/Shared/ComputeLineTotalRule.cs
using YourCompanyName.Application.Abstractions.Primitives;
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders.Operations.Shared;

public static class ComputeLineTotalRule
{
    public static Result<Money> Execute(Money unitPrice, int quantity)
    {
        if (quantity <= 0) return Result.Failure<Money>("Quantity must be positive");
        return Result.Success(unitPrice * quantity);
    }
}
```

```csharp
// Features/Orders/Operations/Shared/SumTotalsRule.cs
using YourCompanyName.Application.Abstractions.Primitives;
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders.Operations.Shared;

public static class SumTotalsRule
{
    public static Result<Money> Execute(string currency, IEnumerable<Money> lines)
    {
        var total = lines.Aggregate(Money.Zero(currency), (acc, m) => acc + m);
        return Result.Success(total);
    }
}
```

```csharp
// Features/Orders/Operations/Shared/ValidateOrderBasicsRule.cs
using YourCompanyName.Application.Abstractions.Primitives;

namespace MyProject.Core.Features.Orders.Operations.Shared;

public static class ValidateOrderBasicsRule
{
    public static Result Execute(Order order)
    {
        if (order is null) return Result.Failure("Order cannot be null");
        if (order.CustomerId == Guid.Empty) return Result.Failure("CustomerId is required");
        if (order.Items.Count == 0) return Result.Failure("Order must have at least one item");
        if (order.Items.Any(i => i.Quantity <= 0)) return Result.Failure("Item quantity must be positive");
        return Result.Success();
    }
}
```

```csharp
// Features/Orders/Operations/Shared/EnsureReservableRule.cs
using YourCompanyName.Application.Abstractions.Primitives;

namespace MyProject.Core.Features.Orders.Operations.Shared;

public static class EnsureReservableRule
{
    public static Result Execute(IEnumerable<(string ProductId, int Quantity)> lines)
    {
        if (lines is null || !lines.Any())
            return Result.Failure("No items to reserve");
        if (lines.Any(l => l.Quantity <= 0))
            return Result.Failure("Quantity must be positive");
        return Result.Success();
    }
}
```
