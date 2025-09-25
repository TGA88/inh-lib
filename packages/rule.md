
## Library
**condition**
-  ห้ามใช้ type anyและ enum 
- class ห้ามใช้ private function แต่ให้ใช้ utils functionแทน
- ให้ใช้ class service สำหรับ เป็น concreate class สำหรับ utils function ที่ต้องการ expose ออกไปให้ consumer project ใช้
- constants , types หรือ เรื่องอื่นๆที่ใช้ เฉพาะภายใน module ให้ อยู่ภายใต้ folder ./interal/ 
- constants , types ที่ต้อง export ให้ consumer project นำไปใช้  อยู่ภายใต้ folder ./src
- main index 
    - ห้าม export ทุกอย่าง ใน ./internal
    - ห้าม re-export type เพื่อให้ไม่มีปัญหาเรื่อง perfomance
- constants file  ให้มี extension เป็น const.ts และ ห้ามมี helper function ใน file .const.ts ถ้าต้องมีให้ อยู่ในfile .logic.ts
- type file  ให้มี extension เป็น types.ts และ ห้ามมี helper function ใน file .types.ts ถ้าต้องมีให้ อยู่ในfile .logic.ts
- utils file ให้มี extension เป็น utils.ts
- ภายใต้ internal folder สามารถมี folder สำหรับเอาไว้ใช้ ภายใน internal เท่านั้น
    - constants
    - types (file  extensions .types.ts )
    - oprerations (file  extensions .utils.ts ใช้เป็นที่เก็บ private function ของ class) **file ภายใต้ operations ห้่าม import file อื่นๆ ใน folder operations มาใช้**
    - core (file  extensions .logic.ts ใช้เป็นที่เก็บ share function ให้กับ utils file ที่อยู่ภายใต้ folder operations) **file ภายใต้ core ห้่าม import file อื่นๆ ใน folder core มาใช้**
- ภายใต้ src สามารถมี folder สำหรับ export ไปให้ cosumer project ใช้ได้
    - internal (ห้าม export ไปให้ consumer ใช้)
    - services
    - types
    - constants

- ทุก file ใน interal folder ให้ใช้ Namespace Pattern เพื่อให้ชื่อ ไม่ซำ้กับ file นอก folder external เช่น
    src/
    ├── logic/registry-helpers.logic.ts      # Public
    └── internal/
        ├── core/internal-registry-core.logic.ts
        └── operations/internal-registry-ops.utils.ts

- core และ operations ใน internal ต้องใช้ const และ  type  ที่อยู่ภายใน Internal เท่านั้น 

- constants และ type ที่อยู่นอกinternal มี priority ที่สำคัญกว่า internal เพราะ เป็น public สำหรับ consumer นำไปใช้ ดังนั้น หาก ใน internal const และ type ต้องการใช้จาก external สามารถ extends ได้ และสามารถ เพิ่ม field ต่างๆ ที่ภายในต้องใช้เพิ่มเติมได้ด้วย

- code ต้องง่าย โดย มี
    - complexity น้อย
    - maintainabiltiy ดีขึ้น
    - read ability ดีขึ้น
    - line of code น้อยขึ้นด้วย
    - perfomance ดี
    - memory usage ต่ำ
