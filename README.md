#  Inh-Lib 
เป็น Project ที่สร้างด้วย Nx แบบ ProjectBase (เก่าแล้วมีเวลาจะมาปรับ) 

## การ Publish ขึ้น NPM ให้ Manul ก่อน เพราะยังไม่มีเวลามาปรับ Pipeline

### login npm (แบบ manual)
```bash
npm login 
# แล้วเด๋ว จะเปิด Browser มาให้ login
# กรอก userที่ใช้งาน bebestdev (ให่้เปลี่ยนเป็น bebestdev เป็น user ของคุณ)
```


### pack
```bash
# ให้เข้าไปที่ Project ที่ ต้องการ เช่น common

# สร้างไฟล์ .tgz
npm pack

# จะได้ไฟล์ชื่อ: package-name-version.tgz

# ดูรายการไฟล์ที่จะถูก pack โดยไม่สร้างไฟล์ .tgz
npm pack --dry-run

# แสดงรายละเอียดของไฟล์ที่จะถูก pack
npm pack --json

# pack เฉพาะ production dependencies
npm pack --production
```

### Bump version
การ bump version ใน npm ทำได้หลายวิธี:

**1.ใช้คำสั่ง npm version:**
```bash

bashCopy# เพิ่ม patch version (1.0.0 -> 1.0.1)
npm version patch

# เพิ่ม minor version (1.0.0 -> 1.1.0)
npm version minor

# เพิ่ม major version (1.0.0 -> 2.0.0)
npm version major

# กำหนด version แบบชัดเจน
npm version 1.2.3
```

**2.ใช้ flag เพิ่มเติม:**
```bash
bashCopy# ไม่สร้าง git tag
npm version patch --no-git-tag-version

# สร้าง commit แต่ไม่สร้าง tag
npm version minor --no-git-tag-version --force

# สร้าง commit พร้อม custom message
npm version patch -m "Bump version to %s"
```

**3.หรือแก้ไข version ใน package.json โดยตรง (ไม่แนะนำ):**
```bash 
# package.json
jsonCopy{
  "name": "your-package",
  "version": "1.0.1"
}
```
**Bump Versionแล้ว จะError เพราะ Commit Codeไม่ได้ ให้ เช็ค File Change และทำการ commit และ push พร้อมทั้ง ติด git-tag เรียบร้อย(จะได้tag อัตโนมัติ ตอน npm publish) และ push to remote**

หลังจาก bump version แล้วควร:

ตรวจสอบการเปลี่ยนแปลงใน package.json
commit การเปลี่ยนแปลง (ถ้าไม่ได้ใช้ --force)
push tags (ถ้าใช้ git)
publish package ใหม่

### Publish
การระบุ tag ตอน publish ไป npm ทำได้ 2 วิธี:

**1.ระบุตอน publish โดยใช้ --tag:**
```bash
npm publish --tag beta
npm publish --tag alpha
npm publish --tag latest  # latest คือ default tag
```

**2.ใช้คำสั่ง npm dist-tag หลังจาก publish:**
```bash
#เพิ่ม tag ให้กับ version ที่ต้องการ
npm dist-tag add your-package@1.0.0 beta
```

**List and Delete npm tag**
```bash
# ดู tags ทั้งหมด
npm dist-tag ls your-package

# ลบ tag
npm dist-tag rm your-package beta
```

### Depreacte Tag
**ใน npm เราไม่สามารถลบ (unpublish) version ที่ publish ไปแล้วเกิน 72 ชั่วโมงได้ แต่มีวิธีจัดการดังนี้:**

**ถ้ายังไม่เกิน 72 ชั่วโมง สามารถ unpublish ได้:**
```bash
npm unpublish your-package@1.0.0
```

**ถ้าเกิน 72 ชั่วโมงแล้ว แนะนำให้ ใช้ deprecate**
```bash
# deprecate ทั้ง package
npm deprecate package-name "This package is no longer maintained"

# deprecate เฉพาะ version
npm deprecate package-name@"1.x" "Version 1.x is no longer supported"

# deprecate version range
npm deprecate package-name@">=1.0.0 <2.0.0" "Please upgrade to version 2.x"

# ใช้ version range แบบนี้
npm deprecate @inh-lib/ddd@"<0.2.3" "Please upgrade to version 0.2.3 or above"

# หรือถ้าต้องการ deprecate หลาย version:
npm deprecate "@inh-lib/ddd@0.0.0 @inh-lib/ddd@0.1.0" "Please upgrade to version 0.2.3 or above"
```
---
## การตั้งชื่อ git tag สำหรับ workspaceนี้่ (mono-repo)

```
# การตั้งชื่อ tag สำหรับ release commit
[projectname]-[sematicversion] เช่น common-1.0.0

# การตั้งชื่อ tag สำหรับ latest เพื่อง่ายในการเช็ค commit ที่ publish ไป npm
[projectname]-latest เช่น common-latest


# การตั้งชื่อ tag สำหรับ next version เพื่อง่ายในการเช็ค commit ที่ publish ไป npm
# (ใช้กรณีที่ต้องการทำ multi version เนื่องจาก major change หรือ ไม่รองรับ backward compatible)
[projectname]-next เช่น common-latest
```
**การ npm publish จะนำเอา tag ที่อยู่ที่ commit ที่ publish เป็น npm tag อัตโนมัติ**
tag next หรือ lataest เราจะต้อง publish เอง เพราะไม่งั้นเราจะใช้ npm i @inh-lib/common@next ไม่ได้ เพราะ มันใช้ git-tag ของเราแทน 









