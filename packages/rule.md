**condition**

* ห้ามใช้ type anyและ enum
* class ห้ามใช้ private function แต่ให้ใช้ utils functionแทน
* main index ห้าม export utils เพราะ ทําหน้าที่เป็น private function ที่ใช้ในclass
* utils file ให้มี extension เป็น utils.ts นะ


**condition**
-  ห้ามใช้ type anyและ enum 
- class ห้ามใช้ private function แต่ให้ใช้ utils functionแทน
- ให้ใช้ class service สำหรับ เป็น concreate class สำหรับ utils function ที่ต้องการ expose ออกไปให้ consumer project ใช้
- constants , types หรือ เรื่องอื่นๆที่ใช้ เฉพาะภายใน module ให้ อยู่ภายใต้ folder ./interal/ 
- constants , types ที่ต้อง export ให้ consumer project นำไปใช้  อยู่ภายใต้ folder ./src
- main index ห้าม ทุกอย่าง ใน ./internal
- main index ห้าม re-export type เพื่อให้ไม่มีปัญหาเรื่อง perfomance
- constants file  ให้มี extension เป็น const.ts และ ห้ามมี helper function ใน file .const.ts ถ้าต้องมีให้ อยู่ในfile .logic.ts
- type file  ให้มี extension เป็น types.ts และ ห้ามมี helper function ใน file .types.ts ถ้าต้องมีให้ อยู่ในfile .logic.ts
- utils file ให้มี extension เป็น utils.ts


