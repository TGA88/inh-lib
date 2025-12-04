

# Core Layer Structure - Rich Domain Model (DDD Style)

This document outlines the structure of the `MyProject.Core` project using a **Rich Domain Model** approach, inspired by Domain-Driven Design (DDD). In this style, business logic (behavior) is encapsulated directly within domain objects (Entities and Value Objects).

## Guiding Philosophy

*   **Encapsulation:** Data and operations that modify that data live together.
*   **Rich Objects:** Domain objects are not just bags of data; they have behavior and enforce business rules (invariants).
*   **Ubiquitous Language:** The structure and naming of code should reflect the business domain language.

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
        ├── Order.cs                     // <-- Aggregate Root
        ├── OrderItem.cs                // <-- ⭐ Child Entity
        │
        ├── ValueObjects/
        │   ├── Money.cs
        │   └── OrderAddress.cs
        │
        └── Abstractions/
            ├── IOrderRepository.cs
            └── IOrderViewReader.cs
```

---

## Detailed Breakdown

### `OrderItem.cs` (Child Entity)

An Entity that exists only within the context of an `Order` Aggregate. It does not have a global identity and its lifecycle is managed by the `Order` Aggregate Root.

```csharp
// MyProject.Core/Features/Orders/OrderItem.cs
using MyProject.Core.Features.Orders.ValueObjects;

namespace MyProject.Core.Features.Orders;

/// <summary>
/// An Entity representing a single item within an Order.
/// It has no global identity, only within its parent Order.
/// </summary>
public class OrderItem
{
    public Guid Id { get; private set; }
    public string ProductId { get; private set; }
    public int Quantity { get; private set; }
    public Money UnitPrice { get; private set; }

    // Property that is calculated, not set.
    public Money LineTotal => UnitPrice * Quantity;

    // Constructor is internal to ensure creation is controlled by the parent Aggregate.
    internal OrderItem(string productId, int quantity, Money unitPrice)
    {
        Id = Guid.NewGuid();
        ProductId = productId;
        Quantity = quantity;
        UnitPrice = unitPrice;
    }

    // Method to modify state, called by the parent Aggregate.
    internal void UpdateQuantity(int newQuantity)
    {
        if (newQuantity <= 0)
            throw new InvalidOperationException("Quantity must be positive.");
            
        Quantity = newQuantity;
    }
}
```

### `Order.cs` (Aggregate Root)

The main entity that acts as the entry point for modifications to a cluster of related objects (the Aggregate).

```csharp
// MyProject.Core/Features/Orders/Order.cs
using MyProject.Core.Features.Orders.ValueObjects;
using YourCompanyName.Application.Abstractions.Primitives;

namespace MyProject.Core.Features.Orders;

/// <summary>
/// The Aggregate Root for the Order concept.
/// It is the sole entry point for modifying an order and its items.
/// </summary>
public class Order
{
    public Guid Id { get; private set; }
    public Guid CustomerId { get; private set; }
    public DateTime OrderDate { get; private set; }
    public OrderStatus Status { get; private set; }
    public Money TotalAmount { get; private set; }
    
    // ⭐ Child Entities are kept in a private collection.
    private readonly List<OrderItem> _items = new();
    
    // Expose a read-only version to the outside world.
    public IReadOnlyCollection<OrderItem> Items => _items.AsReadOnly();

    // ... (Factory Methods, Business Logic Methods like AddItem, MarkAsPaid)
    // The AddItem method would now create an instance of the separate OrderItem class.
    // var newItem = new OrderItem(productId, quantity, unitPrice);
    // _items.Add(newItem);
}
```

---

### Discussion: `OrderItem` - Separate File or Within `Order.cs`?

นี่คือประเด็นที่น่าสนใจในการออกแบบ DDD และมีข้อโต้วงทั้งสองด้าน

#### ✅ ข้อดีของการสร้างไฟล์แยก (`OrderItem.cs`)

1.  **Discoverability (หาง่าย):** นักพัฒนาสามารถค้นหา `OrderItem` ใน Solution Explorer ได้ทันที
2.  **Source Control (ควบคุมโค้ดง่าย):** การเปลี่ยนแปลงตรรกะของ `OrderItem` จะแสดงใน Git Diff เฉพาะส่วนนั้นๆ ไม่ต้องไปนั่งไล่ในไฟล์ใหญ่ๆ
3.  **File Size (ขนาดไฟล์):** ป้องกันไม่ให้ `Order.cs` กลายเป็นไฟล์ที่ใหญ่และอ่านยาก (God File)
4.  **Standard Practice (มาตรฐานทั่วไป):** IDE สมัยรุ่งและ workflow ส่วนใหญ่ๆ มักจะสนับสนุนให้มีหนึ่งคลาสต่อหนึ่งไฟล์

#### 👎 ข้อเสียของการสร้างไฟล์แยก

1.  **Looser Coupling (ความสัมพันธ์ที่หลวมลง):** มันอาจทำให้ดูเหมือนว่า `OrderItem` เป็นสิ่งที่แยกจากกันได้ แม้จริงๆ แล้วมันไม่ใช่
2.  **More Files (ไฟล์มากขึ้น):** ใน Aggregate ที่ซับซ้อน อาจจะมีไฟล์เยอะมากในโฟลเดอร์เดียว

#### ❓ ข้อดีของการเขียนรวมใน `Order.cs`

1.  **Tight Coupling (ความสัมพันธ์ที่แน่น):** สื่อให้เห็นชัดเจนว่า `OrderItem` เป็นส่วนหนึ่งของ `Order` และไม่มีความหมายถ้าไม่มี `Order`
2.  **Co-location (อยู่ในที่เดียวกัน):** ทุกอย่างที่เกี่ยวข้องกับ `Order` Aggregate อยู่ในไฟล์เดียว

---

### 📌 คำแนะนำของผม: **ใช้ไฟล์แยก**

สำหรับโปรเจคในโลกแห่งความเป็นจริงและการทำงานเป็นทีม **การสร้างไฟล์แยก (`OrderItem.cs`) ดีกว่า**

เหตุผลหลักคือ **ความสามารถในการบำรุงรักษา (Maintainability)** และ **การทำงานร่วมกับเครื่องมือสมัยรุ่ง (IDE/Tooling)** แม้ว่ามันจะทำให้ความสัมพันธ์ดูหลวมลงเล็กน้อย แต่เราสามารถควบคุมเรื่องนี้ได้ด้วย:
*   การใช้ `internal` constructor และ `internal` methods ใน `OrderItem` เพื่อให้แน่ใจว่ามันถูกเรียกใช้งานได้เฉพาะภายใน `MyProject.Core` (หรือภายใน Assembly เดียวกัน)
*   การวางไฟล์ไว้ในโฟลเดอร์เดียวกัน (`Features/Orders/`) ก็ยังคงสื่อถึงความสัมพันธ์ของมันได้ดี

ดังนั้น โครงสร้างที่แนะนำคือการสร้าง `OrderItem.cs` เป็นไฟล์แยก เพื่อประโยชน์ด้านการทำงานจริงและการบำรุงรักษาในระยะยาว