

แน่นอนครับ! ผมได้ปรับปรุงและเพิ่มเนื้อหาที่เราคุยกันทั้งหมดลงไปในเอกสาร Markdown เพื่อให้มันครอบคลุมและสมบูรณ์ยิ่งขึ้น นี่คือเวอร์ชันที่อัปเดตแล้วครับ

---

# คู่มือการใช้งาน `sealed` และ `record` ใน .NET (C#) - ฉบับสมบูรณ์

เอกสารนี้จะอธิบายถึง `sealed class` และ `record` ในภาษา C# ซึ่งเป็นฟีเจอร์สำคัญสำหรับการเขียนโปรแกรมสมัยใหม่ที่เน้นความปลอดภัย ความถูกต้อง และประสิทธิภาพ พร้อมทั้งลงลึกถึงหัวข้อขั้นสูงเพื่อการใช้งานในระดับ Production

## สารบัญ

1.  [`sealed class`](#1-sealed-class)
2.  [`record`](#2-record)
3.  [ปัญหา "กับดัก" ของ `record`: การใช้งานกับ Reference Type](#3-ปญหากับดัก-ของ-record-การใช้งานกับ-reference-type)
4.  [โซลูชันแนะนำ: การสร้าง True Immutability](#4-โซลูชันแนะนำ-การสร้าง-true-immutability)
5.  [หัวข้อขั้นสูง: การเลือกใช้ Collection และการเพิ่มประสิทธิภาพ](#5-หัวข้อขั้นสูง-การเลือกใช้-collection-และการเพิ่มประสิทธิภาพ)
6.  [สรุปและคำแนะนำสุดท้าย](#6-สรุปและคำแนะนำสุดท้าย)

---

## 1. `sealed class`

### คืออะไร?

`sealed class` คือคลาสที่ **ไม่สามารถสืบทอด (inherit) ไปยังคลาสอื่นๆ ได้** คำว่า `sealed` แปลว่า "ปิดผนึก" ซึ่งหมายความว่าเราปิดทางการสืบทอดของคลาสนั้นไว้ไม่ให้ใครแก้ไขหรือเพิ่มเติมพฤติกรรมจากคลาสนี้ได้อีก

### ทำงานยังไง?

คอมไพเลอร์จะป้องกันไม่ให้คลาสอื่นๆ ใช้ `:` เพื่อสืบทอดจากคลาสที่ถูก `sealed` ไว้ ถ้าพยายามสืบทอดจะเกิด Compile Error ทันที

### ตัวอย่างโค้ด

```csharp
// คลาสปกติ สามารถสืบทอดได้
public class Vehicle 
{
    public void Move() => Console.WriteLine("Vehicle is moving.");
}

// คลาสแบบ sealed สืบทอดจาก Vehicle ได้
public sealed class Car : Vehicle 
{
    public void Honk() => Console.WriteLine("Beep beep!");
}

// !!! ส่วนนี้จะเกิด Error ไม่สามารถคอมไพล์ได้ !!!
// เพราะไม่สามารถสืบทอดจากคลาสที่เป็น sealed ได้
// public class SportsCar : Car 
// {
//     public void TurboBoost() { }
// }
```

### ข้อดี

*   **ความปลอดภัย:** ป้องกันการแก้ไขพฤติกรรมที่ไม่ได้ตั้งใจจากคลาสลูก ทำให้โค้ดมั่นคงและทำนายได้ง่ายขึ้น
*   **การออกแบบที่ชัดเจน:** สื่อสารได้ดีว่าคลาสนี้มีพฤติกรรมสุดท้ายแล้ว ไม่ต้องการให้ขยายความสามารถ
*   **ประสิทธิภาพ:** ในบางกรณี คอมไพเลอร์สามารถทำการ optimize (เพิ่มประสิทธิภาพ) โค้ดได้ดีขึ้นเพราะรู้ว่าจะไม่มีคลาสลูก

### ข้อเสีย

*   **ยืดหยุ่นน้อยลง:** ลดความสามารถในการขยายหรือปรับแต่งคลาสในอนาคต

---

## 2. `record`

### คืออะไร?

`record` เป็นประเภทข้อมูล (type) ที่ถูกออกแบบมาเพื่อใช้สำหรับเก็บข้อมูลโดยเฉพาะ โดยมีจุดเด่นหลักๆ คือ:

1.  **Immutability (ความไม่เปลี่ยนแปลง):** โดยค่าเริ่มต้น ข้อมูลภายใน record จะไม่สามารถเปลี่ยนแปลงได้หลังจากสร้างแล้ว
2.  **Value-based Equality (การเปรียบเทียบแบบค่า):** เมื่อเปรียบเทียบ record สองตัว มันจะดูว่าข้อมูลข้างในเหมือนกันหรือไม่ ไม่ใช่ดูว่าเป็นออบเจกต์ตัวเดียวกันหรือเปล่า

### ทำงานยังไง?

Record ช่วยลดโค้ดที่ต้องเขียนซ้ำๆ (boilerplate code) ลงไปได้มาก เช่น การเขียน constructor, การเขียน `Equals()`, `GetHashCode()`, และ `ToString()` มันจะสร้างให้เราโดยอัตโนมัติ

### ตัวอย่างโค้ด

```csharp
// การประกาศ record แบบสั้นๆ (Positional Record)
// C# จะสร้าง property ชื่อ FirstName และ LastName ให้โดยอัตโนมัติ
public record Person(string FirstName, string LastName);

// การใช้งาน
var person1 = new Person("สมชาย", "ใจดี");
var person2 = new Person("สมชาย", "ใจดี");
var person3 = person1 with { LastName = "รักษ์ดี" }; // ใช้ 'with' expression เพื่อสร้างออบเจกต์ใหม่

// ทดสอบการเปรียบเทียบ (Value-based Equality)
Console.WriteLine(person1 == person2); // ผลลัพธ์: True (เพราะข้อมูลข้างในเหมือนกัน)
Console.WriteLine(person1 == person3); // ผลลัพธ์: False (เพราะ LastName ไม่เหมือนกัน)

// ToString() ให้ฟรี!
Console.WriteLine(person1); 
// ผลลัพธ์: Person { FirstName = สมชาย, LastName = ใจดี }

// ลองเปลี่ยนค่าโดยตรง (จะ Error)
// person1.FirstName = "สมหญิง"; // Error: Init-only property can only be assigned in a constructor
```

### ข้อดี

*   **ลดโค้ดซ้ำ:** ไม่ต้องเขียน constructor, `Equals`, `GetHashCode`, `ToString` เอง
*   **Immutability โดยค่าเริ่มต้น:** ทำให้โค้ดปลอดภัยและเข้าใจง่าย
*   **Value-based Equality:** เปรียบเทียบข้อมูลได้ตรงไปตรงมา สะดวกสำหรับการเปรียบเทียบ DTO
*   **`with` expression:** สร้างออบเจกต์ใหม่ที่เหมือนเดิมแต่เปลี่ยนแค่บางค่าได้อย่างสวยงาม

### ข้อเสีย

*   **Shallow Immutability (อสมการแบบตื้น):** ถ้า property ของ record เป็น reference type (เช่น `List`, `Array`) ตัวแปรนั้นจะไม่เปลี่ยนทางชี้ แต่ข้อมูลข้างในยังสามารถถูกแก้ไขได้ ซึ่งอาจทำให้เกิดปัญหาได้ (ดูรายละเอียดในหัวข้อถัดไป)

---

## 3. ปัญหา "กับดัก" ของ `record`: การใช้งานกับ Reference Type

เนื่องจาก `record` มีความเป็น Immutability แบบ Shallow การใช้งานร่วมกับ Reference Type ที่เปลี่ยนแปลงได้ (Mutable) อาจนำไปสู่พฤติกรรมที่ไม่คาดคิด

### ตัวอย่างโค้ดที่แสดงปัญหา

```csharp
// Record ที่มี property ชนิด List<string> (ซึ่งเป็น reference type)
public record ShoppingCart(string UserId, List<string> Items);

// 1. สร้าง object ของ ShoppingCart
var cart1 = new ShoppingCart("user123", new List<string> { "น้ำดื่ม", "ขนมปัง" });

// 2. แก้ไข *ข้อมูลข้างใน* List ได้!
cart1.Items.Add("โคล่า");

// 3. ตรวจสอบผลลัพธ์
Console.WriteLine(string.Join(", ", cart1.Items));
// ผลลัพธ์: น้ำดื่ม, ขนมปัง, โคล่า <-- เห็นไหมครับ? มันเปลี่ยนไปแล้ว!
```

### ปัญหาของการเปรียบเทียบ (`Equals`)

เมื่อเปรียบเทียบ record ที่มี reference type การเปรียบเทียบจะใช้ **Reference Equality** (ดูว่าชี้ไปที่ object เดียวกันหรือไม่) ไม่ใช่เปรียบเทียบค่าข้างใน

```csharp
var sharedItems = new List<string> { "น้ำดื่ม" };
var cartA = new ShoppingCart("user123", sharedItems);
var cartB = new ShoppingCart("user123", sharedItems);

Console.WriteLine(cartA == cartB); // True (เพราะชี้ไป List ตัวเดียวกัน)

cartA.Items.Add("โคล่า"); // แก้ไขข้อมูลผ่าน cartA

Console.WriteLine(cartA == cartB); // ยังคงเป็น True! แม้ว่าข้อมูลภายในจะเปลี่ยนไปแล้ว
Console.WriteLine(string.Join(", ", cartB.Items)); // cartB เปลี่ยนตามด้วย!
```

---

## 4. โซลูชันแนะนำ: การสร้าง True Immutability

เพื่อแก้ไขปัญหาข้างต้น เราต้องทำให้ collection ของเราเป็นแบบ Immutable จริงๆ

### โซลูชันที่ 1: ใช้ Immutable Collection (แนะนำ)

ใช้ Interface ที่รับประกันได้ว่าจะอ่านได้อย่างเดียว เช่น `IReadOnlyList<T>`

#### ตัวอย่างโค้ด

```csharp
using System.Collections.Generic;

public record SafeShoppingCart(string UserId, IReadOnlyList<string> Items);

var products = new List<string> { "คีย์บอร์ด", "เมาส์" };
var cart = new SafeShoppingCart("user123", products);

// แก้ไข List ต้นทาง
products.Add("จอภาพ");

// ค่าใน cart จะไม่เปลี่ยนแปลง
Console.WriteLine(string.Join(", ", cart.Items)); 
// ผลลัพธ์: คีย์บอร์ด, เมาส์

// และไม่สามารถแก้ไขจาก cart ได้โดยตรง
// cart.Items.Add("หูฟัง"); // Compile Error
```

#### ข้อดี

*   **ปลอดภัยสูงสุด:** ถูกออกแบบมาเพื่อนี้โดยเฉพาะ
*   **สื่อสารได้ดี:** `IReadOnlyList` บอกเจตนาได้ชัดเจนว่า "อ่านได้อย่างเดียว"
*   **Thread-Safe:** ไม่ต้องกลัว Race Condition

#### ข้อควรระวัง

*   การ "แก้ไข" ต้องทำโดยการสร้าง object ใหม่เสมอ (ดูวิธีการในหัวข้อถัดไป)

### วิธีการ "แก้ไข" ค่าใน Immutable Collection

เราใช้ `with` expression ร่วมกับการสร้าง collection ใหม่

```csharp
var cart = new SafeShoppingCart("user123", new List<string> { "น้ำดื่ม" });

// วิธีที่ 1: ใช้ LINQ Concat (แนะนำ)
cart = cart with { Items = cart.Items.Concat(new[] { "ขนมปัง" }) };

// วิธีที่ 2: แปลงเป็น List แล้วเพิ่ม
// var newItemList = cart.Items.ToList();
// newItemList.Add("ขนมปัง");
// cart = cart with { Items = newItemList };

Console.WriteLine(string.Join(", ", cart.Items));
// ผลลัพธ์: น้ำดื่ม, ขนมปัง
```

**เทคนิค:** สร้าง Method ภายใน record เพื่อให้ใช้งานง่ายขึ้น

```csharp
public record SafeShoppingCart(string UserId, IReadOnlyList<string> Items)
{
    public SafeShoppingCart AddItem(string newItem)
    {
        return this with { Items = this.Items.Concat(new[] { newItem }) };
    }
}

var cart = new SafeShoppingCart("user123", new List<string> { "น้ำดื่ม" });
cart = cart.AddItem("โคล่า"); // ใช้งานสวยงามขึ้น
```

### โซลูชันที่ 2: ทำ Defensive Copy ใน Constructor

รับ collection ธรรมดาเข้ามา แล้วสร้างสำเนาไว้เป็นของตัวเอง

#### ตัวอย่างโค้ด

```csharp
using System.Collections.Generic;
using System.Linq;

public record DefensiveShoppingCart(string UserId, IEnumerable<string> productNames)
{
    // สร้าง property แบบอ่านได้อย่างเดียว และทำการสำเนาใน constructor
    public IReadOnlyList<string> Items { get; } = productNames.ToList().AsReadOnly();
}

var products = new List<string> { "คีย์บอร์ด", "เมาส์" };
var cart = new DefensiveShoppingCart("user123", products);

products.Add("จอภาพ"); // แก้ไข List ต้นทาง

Console.WriteLine(string.Join(", ", cart.Items)); 
// ผลลัพธ์: คีย์บอร์ด, เมาส์ (ปลอดภัย)
```

#### ข้อดี

*   ยืดหยุ่น: สามารถรับ `IEnumerable` ได้หลากหลายประเภท
*   ไม่ต้องพึ่งพาภายนอก (ใช้แค่ `System.Linq`)

#### ข้อเสีย (อันตราย!)

*   **ง่ายต่อการทำผิด:** ถ้าลืม `.ToList()` หรือ `.AsReadOnly()` จะกลับไปเป็นปัญหาเดิม
*   **มีช่องโหว่ Thread Safety:** ถ้า Thread อื่นแก้ไข `productNames` ระหว่างที่ constructor ทำงาน อาจได้ข้อมูลผิดพลาด

---


แน่นอนครับ! ผมได้เพิ่มตัวอย่างโค้ดที่สมบูรณ์และคำอธิบายละเอียดในหัวข้อที่ 5 ให้คุณแล้ว นี่คือส่วนที่อัปเดตเพิ่มเติมครับ คุณสามารถนำไปแทนที่ส่วนเดิมในเอกสารของคุณได้เลย

---

## 5. หัวข้อขั้นสูง: การเลือกใช้ Collection และการเพิ่มประสิทธิภาพ

### `IReadOnlyList` vs. `IImmutableList` ต่างกันอย่างไร?

| คุณสมบัติ | `IReadOnlyList` | `IImmutableList` |
| :--- | :--- | :--- |
| **แหล่งที่มา** | `System.Collections.Generic` (มากับ .NET เลย) | `System.Collections.Immutable` (ต้องติดตั้ง NuGet) |
| **แนวคิด** | เป็น **Interface สำหรับอ่านอย่างเดียว** (Read-only *interface*) | เป็น **Interface สำหรับคอลเลกชันที่ไม่เปลี่ยนแปลงจริง** (Truly *immutable collection*) |
| **การรับประกัน** | **ไม่รับประกัน** ว่าข้อมูลจะไม่เปลี่ยนแปลง (มี "กับดัก") | **รับประกัน** ว่าข้อมูลจะไม่เปลี่ยนแปลง ทุกการ "แก้ไข" จะสร้าง instance ใหม่ |
| **ประสิทธิภาพ (การแก้ไข)** | **ช้ามาก O(n)** ถ้าต้องสร้างใหม่ (ต้องคัดลอกทั้งหมด) | **สูงสำหรับการแก้ไขหลายครั้ง** เพราะใช้ "Structural Sharing" |

**สรุป:** `IReadOnlyList` เป็น "หน้าต่างที่มองออกไปเห็นแต่ไม่สามารถเปิดออกไปแก้ไขของข้างนอกได้" แต่ถ้ามีคนอยู่ข้างนอกแล้วเปิดประตูเข้าไปแก้ไขเอง คุณที่อยู่ในห้องจะเห็นการเปลี่ยนแปลงนั้น ส่วน `IImmutableList` เป็น "ภาพถ่าย" มันคือสิ่งที่ถูกสร้างขึ้นมาแล้วและไม่สามารถเปลี่ยนแปลงได้อีกต่อไป

### ประสิทธิภาพของ `with` expression กับ Collection

ปัญหาไม่ได้อยู่ที่ `with` expression แต่อยู่ที่ **"วิธีการสร้าง collection ใหม่"** ภายใน `with` block

#### หัวใจของประสิทธิภาพ: Structural Sharing

`IImmutableList.Add` ไม่ได้คัดลอกข้อมูลทั้งหมด แต่ใช้เทคนิคที่เรียกว่า **Structural Sharing (การแชร์โครงสร้าง)** ทำให้การเพิ่มข้อมูลมีประสิทธิภาพเกือบเป็น **O(1) (คงที่)** ไม่ว่า List จะใหญ่แค่ไหน

---

### การเปรียบเทียบประสิทธิภาพ: ตัวอย่างโค้ดเต็มรูปแบบ

มาดูตัวอย่างโค้ดที่ชัดเจนของแต่ละวิธีกันครับ สมมติว่าเรามี `record` ที่ต้องการเพิ่มสินค้าเข้าไปในตะกร้า

#### ตัวอย่างที่ 1: ใช้ `ImmutableList.Add()` (เร็วที่สุด - แนะนำ)

วิธีนี้ใช้ประโยชน์จาก Structural Sharing ทำให้ไม่ต้องคัดลอกข้อมูลทั้งหมด

```csharp
using System;
using System.Collections.Immutable;
using System.Linq;

// Record ที่ใช้ IImmutableList
public sealed record HighPerformanceCart(string UserId, IImmutableList<string> Items);

// สร้างตะกร้าสินค้าเริ่มต้น
var cart = new HighPerformanceCart("user123", ImmutableList.Create("ขนมปัง", "น้ำดื่ม"));
Console.WriteLine($"ตะกร้าเดิม: {string.Join(", ", cart.Items)}");

// เพิ่มสินค้าใหม่ด้วย with expression และ ImmutableList.Add()
// การดำเนินการนี้เร็วมาก (เกือบ O(1)) เพราะไม่ต้องคัดลอก "ขนมปัง" และ "น้ำดื่ม"
var updatedCart = cart with { Items = cart.Items.Add("โคล่า") };

Console.WriteLine($"ตะกร้าใหม่: {string.Join(", ", updatedCart.Items)}");

// ผลลัพธ์:
// ตะกร้าเดิม: ขนมปัง, น้ำดื่ม
// ตะกร้าใหม่: ขนมปัง, น้ำดื่ม, โคล่า
```

**คำอธิบาย:** `cart.Items.Add("โคล่า")` ไม่ได้ไปแก้ไข List เดิม แต่สร้าง `IImmutableList` ตัวใหม่ที่ชี้ไปที่ข้อมูลเดิมและเพิ่ม "โคล่า" เข้าไปที่ท้ายสุด ทำให้การทำงานเร็วและใช้หน่วยความจำน้อยมาก

---

#### ตัวอย่างที่ 2: ใช้ `ToList().Add()` (ช้ามาก - ไม่แนะนำสำหรับ List ใหญ่)

วิธีนี้ต้องคัดลอกข้อมูลทุกตัวไปยัง List ใหม่ก่อน จึงทำให้ช้ามาก

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

// Record ที่ใช้ IReadOnlyList
public record SlowCart(string UserId, IReadOnlyList<string> Items);

// สร้างตะกร้าสินค้าเริ่มต้น
var cart = new SlowCart("user123", new List<string> { "ขนมปัง", "น้ำดื่ม" });
Console.WriteLine($"ตะกร้าเดิม: {string.Join(", ", cart.Items)}");

// เพิ่มสินค้าใหม่ด้วยการแปลงเป็น List ก่อน
// คำเตือน: การทำงานนี้จะช้ามาก (O(n)) ถ้ามีสินค้าจำนวนมาก เพราะต้องคัดลอก "ขนมปัง" และ "น้ำดื่ม" ทั้งหมด
var updatedCart = cart with { Items = cart.Items.ToList().Add("โคล่า") };

Console.WriteLine($"ตะกร้าใหม่: {string.Join(", ", updatedCart.Items)}");

// ผลลัพธ์:
// ตะกร้าเดิม: ขนมปัง, น้ำดื่ม
// ตะกร้าใหม่: ขนมปัง, น้ำดื่ม, โคล่า
```

**คำอธิบาย:** `cart.Items.ToList()` จะสร้าง `List<string>` ตัวใหม่และคัดลอกสมาชิกทั้งหมดจาก `IReadOnlyList` ตัวเดิมเข้าไป ถ้ามีสินค้า 10,000 รายการ มันจะต้องคัดลอก 10,000 รายการ ซึ่งช้าและใช้หน่วยความจำมาก

---

#### ตัวอย่างที่ 3: ใช้ `Concat()` (ก็ช้าเหมือนกัน - ใช้ได้กับ List เล็กๆ)

`Concat` จะสร้าง iterator ที่ไม่ทำงานจริงจนกว่าจะถูก "materialize" (แปลงเป็น collection จริง) ซึ่งใน `with` expression มันจะถูก materialize ทันที กลายเป็นการคัดลอกทั้งหมดเหมือน `ToList()`

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

// Record ที่ใช้ IReadOnlyList (เหมือนตัวอย่างที่ 2)
public record ConcatCart(string UserId, IReadOnlyList<string> Items);

// สร้างตะกร้าสินค้าเริ่มต้น
var cart = new ConcatCart("user123", new List<string> { "ขนมปัง", "น้ำดื่ม" });
Console.WriteLine($"ตะกร้าเดิม: {string.Join(", ", cart.Items)}");

// เพิ่มสินค้าใหม่ด้วย Concat
// คำเตือน: แม้จะดูสวยงาม แต่เมื่อใช้ใน with expression มันก็ต้องสร้าง List ใหม่ (O(n)) เหมือนกัน
var updatedCart = cart with { Items = cart.Items.Concat(new[] { "โคล่า" }) };

Console.WriteLine($"ตะกร้าใหม่: {string.Join(", ", updatedCart.Items)}");

// ผลลัพธ์:
// ตะกร้าเดิม: ขนมปัง, น้ำดื่ม
// ตะกร้าใหม่: ขนมปัง, น้ำดื่ม, โคล่า
```

**คำอธิบาย:** `Concat` เองไม่ได้สร้าง List ใหม่ทันที แต่เมื่อ `with` expression ต้องการค่า `IReadOnlyList` ที่แท้จริงเพื่อสร้าง `updatedCart` ตัวใหม่ มันจะถูกบังคับให้สร้าง collection ใหม่จากผลลัพธ์ของ `Concat` ซึ่งก็คือการคัดลองข้อมูลทั้งหมด (O(n)) เช่นกัน

---

### แนวทางปฏิบัติที่ดีที่สุด (Best Practice) สำหรับประสิทธิภาพสูง

หากคุณต้องการประสิทธิภาพสูงสุดและโค้ดที่แข็งแกร่ง คุณควร:

1.  **ประกาศ Property ของ Record เป็น `IImmutableList`**
2.  **ใช้ `ImmutableList.Add` และเมธอดอื่นๆ ของมันภายใน `with` expression**
3.  **ซ่อนความซับซ้อนไว้ใน Helper Method**

**ตัวอย่างโค้ดที่สมบูรณ์แบบ:**

```csharp
using System.Collections.Immutable;

// 1. ประกาศเป็น IImmutableList
public sealed record HighPerformanceCart(string UserId, IImmutableList<string> Items)
{
    // 3. สร้าง Helper Method ที่ใช้ ImmutableList.Add
    public HighPerformanceCart AddItem(string newItem)
    {
        // 2. ใช้ Add ภายใน with expression
        return this with { Items = this.Items.Add(newItem) };
    }

    public HighPerformanceCart RemoveItem(string itemToRemove)
    {
        return this with { Items = this.Items.Remove(itemToRemove) };
    }
}

// การใช้งาน
var cart = new HighPerformanceCart("user123", ImmutableList.Create("ขนมปัง"));

// การเพิ่มข้อมูลหลายๆ ครั้งใน loop จะเร็วมาก
for (int i = 0; i < 10000; i++)
{
    cart = cart.AddItem($"สินค้าที่ {i}");
}
```

---

## 6. สรุปและคำแนะนำสุดท้าย

### ตารางเปรียบเทียบ

| คุณสมบัติ | `sealed class` | `record class` | `sealed record` |
| :--- | :--- | :--- | :--- |
| **การสืบทอด** | **ไม่ได้** | **ได้** | **ไม่ได้** |
| **การเปลี่ยนแปลงค่า** | **ได้** (Mutable) | **ไม่ได้** (Immutable) | **ไม่ได้** (Immutable) |
| **การเปรียบเทียบ** | Reference-based | Value-based | Value-based |
| **วัตถุประสงค์หลัก** | ควบคุมการสืบทอดเพื่อความปลอดภัย | เก็บข้อมูลที่ไม่ควรเปลี่ยนแปลง | **สร้าง DTO/Value Object ที่ปลอดภัยและสมบูรณ์แบบ** |

### คำแนะนำในการเลือกใช้

| สถานการณ์ | แนะนำให้ใช้ | เหตุผล |
| :--- | :--- | :--- |
| **Property ของ Record/DTO ทั่วไป** | **`IReadOnlyList` (พร้อม Defensive Copy)** | **ง่าย, ไม่ต้องติดตั้งอะไรเพิ่ม, สื่อสารได้ชัดเจน** เป็นทางเลือกที่ดีที่สุดสำหรับ 99% ของ use case |
| **การคำนวณที่ต้องแก้ไข List หลายๆ รอบ** | **`IImmutableList`** | **ประสิทธิภาพสูงสุด** ด้วย Structural Sharing ทำให้การแก้ไขแต่ละครั้งไม่ต้องคัดลอกทั้งหมด |
| **การสร้าง Library/Framework ให้คนอื่นใช้** | **`IImmutableList`** | ให้ **สัญญา (contract) ที่แข็งแกร่งที่สุด** กับผู้ใช้งานว่าข้อมูลจะถูกป้องกันอย่างสมบูรณ์ |

### กฎเหล็กสำหรับ Immutability

> **เริ่มต้นด้วย `IReadOnlyList` และ Defensive Copy สำหรับ DTO ทั่วไป** แต่ถ้าคุณอยู่ใน High-Performance Scenario ให้ **เปลี่ยนไปใช้ `IImmutableList` และ Helper Method** เพื่อใช้ประโยชน์จากประสิทธิภาพของ Structural Sharing ครับ