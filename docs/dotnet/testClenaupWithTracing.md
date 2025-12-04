

ได้เลยครับ! ผมจะจัดทำเอกสาร Markdown ที่รวบรวมตัวอย่างโค้ดเกี่ยวกับการจัดการ Global State ในการทดสอบโดยเฉพาะ ให้คุณนำไปใช้งานได้ทันที

---

# การจัดการ Global State ในการทดสอบ: คู่มือการใช้ `[TestCleanup]` และ `[AssemblyCleanup]`

เอกสารนี้อธิบายถึงปัญหาและวิธีแก้ไขเมื่อการทดสอบ (Unit Test) ต่างๆ ต้องใช้ตัวแปรแบบ Static หรือ Global State ร่วมกัน ซึ่งอาจทำให้การทดสอบล้มเหลวเนื่องจากไปกระทบซึ่งกันและกัน (Test Interdependency)

เราจะใช้ `ActivitySourceProvider` ที่เราสร้างขึ้นมาเป็นตัวอย่างในการอธิบาย

## ปัญหา: การทดสอบที่ไปกระทบกัน (Test Interdependency)

สมมติว่าเรามีคลาส `ActivitySourceProvider` แบบ Static ที่ใช้ร่วมกันในระบบ

```csharp
// YourCompanyName.Application.Abstractions/Tracing/ActivitySourceProvider.cs
using System.Diagnostics;

/// <summary>
/// Provider สำหรับ ActivitySource ที่ใช้งานง่ายและ Configurable ได้
/// </summary>
public static class ActivitySourceProvider
{
    public static ActivitySource Source { get; set; } = new("Default.Application");
}
```

ถ้าเราเขียนการทดสอบโดยไม่มีการจัดการความสะอาด (Cleanup) อาจเกิดปัญหาได้ดังนี้

### ตัวอย่างการทดสอบที่ผิดวิธี

```csharp
// ตัวอย่างที่ผิด! ไม่ควรทำแบบนี้
[TestClass]
public class BadExampleTests
{
    [TestMethod]
    public void Test1_ShouldSetApiSource()
    {
        // Arrange & Act
        // เปลี่ยนค่า Global State
        ActivitySourceProvider.Source = new ActivitySource("MyProject.API");

        // Assert
        Assert.AreEqual("MyProject.API", ActivitySourceProvider.Source.Name);
    }

    [TestMethod]
    public void Test2_ShouldStillBeDefault() 
    {
        // Assert
        // ❌ การทดสอบนี้จะ FAIL ถ้า Test1 รันก่อนหน้านี้
        // เพราะค่า Source ถูกเปลี่ยนไปแล้ว
        Assert.AreEqual("Default.Application", ActivitySourceProvider.Source.Name);
    }
}
```

**ปัญหา:** ผลลัพธ์ของการทดสอบขึ้นอยู่กับ **ลำดับการรัน** ซึ่งเป็น Anti-Pattern ที่ทำให้ชุดทดสอบ (Test Suite) น่าเชื่อถือน้อยลง

---

## วิธีแก้ไข: รีเซ็ตค่าหลังการทดสอบแต่ละครั้ง

วิธีที่ดีที่สุดคือการ **รีเซ็ตค่าให้กลับสู่สถานะเริ่มต้น (Default) หลังจากแต่ละการทดสอบทำงานเสร็จ** เพื่อให้มั่นใจว่าทุกการทดสอบเริ่มต้นจากจุดเดียวกันเสมอ

### ตัวอย่างโค้ดที่ถูกต้อง (MSTest)

ใน MSTest เราใช้ `[TestInitialize]` สำหรับการเตรียมความพร้อมก่อนทดสอบ และ `[TestCleanup]` สำหรับทำความสะอาดหลังทดสอบ

