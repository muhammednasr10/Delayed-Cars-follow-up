export type Lang = 'ar' | 'en'

// Nested dictionaries. Access with t('a.b.c'); supports {var} interpolation.
export const translations = {
  ar: {
    brand: 'خط الإنتاج',
    app: { title: 'نظام المتابعة', subtitle: 'متابعة السيارات والنواقص داخل خط إنتاج السيارات' },
    common: {
      refresh: 'تحديث', add: 'إضافة', edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء',
      save: 'حفظ', saveEdit: 'حفظ التعديل', confirm: 'تأكيد', close: 'إغلاق', loading: 'جاري التحميل...',
      saving: 'جاري الحفظ...', search: 'بحث', all: 'الكل', yes: 'نعم', no: 'لا', required: 'مطلوب',
      actions: 'إجراءات', notes: 'ملاحظات', logout: 'خروج', items: '{n} عنصر', noData: 'لا توجد بيانات.',
      noResults: 'لا توجد نتائج مطابقة.', error: 'حدث خطأ.', cannotUndo: 'لا يمكن التراجع.'
    },
    nav: { home: 'الرئيسية', missingParts: 'نواقص السيارات', vehicles: 'تسليم السيارات', settings: 'الإعدادات' },
    home: {
      welcomeTitle: 'مرحباً بك في نظام متابعة خط الإنتاج',
      welcomeSubtitle: 'اختر وحدة بالأسفل أو ابدأ بتبليغ نقص جديد.',
      reportMissing: 'تبليغ نقص جديد',
      modules: 'الوحدات', soon: 'قريباً',
      total: 'إجمالي السيارات', totalSub: 'جميع السيارات المسجلة',
      withMissing: 'بها نواقص', withMissingSub: 'سيارات بنواقص مفتوحة',
      blocked: 'محظورة من التسليم', blockedSub: 'لا يمكن تسليمها الآن'
    },
    modules: {
      missingParts: 'نواقص السيارات', missingPartsDesc: 'تبليغ ومتابعة القطع الناقصة في السيارات',
      vehicles: 'تسليم السيارات', vehiclesDesc: 'حالة الاكتمال والجودة وتحرير التسليم',
      settings: 'الإعدادات', settingsDesc: 'الموديلات، المحطات، الألوان، المستخدمين',
      productionOrders: 'أوامر الإنتاج', productionOrdersDesc: 'إدارة أوامر الإنتاج والكميات',
      inventory: 'المخزون', inventoryDesc: 'الأصناف، المخازن، حركة الصرف',
      quality: 'الجودة', qualityDesc: 'فحص الجودة واعتماد القطع',
      reports: 'التقارير', reportsDesc: 'لوحات ومؤشرات وتقارير الأعمار'
    },
    login: {
      title: 'نظام متابعة خط الإنتاج', subtitle: 'تسجيل الدخول للمتابعة',
      email: 'البريد الإلكتروني', password: 'كلمة المرور', submit: 'دخول', submitting: 'جاري الدخول...',
      errRequired: 'برجاء إدخال البريد وكلمة المرور.', errFailed: 'فشل تسجيل الدخول.'
    },
    setup: {
      title: 'قاعدة البيانات تحتاج للتجهيز',
      subtitle: 'الاتصال بـ Supabase يعمل، لكن جداول النظام لم يتم إنشاؤها بعد.',
      steps: 'الخطوات:',
      step1: 'افتح لوحة تحكم Supabase ثم اذهب إلى SQL Editor.',
      step2: 'شغّل ملفات الترحيل بالترتيب من مجلد supabase/migrations:',
      files: 'ملفات الترحيل',
      promote: 'بعد التشغيل، ارفع صلاحية حسابك إلى مدير عبر:',
      refreshHint: 'ثم اضغط زر «تحديث» بالأعلى.'
    },
    settings: {
      title: 'الإعدادات',
      subtitle: 'إدارة الموديلات، المستخدمين، الألوان، أماكن العمل والمحطات.',
      tabs: { models: 'الموديلات', areas: 'أماكن العمل', stations: 'المحطات', colors: 'ألوان السيارات', users: 'المستخدمين' },
      addTitle: 'إضافة - {title}', editTitle: 'تعديل - {title}',
      deleteTitle: 'تأكيد الحذف', deleteMsg: 'هل أنت متأكد من حذف «{name}»؟ لا يمكن التراجع.',
      added: 'تمت الإضافة.', updated: 'تم التعديل.', deleted: 'تم الحذف.',
      fields: {
        modelName: 'اسم الموديل', areaName: 'اسم المكان', description: 'الوصف',
        stationNumber: 'رقم المحطة', stationName: 'اسم المحطة', workArea: 'مكان العمل',
        colorName: 'اسم اللون', color: 'اللون', name: 'الاسم', email: 'البريد الإلكتروني', role: 'الدور'
      },
      cols: {
        name: 'الاسم', description: 'الوصف', number: 'الرقم', workArea: 'مكان العمل',
        color: 'اللون', hex: 'Hex', email: 'البريد', role: 'الدور'
      }
    },
    mp: {
      title: 'نواقص السيارات',
      subtitle: 'المحطة تبلّغ عن قطعة لم تُركّب في السيارة، مرتبطة برقم الشاسيه والموديل واللون والمحطة.',
      report: 'تبليغ نقص جديد', reportTitle: 'تبليغ نقص جديد في سيارة',
      filterStation: 'كل المحطات', filterPriority: 'كل الأولويات', filterStatus: 'كل الحالات',
      searchPlaceholder: 'بحث VIN / القطعة',
      cols: {
        vin: 'رقم الشاسيه', model: 'الموديل', color: 'اللون', station: 'المحطة', part: 'القطعة الناقصة',
        qty: 'الكمية', reason: 'السبب', department: 'الجهة المسؤولة', priority: 'الأولوية', status: 'الحالة',
        dr: 'DR', createdBy: 'أدخلها', createdAt: 'التاريخ'
      },
      f: {
        vin: 'رقم الشاسيه / VIN', model: 'الموديل', color: 'اللون', station: 'المحطة',
        part: 'القطعة الناقصة', qty: 'الكمية المطلوبة', reason: 'سبب النقص', department: 'الجهة المسؤولة',
        priority: 'الأولوية', dr: 'قطعة DR؟', notes: 'ملاحظات'
      },
      success: 'تم تسجيل النقص بنجاح.'
    },
    vehicles: {
      title: 'تسليم السيارات',
      subtitle: 'VIN، الموديل، النواقص، نسبة الاكتمال، الجودة، حالة التسليم.',
      newVehicle: 'سيارة جديدة',
      cols: { vin: 'VIN', model: 'الموديل', po: 'أمر الإنتاج', missing: 'النواقص', completion: 'الاكتمال', production: 'الإنتاج', qc: 'الجودة', delivery: 'التسليم' },
      release: 'تحرير', deliver: 'تسليم', blockedHint: 'يوجد نواقص مفتوحة - لا يمكن التحرير',
      total: 'إجمالي السيارات', withMissing: 'بها نواقص', blocked: 'محظورة', qcFailed: 'رفض جودة'
    },
    reason: { stock_shortage: 'نقص مخزون', supplier_delay: 'تأخر مورد', damaged_part: 'قطعة تالفة', qc_rejection: 'رفض جودة', wrong_part: 'قطعة خاطئة', production_mistake: 'خطأ إنتاج', other: 'أخرى' },
    department: { warehouse: 'المخازن', purchasing: 'المشتريات', production: 'الإنتاج', quality: 'الجودة', supplier: 'المورد', management: 'الإدارة' },
    priority: { low: 'منخفض', normal: 'عادي', high: 'مرتفع', critical: 'حرج' },
    mpStatus: { open: 'مفتوح', waiting_purchase: 'بانتظار الشراء', available_in_stock: 'متاح بالمخزن', issued_to_production: 'صُرف للإنتاج', installed: 'تم التركيب', qc_pending: 'بانتظار الجودة', closed: 'مغلق', cancelled: 'ملغي' },
    qcStatus: { pending: 'بانتظار الفحص', passed: 'ناجح', failed: 'مرفوض', not_required: 'غير مطلوب' },
    deliveryStatus: { blocked: 'محظورة', ready: 'جاهزة للتسليم', delivered: 'تم التسليم' },
    productionStatus: { planned: 'مخطط', on_line: 'على الخط', off_line_incomplete: 'خرجت ناقصة', rework: 'إعادة عمل', completed: 'مكتملة' }
  },
  en: {
    brand: 'ASSEMBLY LINE',
    app: { title: 'Tracking System', subtitle: 'Track vehicles and missing parts across the assembly line' },
    common: {
      refresh: 'Refresh', add: 'Add', edit: 'Edit', delete: 'Delete', cancel: 'Cancel',
      save: 'Save', saveEdit: 'Save changes', confirm: 'Confirm', close: 'Close', loading: 'Loading...',
      saving: 'Saving...', search: 'Search', all: 'All', yes: 'Yes', no: 'No', required: 'required',
      actions: 'Actions', notes: 'Notes', logout: 'Logout', items: '{n} items', noData: 'No data.',
      noResults: 'No matching results.', error: 'Something went wrong.', cannotUndo: 'This cannot be undone.'
    },
    nav: { home: 'Home', missingParts: 'Vehicle Shortages', vehicles: 'Vehicle Delivery', settings: 'Settings' },
    home: {
      welcomeTitle: 'Welcome to the assembly line tracking system',
      welcomeSubtitle: 'Pick a module below or report a new shortage.',
      reportMissing: 'Report new shortage',
      modules: 'Modules', soon: 'Soon',
      total: 'Total vehicles', totalSub: 'All registered vehicles',
      withMissing: 'With shortages', withMissingSub: 'Vehicles with open shortages',
      blocked: 'Delivery blocked', blockedSub: 'Cannot be delivered now'
    },
    modules: {
      missingParts: 'Vehicle Shortages', missingPartsDesc: 'Report and track missing parts on vehicles',
      vehicles: 'Vehicle Delivery', vehiclesDesc: 'Completion, QC and delivery release',
      settings: 'Settings', settingsDesc: 'Models, stations, colors, users',
      productionOrders: 'Production Orders', productionOrdersDesc: 'Manage production orders and quantities',
      inventory: 'Inventory', inventoryDesc: 'Items, warehouses, stock issues',
      quality: 'Quality', qualityDesc: 'QC inspection and part approval',
      reports: 'Reports', reportsDesc: 'Dashboards, KPIs and aging reports'
    },
    login: {
      title: 'Assembly Line Tracking', subtitle: 'Sign in to continue',
      email: 'Email', password: 'Password', submit: 'Sign in', submitting: 'Signing in...',
      errRequired: 'Please enter email and password.', errFailed: 'Sign in failed.'
    },
    setup: {
      title: 'Database setup required',
      subtitle: 'Supabase connection works, but the system tables have not been created yet.',
      steps: 'Steps:',
      step1: 'Open the Supabase dashboard and go to SQL Editor.',
      step2: 'Run the migration files in order from supabase/migrations:',
      files: 'Migration files',
      promote: 'After running, promote your account to admin via:',
      refreshHint: 'Then press the “Refresh” button above.'
    },
    settings: {
      title: 'Settings',
      subtitle: 'Manage models, users, colors, work areas and stations.',
      tabs: { models: 'Models', areas: 'Work Areas', stations: 'Stations', colors: 'Vehicle Colors', users: 'Users' },
      addTitle: 'Add - {title}', editTitle: 'Edit - {title}',
      deleteTitle: 'Confirm delete', deleteMsg: 'Are you sure you want to delete “{name}”? This cannot be undone.',
      added: 'Added.', updated: 'Updated.', deleted: 'Deleted.',
      fields: {
        modelName: 'Model name', areaName: 'Area name', description: 'Description',
        stationNumber: 'Station number', stationName: 'Station name', workArea: 'Work area',
        colorName: 'Color name', color: 'Color', name: 'Name', email: 'Email', role: 'Role'
      },
      cols: {
        name: 'Name', description: 'Description', number: 'Number', workArea: 'Work Area',
        color: 'Color', hex: 'Hex', email: 'Email', role: 'Role'
      }
    },
    mp: {
      title: 'Vehicle Shortages',
      subtitle: 'A station reports a part that was not installed on a vehicle, linked to VIN, model, color and station.',
      report: 'Report new shortage', reportTitle: 'Report a new vehicle shortage',
      filterStation: 'All stations', filterPriority: 'All priorities', filterStatus: 'All statuses',
      searchPlaceholder: 'Search VIN / part',
      cols: {
        vin: 'VIN', model: 'Model', color: 'Color', station: 'Station', part: 'Missing part',
        qty: 'Qty', reason: 'Reason', department: 'Department', priority: 'Priority', status: 'Status',
        dr: 'DR', createdBy: 'Entered by', createdAt: 'Date'
      },
      f: {
        vin: 'VIN / Chassis number', model: 'Model', color: 'Color', station: 'Station',
        part: 'Missing part', qty: 'Required qty', reason: 'Reason', department: 'Department',
        priority: 'Priority', dr: 'DR item?', notes: 'Notes'
      },
      success: 'Shortage recorded successfully.'
    },
    vehicles: {
      title: 'Vehicle Delivery',
      subtitle: 'VIN, model, shortages, completion %, QC, delivery status.',
      newVehicle: 'New vehicle',
      cols: { vin: 'VIN', model: 'Model', po: 'Prod. Order', missing: 'Missing', completion: 'Completion', production: 'Production', qc: 'QC', delivery: 'Delivery' },
      release: 'Release', deliver: 'Deliver', blockedHint: 'Open shortages exist - cannot release',
      total: 'Total vehicles', withMissing: 'With shortages', blocked: 'Blocked', qcFailed: 'QC failed'
    },
    reason: { stock_shortage: 'Stock shortage', supplier_delay: 'Supplier delay', damaged_part: 'Damaged part', qc_rejection: 'QC rejection', wrong_part: 'Wrong part', production_mistake: 'Production mistake', other: 'Other' },
    department: { warehouse: 'Warehouse', purchasing: 'Purchasing', production: 'Production', quality: 'Quality', supplier: 'Supplier', management: 'Management' },
    priority: { low: 'Low', normal: 'Normal', high: 'High', critical: 'Critical' },
    mpStatus: { open: 'Open', waiting_purchase: 'Waiting purchase', available_in_stock: 'In stock', issued_to_production: 'Issued', installed: 'Installed', qc_pending: 'QC pending', closed: 'Closed', cancelled: 'Cancelled' },
    qcStatus: { pending: 'Pending', passed: 'Passed', failed: 'Failed', not_required: 'Not required' },
    deliveryStatus: { blocked: 'Blocked', ready: 'Ready', delivered: 'Delivered' },
    productionStatus: { planned: 'Planned', on_line: 'On line', off_line_incomplete: 'Off line (incomplete)', rework: 'Rework', completed: 'Completed' }
  }
} as const
