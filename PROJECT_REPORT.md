# تقرير مشروع رعاية - منصة التطوع الإنسانية
# CareConnect - Humanitarian Volunteer Platform Report

---

## الفهرس (Table of Contents)
1. [نظرة عامة على المشروع](#نظرة-عامة)
2. [الهدف من المشروع](#الهدف-من-المشروع)
3. [المستخدمون المستهدفون](#المستخدمون-المستهدفون)
4. [التقنيات المستخدمة](#التقنيات-المستخدمة)
5. [هيكل المشروع](#هيكل-المشروع)
6. [قاعدة البيانات](#قاعدة-البيانات)
7. [واجهات API](#واجهات-api)
8. [الميزات الرئيسية](#الميزات-الرئيسية)
9. [نظام الأمان](#نظام-الأمان)
10. [دليل البناء من الصفر](#دليل-البناء-من-الصفر)
11. [التحسينات المستقبلية](#التحسينات-المستقبلية)

---

## نظرة عامة

**رعاية** هي منصة ويب عربية كاملة (RTL) تربط كبار السن بمتطوعين موثوقين للمساعدة في الحياة اليومية. تتضمن المنصة إشراف المسؤول للأمان وتسمح للمنظمات (الجمعيات الخيرية) بالتحقق من المتطوعين.

### الرؤية
خلق مجتمع آمن وموثوق يربط كبار السن بالمتطوعين المعتمدين، مع ضمان الشفافية والمراقبة الكاملة.

### القيم الأساسية
- **الأمان أولاً**: التحقق من المتطوعين ومراقبة الأنشطة
- **الشفافية**: سجل كامل لجميع العمليات
- **سهولة الاستخدام**: واجهة صديقة لكبار السن
- **الثقة**: نظام تقييم ومراجعة

---

## الهدف من المشروع

### المشكلة
كبار السن يحتاجون مساعدة في مهام يومية مثل:
- التسوق وشراء الاحتياجات
- المرافقة للمستشفى
- المساعدة في الأوراق الرسمية
- الزيارات والمرافقة الاجتماعية

### الحل
منصة رقمية تربطهم بمتطوعين:
- ✅ معتمدين من منظمات خيرية
- ✅ خضعوا لموافقة إدارية
- ✅ لديهم سجل أنشطة واضح
- ✅ يمكن تقييمهم والإبلاغ عنهم

---

## المستخدمون المستهدفون

### 1. كبار السن (Elderly)
- إنشاء طلبات المساعدة
- تقييم المتطوعين
- عرض سجل الطلبات
- تقديم شكاوى

### 2. المتطوعون (Volunteers)
- عرض الطلبات المتاحة
- قبول وإتمام الطلبات
- تسجيل ساعات التطوع
- بناء سجل خدمة

### 3. المنظمات (Organizations)
- التحقق من المتطوعين
- مراقبة المتطوعين التابعين
- إدارة ملف المنظمة

### 4. المسؤولون (Admins)
- الموافقة على الحسابات
- مراقبة سجل الأنشطة
- مراجعة الشكاوى
- إيقاف الحسابات المخالفة

---

## التقنيات المستخدمة

### Backend (الخادم)
| التقنية | الغرض |
|---------|--------|
| Node.js | بيئة تشغيل JavaScript |
| Express.js | إطار عمل الويب |
| Firebase Admin SDK | إدارة المصادقة من الخادم |

### Frontend (الواجهة)
| التقنية | الغرض |
|---------|--------|
| HTML5 | هيكل الصفحات |
| CSS3 | التنسيق والتصميم |
| Vanilla JavaScript | التفاعل |
| Firebase SDK | المصادقة من العميل |

### قاعدة البيانات والخدمات
| الخدمة | الغرض |
|--------|--------|
| Firebase Authentication | تسجيل الدخول بالبريد/كلمة المرور |
| Firebase Firestore | قاعدة بيانات NoSQL |
| Firebase Storage | تخزين الملفات |

### الخطوط العربية
- **Cairo** - للعناوين
- **Tajawal** - للنصوص

---

## هيكل المشروع

```
careconnect/
├── public/                      # ملفات الواجهة
│   ├── css/
│   │   └── style.css           # التنسيقات الرئيسية (RTL)
│   ├── js/
│   │   ├── app.js              # أدوات عامة
│   │   ├── auth.js             # منطق المصادقة
│   │   ├── dashboard.js        # لوحة التحكم
│   │   └── firebase-config.js  # إعدادات Firebase
│   ├── index.html              # الصفحة الرئيسية
│   ├── login.html              # تسجيل الدخول
│   ├── register.html           # إنشاء حساب
│   └── dashboard.html          # لوحة التحكم
├── src/
│   ├── controllers/            # معالجات الطلبات
│   │   ├── adminController.js
│   │   ├── authController.js
│   │   ├── elderlyController.js
│   │   ├── organizationController.js
│   │   └── volunteerController.js
│   ├── middleware/
│   │   └── auth.js             # التحقق من الصلاحيات
│   ├── routes/                 # تعريف المسارات
│   │   ├── admin.js
│   │   ├── auth.js
│   │   ├── elderly.js
│   │   ├── organization.js
│   │   └── volunteer.js
│   ├── firebase.js             # إعدادات Firebase Admin
│   └── server.js               # نقطة بدء الخادم
├── firestore.rules             # قواعد أمان Firestore
├── package.json
└── replit.md                   # توثيق المشروع
```

---

## قاعدة البيانات

### مجموعات Firestore (Collections)

#### 1. users
```javascript
{
  uid: "user123",
  email: "user@example.com",
  fullName: "محمد أحمد",
  role: "elderly" | "volunteer" | "organization" | "admin",
  status: "pending" | "approved" | "suspended",
  phone: "+966xxxxxxxxx",
  address: "الرياض، السعودية",
  createdAt: "2026-01-15T10:00:00Z",
  updatedAt: "2026-01-20T15:30:00Z"
}
```

#### 2. elder_profiles
```javascript
{
  uid: "elder123",
  fullName: "أحمد محمد",
  phone: "+966xxxxxxxxx",
  address: "جدة، السعودية",
  emergencyContact: "+966yyyyyyyyy",
  specialNeeds: "يحتاج كرسي متحرك",
  createdAt: "2026-01-15T10:00:00Z"
}
```

#### 3. volunteer_profiles
```javascript
{
  uid: "vol123",
  fullName: "سعد عبدالله",
  phone: "+966xxxxxxxxx",
  skills: ["قيادة", "مرافقة طبية", "تسوق"],
  availability: "weekends",
  totalHours: 45,
  averageRating: 4.8,
  completedRequests: 12,
  isVerified: true,
  verifiedBy: "org123",
  organizationName: "جمعية رعاية",
  createdAt: "2026-01-10T08:00:00Z"
}
```

#### 4. organizations
```javascript
{
  uid: "org123",
  organizationName: "جمعية رعاية الخيرية",
  registrationNumber: "12345",
  description: "منظمة خيرية لرعاية كبار السن",
  verifiedVolunteers: ["vol123", "vol456"],
  status: "approved",
  createdAt: "2026-01-01T00:00:00Z"
}
```

#### 5. requests (طلبات المساعدة)
```javascript
{
  id: "req123",
  elderlyId: "elder123",
  elderlyName: "أحمد محمد",
  type: "shopping" | "hospital" | "paperwork" | "companion",
  description: "مساعدة في التسوق الأسبوعي",
  urgency: "low" | "medium" | "high",
  preferredDate: "2026-02-10",
  address: "حي النزهة، جدة",
  status: "pending" | "accepted" | "completed" | "cancelled",
  volunteerId: "vol123",
  volunteerName: "سعد عبدالله",
  rating: 5,
  ratingComment: "خدمة ممتازة",
  createdAt: "2026-02-01T09:00:00Z",
  acceptedAt: "2026-02-01T10:00:00Z",
  completedAt: "2026-02-10T16:00:00Z"
}
```

#### 6. activity_logs (سجل الأنشطة)
```javascript
{
  id: "log123",
  action: "request_created" | "request_accepted" | "request_completed" | 
          "user_approved" | "user_suspended" | "complaint_filed",
  actorId: "user123",
  actorName: "محمد أحمد",
  actorRole: "elderly",
  targetId: "req123",
  targetType: "request",
  details: {
    requestType: "shopping",
    status: "pending"
  },
  timestamp: "2026-02-01T09:00:00Z"
}
```

#### 7. complaints (الشكاوى)
```javascript
{
  id: "comp123",
  reporterId: "elder123",
  reporterName: "أحمد محمد",
  reporterRole: "elderly",
  targetId: "vol123",
  targetName: "سعد عبدالله",
  targetRole: "volunteer",
  relatedRequestId: "req123",
  type: "inappropriate_behavior" | "no_show" | "poor_service" | "safety_concern" | "other",
  description: "لم يحضر في الموعد المحدد",
  status: "pending" | "under_review" | "resolved" | "dismissed",
  adminNotes: "تم التواصل مع المتطوع",
  resolvedBy: "admin123",
  resolvedAt: "2026-02-05T14:00:00Z",
  createdAt: "2026-02-03T11:00:00Z"
}
```

---

## واجهات API

### المصادقة (Authentication)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/auth/register` | POST | تسجيل مستخدم جديد |
| `/api/auth/verify` | POST | التحقق من التوكن |
| `/api/auth/profile` | GET | عرض الملف الشخصي |
| `/api/auth/profile` | PUT | تحديث الملف الشخصي |

### كبار السن (Elderly)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/elderly/requests` | POST | إنشاء طلب مساعدة |
| `/api/elderly/requests` | GET | عرض طلباتي |
| `/api/elderly/requests/:id` | PUT | تعديل طلب |
| `/api/elderly/requests/:id` | DELETE | إلغاء طلب |
| `/api/elderly/requests/:id/rate` | POST | تقييم المتطوع |

### المتطوعون (Volunteers)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/volunteer/profile` | GET | عرض ملفي |
| `/api/volunteer/profile` | PUT | تحديث ملفي |
| `/api/volunteer/requests` | GET | عرض الطلبات المتاحة |
| `/api/volunteer/requests/:id/accept` | POST | قبول طلب |
| `/api/volunteer/requests/:id/complete` | POST | إتمام طلب |
| `/api/volunteer/hours` | GET | عرض ساعات التطوع |

### المنظمات (Organizations)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/organization/profile` | GET | عرض ملف المنظمة |
| `/api/organization/profile` | PUT | تحديث ملف المنظمة |
| `/api/organization/volunteers` | GET | عرض المتطوعين |
| `/api/organization/volunteers/:id/verify` | POST | التحقق من متطوع |

### المسؤول (Admin)
| المسار | الطريقة | الوصف |
|--------|---------|-------|
| `/api/admin/users` | GET | عرض جميع المستخدمين |
| `/api/admin/users/pending` | GET | عرض الطلبات المعلقة |
| `/api/admin/users/:id/approve` | PUT | الموافقة على مستخدم |
| `/api/admin/users/:id/reject` | PUT | رفض مستخدم |
| `/api/admin/users/:id/suspend` | PUT | إيقاف مستخدم |
| `/api/admin/stats` | GET | عرض الإحصائيات |
| `/api/admin/activity-logs` | GET | عرض سجل الأنشطة |
| `/api/admin/complaints` | GET | عرض الشكاوى |
| `/api/admin/complaints/:id/review` | PUT | مراجعة شكوى |

---

## الميزات الرئيسية

### 1. نظام التسجيل والمصادقة
- تسجيل بالبريد الإلكتروني وكلمة المرور
- اختيار الدور (مسن، متطوع، منظمة)
- موافقة إدارية للمتطوعين والمنظمات
- كبار السن معتمدون تلقائياً

### 2. إدارة طلبات المساعدة
- أنواع متعددة (تسوق، مستشفى، أوراق، مرافقة)
- مستويات أولوية (منخفضة، متوسطة، عالية)
- تتبع حالة الطلب
- تحديد الموعد والعنوان

### 3. نظام التقييم
- تقييم من 1-5 نجوم
- تعليقات مكتوبة
- حساب متوسط تقييم المتطوع

### 4. التحقق من المتطوعين
- ربط المتطوع بمنظمة
- شارة "تم التحقق" ظاهرة
- عرض اسم المنظمة للمستخدمين

### 5. لوحة المسؤول
- موافقة/رفض الحسابات
- إيقاف المستخدمين المخالفين
- إحصائيات المنصة
- سجل الأنشطة الكامل
- مراجعة الشكاوى

---

## نظام الأمان

### المصادقة
```javascript
// التحقق من التوكن في كل طلب
const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split('Bearer ')[1];
  const decoded = await auth.verifyIdToken(token);
  req.user = await getUserFromFirestore(decoded.uid);
  next();
};
```

### التحكم بالوصول (RBAC)
```javascript
// السماح فقط للأدوار المحددة
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'غير مصرح' });
    }
    next();
  };
};
```

### قواعد Firestore
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // المستخدمون يمكنهم قراءة/كتابة بياناتهم فقط
    match /users/{userId} {
      allow read, write: if request.auth.uid == userId;
    }
    
    // الطلبات يمكن إنشاؤها من كبار السن فقط
    match /requests/{requestId} {
      allow create: if request.auth != null 
        && request.resource.data.elderlyId == request.auth.uid;
    }
  }
}
```

---

## دليل البناء من الصفر

### الخطوة 1: إعداد المشروع

```bash
# إنشاء مجلد المشروع
mkdir careconnect
cd careconnect

# تهيئة npm
npm init -y

# تثبيت المكتبات
npm install express firebase-admin cors cookie-parser express-validator dotenv
```

### الخطوة 2: إنشاء هيكل الملفات

```bash
# إنشاء المجلدات
mkdir -p public/css public/js src/controllers src/routes src/middleware
```

### الخطوة 3: إعداد Firebase

1. اذهب إلى [Firebase Console](https://console.firebase.google.com)
2. أنشئ مشروع جديد
3. فعّل Authentication > Email/Password
4. أنشئ Firestore Database
5. احصل على إعدادات Web App
6. حمّل Service Account JSON

### الخطوة 4: إنشاء الخادم (server.js)

```javascript
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');

const app = express();

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/volunteer', require('./routes/volunteer'));
app.use('/api/elderly', require('./routes/elderly'));
app.use('/api/organization', require('./routes/organization'));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
```

### الخطوة 5: إنشاء واجهة HTML (RTL)

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رعاية - منصة التطوع الإنسانية</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <!-- المحتوى -->
</body>
</html>
```

### الخطوة 6: تصميم RTL (style.css)

```css
/* إعدادات RTL الأساسية */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Tajawal', 'Cairo', sans-serif;
  direction: rtl;
  text-align: right;
  background: linear-gradient(135deg, #4a7c7e 0%, #5a8f91 50%, #6ba3a5 100%);
  min-height: 100vh;
}

/* عكس الأيقونات للـ RTL */
.icon-arrow {
  transform: scaleX(-1);
}

/* القائمة الجانبية على اليمين */
.sidebar {
  right: 0;
  left: auto;
  border-left: 1px solid #ddd;
  border-right: none;
}
```

### الخطوة 7: نشر قواعد Firestore

انسخ محتوى `firestore.rules` إلى:
Firebase Console > Firestore > Rules > Publish

### الخطوة 8: تشغيل المشروع

```bash
npm start
# أو للتطوير
npm run dev
```

---

## التحسينات المستقبلية

### ميزات مخطط لها
1. ✅ سجل الأنشطة الكامل (Activity Logs)
2. ✅ نظام الشكاوى والبلاغات
3. ✅ شارات التحقق للمتطوعين
4. ⏳ إشعارات في الوقت الفعلي (Push Notifications)
5. ⏳ تطبيق موبايل (React Native)
6. ⏳ خريطة لعرض المتطوعين القريبين
7. ⏳ دردشة مباشرة بين المستخدمين
8. ⏳ تقارير وإحصائيات متقدمة
9. ⏳ دعم لغات متعددة

### تحسينات تقنية
- إضافة اختبارات وحدة (Unit Tests)
- تحسين الأداء مع التخزين المؤقت
- تحسين SEO للصفحات العامة
- إضافة PWA للعمل بدون إنترنت

---

## معلومات الاتصال

**اسم المشروع**: رعاية (CareConnect)
**الإصدار**: 1.0.0
**تاريخ الإنشاء**: يناير 2026
**آخر تحديث**: فبراير 2026

---

> **ملاحظة**: هذا المشروع مصمم كمشروع تخرج جامعي ويمكن تطويره للاستخدام الحقيقي مع إضافة ميزات الأمان المتقدمة وتوسيع البنية التحتية.