```csharp
// MyProject.Application.Tests/Tracing/ActivitySourceProviderTests.cs

using Microsoft.VisualStudio.TestTools.UnitTesting;
using System.Diagnostics;
using YourCompanyName.Application.Abstractions.Tracing;

[TestClass]
public class ActivitySourceProviderTests
{
    // 1. เก็บค่า Default ไว้เพื่อนำกลับมาใช้ซ้ำ
    private readonly ActivitySource _defaultSource = new("Default.Application");

    // 2. เมธอดนี้จะถูกรันก่อนทุกๆ Test Method ในคลาสนี้
    [TestInitialize]
    public void Setup()
    {
        // ตั้งค่าให้แน่ใจว่าทุก Test เริ่มต้นจากสถานะเดียวกัน
        ActivitySourceProvider.Source = _defaultSource;
    }

    // 3. เมธอดนี้จะถูกรันหลังทุกๆ Test Method ในคลาสนี้
    [TestCleanup]
    public void Cleanup()
    {
        // รีเซ็ตค่ากลับไปเป็น Default หลังจาก Test จบ
        // นี่คือสิ่งสำคัญที่ป้องกัน Test Interdependency
        ActivitySourceProvider.Source = _defaultSource;
    }

    [TestMethod]
    public void ThenAsync_ShouldUseConfiguredSource()
    {
        // Arrange
        var testSource = new ActivitySource("Test.Service");
        ActivitySourceProvider.Source = testSource;
        
        // Act & Assert
        // การทดสอบนี้จะใช้ "Test.Service" แน่นอน
        Assert.AreEqual("Test.Service", ActivitySourceProvider.Source.Name);
    }

    [TestMethod]
    public void AnotherTest_ShouldStartFromDefault()
    {
        // Assert
        // ✅ การทดสอบนี้จะผ่านเสมอ เพราะ [TestInitialize] ได้ตั้งค่าให้เป็น Default ไว้แล้ว
        Assert.AreEqual("Default.Application", ActivitySourceProvider.Source.Name);
    }
}
```

### แล้ว `[AssemblyCleanup]` ล่ะ?

`[AssemblyCleanup]` จะถูกรัน **เพียงครั้งเดียว** หลังจากทุกการทดสอบในทุก Test Class ภายใน Assembly (`.dll`) ทำงานเสร็จ

มันเหมาะสำหรับการทำความสะอาดทรัพยากรระดับโลกอย่างเช่น:
*   ปิดการเชื่อมต่อฐานข้อมูลที่ใช้ร่วมกันทั้ง Assembly
*   ลบไฟล์ชั่วคราวที่สร้างขึ้นมาทั้งหมด

สำหรับปัญหาของเรา การใช้ `[TestCleanup]` ที่ระดับคลาสนั้นเหมาะสมกว่า เพราะเราต้องการความสะอาดหลังแต่ละการทดสอบ ไม่ใช่หลังจากรันทดสอบทั้งหมดเสร็จ

---

## วิธีที่เทียบเท่าใน Testing Frameworks อื่นๆ

หลักการเหมือนกัน แต่ใช้ Attributes หรือ Interfaces ที่แตกต่างกัน

### xUnit

xUnit ไม่มี `[TestInitialize]` หรือ `[TestCleanup]` แต่ใช้ **Constructor** สำหรับ Setup และ **`IDisposable`** สำหรับ Cleanup

```csharp
// xUnit Example
using Xunit;
using System.Diagnostics;
using YourCompanyName.Application.Abstractions.Tracing;

public class ActivitySourceProviderTests : IDisposable
{
    private readonly ActivitySource _defaultSource = new("Default.Application");

    // Constructor ทำหน้าที่เหมือน [TestInitialize]
    public ActivitySourceProviderTests()
    {
        ActivitySourceProvider.Source = _defaultSource;
    }

    // Dispose ทำหน้าที่เหมือน [TestCleanup]
    public void Dispose()
    {
        ActivitySourceProvider.Source = _defaultSource;
    }

    [Fact]
    public void Test1_ShouldUseConfiguredSource()
    {
        // ... test logic ...
    }
}
```

### NUnit

NUnit ใช้ `[SetUp]` และ `[TearDown]` ซึ่งคล้ายกับ MSTest มาก

```csharp
// NUnit Example
using NUnit.Framework;
using System.Diagnostics;
using YourCompanyName.Application.Abstractions.Tracing;

[TestFixture]
public class ActivitySourceProviderTests
{
    private readonly ActivitySource _defaultSource = new("Default.Application");

    // [SetUp] เหมือน [TestInitialize]
    [SetUp]
    public void Setup()
    {
        ActivitySourceProvider.Source = _defaultSource;
    }

    // [TearDown] เหมือน [TestCleanup]
    [TearDown]
    public void TearDown()
    {
        ActivitySourceProvider.Source = _defaultSource;
    }

    [Test]
    public void Test1_ShouldUseConfiguredSource()
    {
        // ... test logic ...
    }
}
```

---

## สรุป

การใช้วิธีเหล่านี้จะทำให้ชุดทดสอบของคุณแข็งแกร่ง น่าเชื่อถือ และไม่มีปัญหาเรื่องลำดับการรัน หลักการสำคัญคือ **"การทดสอบแต่ละครั้งต้องเป็นอิสระจากการทดสอบอื่น"** และการทำความสะอาดหลังการทดสอบเป็นหนึ่งในกุญแจสำคัญที่จะบรรลุเป้าหมายนี้