export type Lang = 'ar' | 'en'

// Nested dictionaries. Access with t('a.b.c'); supports {var} interpolation.
export const translations = {
  ar: {
    brand: 'خط الإنتاج',
    app: { title: 'نظام المتابعة', subtitle: 'متابعة السيارات والنواقص داخل خط إنتاج السيارات' },
    common: {
      refresh: 'تحديث', add: 'إضافة', edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء',
      save: 'حفظ', saveEdit: 'حفظ التعديل', confirm: 'تأكيد', close: 'إغلاق', loading: 'جاري التحميل...',
      saving: 'جاري الحفظ...', search: 'بحث', all: 'الكل', yes: 'نعم', no: 'لا', required: 'مطلوب', back: 'رجوع', next: 'التالي',
      actions: 'إجراءات', notes: 'ملاحظات', logout: 'خروج', items: '{n} عنصر', noData: 'لا توجد بيانات.',
      noResults: 'لا توجد نتائج مطابقة.', error: 'حدث خطأ.', cannotUndo: 'لا يمكن التراجع.'
    },
    nav: { home: 'الرئيسية', missingParts: 'نواقص السيارات', vehicles: 'تسليم السيارات', org: 'الهيكل الوظيفي', training: 'مصفوفة التدريب', bom: 'قائمة المكونات', settings: 'الإعدادات' },
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
      org: 'الهيكل الوظيفي', orgDesc: 'إدارة الموظفين والمسميات الوظيفية والتسلسل الإداري',
      training: 'مصفوفة التدريب', trainingDesc: 'مهارات الموظفين وتأهيل المحطات وانتهاء التدريبات',
      bom: 'قائمة المكونات', bomDesc: 'BOM هندسي — أجزاء السيارة حسب المحطة والموديل ومقارنة الأرقام',
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
      tabs: { models: 'الموديلات', areas: 'أماكن العمل', stations: 'المحطات', colors: 'ألوان السيارات', users: 'المستخدمون والصلاحيات' },
      addTitle: 'إضافة - {title}', editTitle: 'تعديل - {title}',
      deleteTitle: 'تأكيد الحذف', deleteMsg: 'هل أنت متأكد من حذف «{name}»؟ لا يمكن التراجع.',
      added: 'تمت الإضافة.', updated: 'تم التعديل.', deleted: 'تم الحذف.',
      wizard: {
        basic: 'البيانات الأساسية', location: 'المكان والخط', responsibility: 'المسؤولية', review: 'المراجعة',
        addStation: 'إضافة المحطة', saveEdit: 'حفظ التعديل',
        activeStatus: 'الحالة', active: 'مفعّلة', inactive: 'موقوفة',
        reviewHint: 'راجع البيانات قبل الحفظ.', empty: 'غير محدد'
      },
      fields: {
        modelName: 'اسم الموديل', areaName: 'اسم المكان', description: 'الوصف',
        stationNumber: 'رقم المحطة', stationName: 'اسم المحطة', workArea: 'مكان العمل',
        stationNameEn: 'اسم المحطة (إنجليزي)', stationType: 'نوع المحطة', sortOrder: 'الترتيب',
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
      noReportPermHint: 'لا يمكن التبليغ عن نقص بهذا الحساب (الدور: {role}). اطلب من المدير تغيير دور النظام إلى إنتاج أو مشرف، أو منح صلاحية «إنشاء» لنواقص السيارات من الإعدادات → المستخدمون والصلاحيات.',
      sectionVehicle: 'بيانات السيارة',
      sectionIssues: 'مشاكل السيارة',
      sectionIssuesHint: 'لكل مشكلة: المحطة، السبب، عدد السيارات، التصنيف، القسم — ثم شاسيه لكل سيارة.',
      issueN: 'مشكلة {n}', issueReasonPlaceholder: 'مثال: بدون كراسى، خبطة باب أ…',
      addIssueLine: 'إضافة مشكلة', singleVinTitle: 'رقم الشاسيه',
      f: {
        vin: 'رقم الشاسيه / VIN', model: 'الموديل', color: 'اللون', station: 'المحطة',
        part: 'القطعة الناقصة', qty: 'الكمية المطلوبة', reason: 'سبب النقص', department: 'الجهة المسؤولة',
        priority: 'الأولوية', dr: 'قطعة DR؟', stopper: 'نوع الإيقاف', notes: 'ملاحظات',
        vehicleCount: 'عدد السيارات', vinN: 'شاسيه {n}', partN: 'قطعة {n}'
      },
      vinListTitle: 'أرقام الشاسيه', vinCount: '{n} شاسيه', batchHintTotal: 'إجمالي سجلات النقص: {total}',
      vinListModal: { title: 'أرقام الشاسيه', subtitle: '{n} سيارة', open: 'عرض كل أرقام الشاسيه' },
      errIssueStation: 'المشكلة {n}: اختر المحطة.', errIssueVins: 'المشكلة {n}: أدخل كل أرقام الشاسيه.',
      errIssueVinIndex: 'المشكلة {issue} — شاسيه {vin}: 6 أحرف على الأقل.',
      deleteGroupConfirm: 'حذف {n} سجل نقص لـ «{part}»؟',
      addPartLine: 'إضافة قطعة', batchHint: '{lines} قطعة × {cars} سيارة = {total} سجل نقص.',
      batchSuccess: 'تم التسجيل: {cars} سيارة · {parts} سجل نقص',
      errAllVins: 'أدخل رقم شاسيه لكل سيارة حسب العدد المحدد.',
      errVinIndex: 'شاسيه رقم {n}: يجب 6 أحرف على الأقل.',
      errOnePart: 'أضف قطعة ناقصة واحدة على الأقل.',
      errOneIssue: 'أضف مشكلة واحدة على الأقل (وصف السبب).',
      filterStation: 'كل المحطات', filterPriority: 'كل الأولويات', filterStatus: 'كل الحالات',
      searchPlaceholder: 'بحث VIN / القطعة',
      tabs: { active: 'قائمة النواقص', history: 'الأرشيف / منتهية' },
      actionsHint: 'الأزرار بجانب الشاسيه: «انتهاء من السيارة» | عمود «إجراءات»: تعديل · تحديث · حذف. تأكد أنك في تبويب «قائمة النواقص» وليس الأرشيف.',
      complete: 'انتهاء من السيارة',
      completeDisabledHint: 'يجب تركيب كل القطع أولاً (المُركّب = المطلوب) عبر زر «تحديث».',
      completeConfirm: 'تأكيد انتهاء متابعة النقص للسيارة {vin} ونقلها للأرشيف؟',
      completeSuccess: 'تم أرشفة السيارة {vin} — كل القطع أُغلقت.',
      noActionsPerm: 'لا صلاحية',
      deleteConfirm: 'حذف سجل النقص «{part}»؟',
      detail: { title: 'تفاصيل النقص', stopper: 'عند الإنهاء (نوع الإيقاف)' },
      edit: {
        title: 'تعديل سجل النقص', vehicleTitle: 'تعديل مشاكل السيارة', groupTitle: 'تعديل تبليغ متعدد الشاسيه',
        editVehicle: 'تعديل كل المشاكل ({n})', saveAll: 'حفظ كل التعديلات',
        partRequired: 'وصف السبب مطلوب.', nothingChanged: 'لم يتغيّر شيء.',
        qtyBelowInstalled: 'الكمية المطلوبة لا يمكن أن تقل عن المُركّب.'
      },
      history: { empty: 'لا توجد سيارات منتهية في الأرشيف بعد.' },
      cols: {
        vin: 'رقم الشاسيه', model: 'الموديل', color: 'اللون', station: 'المحطة', part: 'القطعة الناقصة',
        qty: 'الكمية', reason: 'السبب', reasonClass: 'تصنيف السبب', department: 'القسم المسؤول',
        dateTime: 'التاريخ والوقت',
        priority: 'الأولوية', status: 'الحالة',
        dr: 'DR', stopper: 'نوع الإيقاف', createdBy: 'أدخلها', createdAt: 'التاريخ', actions: '',
        resolvedAt: 'تاريخ الإنهاء'
      },
      success: 'تم تسجيل النقص بنجاح.',
      thread: {
        open: 'ملاحظات السيارة ومتابعة النقص',
        placeholder: 'اكتب ملاحظة أو تحديثاً…',
        send: 'إرسال',
        empty: 'لا توجد ملاحظات بعد. ابدأ المحادثة بأول تعليق.',
        emptyNote: 'اكتب نص الملاحظة قبل الإرسال.',
        deleteNoteConfirm: 'حذف هذه الملاحظة؟',
        clearAll: 'مسح المحادثة بالكامل',
        clearAllConfirm: 'مسح كل ملاحظات هذه السيارة؟ لا يمكن التراجع.',
        deleteDenied: 'لا يمكن الحذف — تحتاج دور أدمن في النظام أو صلاحية إدارة المستخدمين. شغّل ترحيل 0020 و0021 على Supabase.'
      },
      act: {
        update: 'تحديث', title: 'تحديث الكمية المُركّبة',
        vehicleTitle: 'تحديث تركيب السيارة', vehicleIssues: '{n} مشكلة على هذه السيارة',
        updateVehicle: 'تحديث كل المشاكل ({n})', saveAll: 'حفظ كل التركيبات', noOpenIssues: 'لا توجد مشاكل مفتوحة على هذه السيارة.',
        required: 'المطلوب', installed: 'المُركّب', remaining: 'المتبقي',
        qtyCounter: 'الكمية المُركّبة', saveInstall: 'حفظ التركيب', willInstall: 'سيُضاف {n} للكمية المُركّبة',
        needIncrease: 'زِد العداد ثم احفظ — لا يمكن تقليل الكمية المحفوظة.',
        readyCompleteVehicle: 'اكتملت القطعة — إن كانت كل قطع السيارة كاملة اضغط «انتهاء من السيارة» في الجدول.',
        noInstallPerm: 'عرض فقط — التعديل يحتاج دور إنتاج/أدمن أو صلاحية تحديث نواقص السيارات.',
        usePlus: 'اضغط + لزيادة الكمية ثم «حفظ التركيب».',
        installed_btn: 'تم التركيب / التجميع', qcPass: 'اعتماد الجودة وإغلاق', qcFail: 'رفض الجودة', cancel: 'إلغاء النقص',
        done: 'تم تحديث الحالة.', noActions: 'لا توجد إجراءات متاحة لحالتك أو لحالة القطعة الحالية.'
      }
    },
    vehicles: {
      title: 'تسليم السيارات',
      subtitle: 'VIN، الموديل، النواقص، نسبة الاكتمال، الجودة، حالة التسليم.',
      newVehicle: 'سيارة جديدة',
      cols: { vin: 'VIN', model: 'الموديل', po: 'أمر الإنتاج', missing: 'النواقص', completion: 'الاكتمال', production: 'الإنتاج', qc: 'الجودة', delivery: 'التسليم' },
      release: 'تحرير', deliver: 'تسليم', blockedHint: 'يوجد نواقص مفتوحة - لا يمكن التحرير',
      total: 'إجمالي السيارات', withMissing: 'بها نواقص', blocked: 'محظورة', qcFailed: 'رفض جودة'
    },
    stopper: { line_stopper: 'موقف خط', car_stopper: 'موقف سيارة' },
    station: {
      search: 'ابحث باسم أو كود المحطة...', searching: 'جاري البحث...', noResults: 'لا توجد محطات مطابقة.',
      notFound: 'المحطة غير موجودة. برجاء التواصل مع المسؤول.', create: 'إنشاء محطة جديدة',
      code: 'الكود', line: 'الخط', area: 'المنطقة', department: 'الجهة', person: 'المسؤول', clear: 'مسح'
    },
    jobRole: {
      general_manager: 'مدير عام', manager: 'مدير', engineer: 'مهندس',
      supervisor: 'مشرف', assistant_supervisor: 'مساعد مشرف', technician: 'فني'
    },
    org: {
      title: 'الهيكل الوظيفي', subtitle: 'إدارة الموظفين والتسلسل الإداري في المصنع',
      tableView: 'عرض جدول', chartView: 'عرض هيكلي',
      add: 'إضافة موظف', edit: 'تعديل الموظف', view: 'عرض التفاصيل',
      activate: 'تفعيل', deactivate: 'إيقاف',
      count: '{n} موظف',
      f: {
        code: 'كود الموظف', name: 'الاسم الكامل', role: 'المسمى الوظيفي', department: 'القسم',
        workArea: 'منطقة العمل', station: 'المحطة', line: 'خط الإنتاج', manager: 'المدير المباشر',
        phone: 'الهاتف', email: 'البريد الإلكتروني', notes: 'ملاحظات', status: 'الحالة',
        active: 'مفعّل', inactive: 'موقوف', noManager: 'بدون مدير مباشر'
      },
      filters: { search: 'بحث بالاسم أو الكود...', role: 'كل المسميات', department: 'كل الأقسام', area: 'كل المناطق', status: 'كل الحالات' },
      steps: { basic: 'البيانات الأساسية', location: 'المكان والتبعية', contact: 'التواصل والملاحظات', review: 'المراجعة' },
      err: {
        codeRequired: 'كود الموظف مطلوب.', nameRequired: 'الاسم الكامل مطلوب.', roleRequired: 'المسمى الوظيفي مطلوب.',
        email: 'البريد الإلكتروني غير صحيح.', selfManager: 'لا يمكن أن يكون الموظف مديراً لنفسه.',
        managerInactive: 'المدير المباشر يجب أن يكون مفعّلاً.', duplicateCode: 'كود الموظف مستخدم بالفعل.'
      },
      noPerm: 'عرض فقط — التعديل متاح للمدير/الموارد البشرية.',
      empty: 'لا يوجد موظفون مسجلون بعد.'
    },
    stationType: {
      main_line: 'محطة على الخط', side_assembly: 'محطة تجميع جانبي', offline_prep: 'محطة تحضير'
    },
    trainingLevel: {
      level_0: 'غير مدرب', level_1: 'تدريب نظري', level_2: 'تحت إشراف', level_3: 'مؤهل للعمل وحده', level_4: 'مدرب'
    },
    trainingStatus: {
      not_trained: 'غير مدرب', in_training: 'تحت التدريب', qualified: 'مؤهل', expired: 'منتهي الصلاحية', suspended: 'موقوف'
    },
    qualReason: {
      not_trained: 'غير مدرب', level_too_low: 'المستوى أقل من المطلوب', expired: 'منتهي الصلاحية', suspended: 'موقوف', in_training: 'تحت التدريب'
    },
    training: {
      title: 'مصفوفة التدريب', subtitle: 'مهارات الموظفين وتأهيل المحطات',
      tabs: { skills: 'المهارات', operations: 'العمليات', stationSkills: 'مهارات المحطات', matrix: 'تدريب الموظفين', qualification: 'تأهيل المحطات', expiry: 'انتهاء التدريبات', import: 'استيراد العمليات' },
      view: { table: 'عرض جدول', grid: 'عرض المصفوفة' },
      add: 'إضافة', edit: 'تعديل', activate: 'تفعيل', deactivate: 'إيقاف', delete: 'حذف',
      addSkill: 'إضافة مهارة', addStationSkill: 'إضافة مهارة للمحطة', addRecord: 'إضافة تدريب لموظف',
      count: '{n} سجل',
      skill: {
        code: 'كود المهارة', nameAr: 'الاسم بالعربية', nameEn: 'الاسم بالإنجليزية', description: 'الوصف',
        department: 'القسم', station: 'المحطة المرتبطة', validity: 'مدة الصلاحية (يوم)', mandatory: 'إلزامية', status: 'الحالة',
        standardTime: 'الزمن المعياري (دقيقة)', manpower: 'العمالة المطلوبة', critical: 'عملية حرجة',
        addTitle: 'إضافة مهارة', editTitle: 'تعديل مهارة'
      },
      srs: {
        station: 'المحطة', skill: 'المهارة', level: 'المستوى المطلوب', mandatory: 'إلزامية', notes: 'ملاحظات', status: 'الحالة',
        addTitle: 'إضافة مهارة لمحطة', editTitle: 'تعديل مهارة المحطة', selectStation: 'اختر محطة'
      },
      rec: {
        employee: 'الموظف', skill: 'المهارة', level: 'المستوى', rating: 'التقييم', lastEval: 'آخر تقييم', noRating: 'بدون تقييم',
        status: 'الحالة', trainingDate: 'تاريخ التدريب',
        expiry: 'تاريخ الانتهاء', trainer: 'المدرب', notes: 'ملاحظات', attachment: 'رابط الشهادة', cert: 'شهادة',
        addTitle: 'إضافة سجل تدريب', editTitle: 'تعديل سجل تدريب', noTrainer: 'بدون مدرب'
      },
      filters: { search: 'بحث بالاسم أو الكود...', skill: 'كل المهارات', station: 'كل المحطات', department: 'كل الأقسام', level: 'كل المستويات', status: 'كل الحالات', expiry: 'كل التدريبات', expired: 'منتهية', near: 'قرب الانتهاء' },
      qual: {
        pick: 'اختر محطة لعرض التأهيل', required: 'المهارات المطلوبة', qualified: 'موظفون مؤهلون', notQualified: 'غير مؤهلين',
        reason: 'السبب', missing: 'المهارة الناقصة', current: 'المستوى الحالي', none: 'لا يوجد', noReq: 'لم يتم تحديد مهارات إلزامية لهذه المحطة.'
      },
      dash: {
        totalEmp: 'إجمالي الموظفين', qualified: 'موظفون مؤهلون', inTraining: 'تحت التدريب', expired: 'تدريبات منتهية',
        near: 'تنتهي خلال 30 يوم', expiredList: 'التدريبات المنتهية', nearList: 'تدريبات قرب الانتهاء'
      },
      err: { codeRequired: 'كود المهارة مطلوب.', nameRequired: 'يجب إدخال اسم المهارة (عربي أو إنجليزي).', duplicate: 'الكود مستخدم بالفعل.', empSkillRequired: 'الموظف والمهارة مطلوبان.', stationSkillRequired: 'المحطة والمهارة مطلوبتان.', dupReq: 'هذه المهارة محددة بالفعل لهذه المحطة.' },
      qualifiedBadge: 'مؤهل', notRequired: 'غير مطلوب',
      srsCols: { stationCode: 'كود المحطة', stationName: 'اسم المحطة' },
      noPerm: 'عرض فقط — التعديل متاح للمسؤولين.', empty: 'لا توجد بيانات حتى الآن', emptyHint: 'اضغط على زر الإضافة لتسجيل أول عنصر'
    },
    operations: {
      stationCode: 'المحطة', stationName: 'اسم المحطة', workplace: 'مكان العمل',
      totalWorkers: 'إجمالي عدد العمال', avgStationTime: 'متوسط وقت المحطة', minUnit: 'د',
      workerLabel: 'العامل', workerN: 'العامل رقم {n}', workerCode: 'رمز المحطة',
      workerLineCode: 'كود خط العامل (مثل PBS1-L1)', workerStationName: 'اسم المحطة',
      workerTotalTime: 'إجمالي وقت العمليات', workerCount: '{n} عامل',
      modelPages: 'صفحات الموديلات', allModels: 'كل الموديلات',
      allStationsTitle: 'كل المحطات والعمليات',
      modelPageTitle: 'عمليات موديل {model}',
      modelPageHint: 'عرض العمليات المرتبطة بهذا الموديل فقط',
      modelPageFullCopy: 'نفس قائمة كل الموديلات — العمليات المميزة بلون هذا الخط، والباقي باهت للمراجعة',
      allStationsHint: 'تجميع كل العمليات مع لون لكل خط إنتاج',
      colorLegend: 'ألوان الخطوط',
      countLineView: '{stations} محطة · {workers} عامل · {ops} عملية (مميزة لـ {line}: {lineOps})',
      count: '{stations} محطة · {ops} عملية',
      countHierarchical: '{stations} محطة رئيسية · {workers} عامل · {ops} عملية',
      opName: 'اسم العملية', opType: 'التصنيف', timeMin: 'زمن العملية (د)', workerMin: 'زمن العامل (د)',
      manpower: 'العمالة', hardware: 'الأدوات / القطع',
      editOp: 'تعديل العملية', opTypeCustom: 'تصنيف مخصص (مثال: t4c-t4l)',
      editParentStation: 'تعديل المحطة الرئيسية',
      stationNamePh: 'مثال: الأكر', workplaceEmpty: '— بدون منطقة —',
      noParentStationId: 'لا توجد محطة أم في قاعدة البيانات — أنشئها من الإعدادات أو أعد الاستيراد.',
      parentMetricsHint: 'اترك الحقول فارغة لاستخدام القيم المحسوبة من خطوط العمال.',
      addParentStation: 'إضافة محطة رئيسية', addWorker: 'إضافة عامل', addOperation: 'إضافة عملية',
      deleteParent: 'حذف المحطة', deleteWorker: 'حذف خط العامل', deleteOperation: 'حذف العملية',
      confirmDelete: 'تأكيد الحذف', workerNamePh: 'اسم اختياري للعامل',
      moveOperation: 'نقل العملية', moveTarget: 'نقل إلى عامل', moveConfirm: 'نقل',
      moveHint: 'تُنقل العملية مع أدواتها وربط الموديلات. يمكن النقل لأي عامل في أي محطة.',
      moveNoTargets: 'لا يوجد عامل آخر', moveDone: 'تم نقل العملية',
      moveDuplicate: 'يوجد عملية بنفس الاسم عند العامل المستهدف — غيّر الاسم أو احذف المكرر.',
      variantFilter: 'فلتر {line}', allVariants: 'كل {line}', variantPageHint: 'عرض عمليات {variant} ضمن خط {line}',
      classLegend: 'تصنيفات {line} (كما في الدراسة الزمنية)',
      emptyHint: 'استورد البيانات من تبويب استيراد العمليات أو تأكد من migration 0010',
      schemaHint: 'تأكد من تطبيق migration 0010 و 0011 في Supabase'
    },
    bom: {
      title: 'قائمة مكونات السيارة',
      subtitle: 'أجزاء السيارة حسب المحطة والموديل — BOM هندسي',
      tabs: { parts: 'قائمة الأجزاء', compare: 'مقارنة الأرقام', categories: 'التصنيفات', import: 'استيراد Excel', dashboard: 'ملخص BOM' },
      filterModel: 'فلتر الموديل', allModels: 'كل الموديلات', allBomSummary: 'إجمالي {n} صف BOM · {shown} معروض في الصفحة',
      selectModel: 'اختر موديلاً', noModelBom: 'لا توجد أجزاء — غيّر الفلتر أو أضف صفاً جديداً أو استورد من Excel.',
      modelBomSummary: '{model}: {n} جزء · {shown} معروض بعد التصفية',
      addRow: 'إضافة جزء', editRow: 'تعديل جزء', deleteRow: 'حذف من BOM',
      partNumberRequired: 'رقم الجزء مطلوب.', modelRequired: 'الموديل مطلوب.', noStation: 'بدون محطة',
      t4QuickFilter: 'موديلات T4', all: 'الكل',
      excel: {
        filter: 'فلتر العمود', searchValues: 'بحث في القيم…', selectAll: 'تحديد الكل', clearAll: 'إلغاء التحديد',
        clearFilter: 'إزالة الفلتر', clearAllFilters: 'مسح كل الفلاتر ({n})', filtersActive: '{n} فلتر نشط',
        blank: '(فارغ)', truncated: 'عرض أول القيم فقط — ضيّق الفلتر أو ابحث'
      },
      importT4Hint: 'يدعم ملف IPL-T4 (أعمدة T/L/C → T4T, T4L, T4C و T4 عند وجود الكميات للثلاثة)',
      col: {
        model_family: 'عائلة الموديل', applicable_models: 'الموديلات', station_code: 'المحطة', station_category: 'تصنيف المحطة',
        part_number: 'رقم الجزء', part_number_new: 'رقم جديد', alternative_part_no: 'بديل', part_name_ar: 'الاسم بالعربية',
        part_name_en: 'الاسم بالإنجليزية', part_kind: 'النوع', part_class: 'تصنيف الجزء', bom_classification: 'Classification',
        qty_by_model: 'الكميات', source_sheet: 'ورقة المصدر', source_row: 'صف المصدر', import_action: 'إجراء الاستيراد'
      },
      partNumber: 'رقم الجزء', partName: 'اسم الجزء', station: 'المحطة', model: 'الموديل', qty: 'الكمية',
      category: 'التصنيف', classification: 'تصنيف BOM', search: 'بحث', searchPh: 'رقم أو اسم الجزء...',
      uncategorizedOnly: 'غير مصنف فقط', needsReviewOnly: 'يحتاج مراجعة', uncategorized: 'غير مصنف',
      rowCount: '{n} صف', normalized: 'الرقم المُطبَّع', occurrences: 'التكرار', stations: 'محطات', models: 'موديلات',
      status: 'الحالة', duplicatesOnly: 'المكرر فقط', allStatuses: 'كل الحالات',
      partDetails: 'تفاصيل الجزء', usageTitle: 'استخدامات الجزء',
      categoryCode: 'كود التصنيف', categoryName: 'اسم التصنيف', partsCount: 'عدد الأجزاء',
      uncategorizedCount: '{n} جزء غير مصنف',
      importTitle: 'استيراد BOM من Excel', importHint: 'يفضّل ورقة BOM_App_Import — .xlsx',
      previewStats: '{total} صف جاهز · {errors} خطأ · {dup} مفتاح مكرر',
      confirmImport: 'تأكيد الاستيراد', importDone: 'اكتمل استيراد BOM',
      sumParts: 'أجزاء: {c} جديد · {u} محدّث', sumBom: 'صفوف BOM: {c} جديد · {u} محدّث',
      sumDup: 'أرقام مكررة: {n}', sumErr: 'أخطاء: {n}', row: 'صف',
      dashTotalRows: 'إجمالي صفوف BOM', dashUniqueParts: 'أرقام فريدة', dashDuplicates: 'أرقام مكررة',
      dashUncategorized: 'غير مصنف', dashStations: 'محطات', dashModels: 'موديلات', dashCategories: 'تصنيفات',
      dashLastImport: 'آخر استيراد', byCategory: 'حسب التصنيف', topRepeated: 'أكثر الأرقام تكراراً'
    },
    import: {
      title: 'استيراد بيانات العمليات', subtitle: 'رفع ملف Time Study (CSV/XLSX) وربطه بالمحطات والعمليات وتوجيه الموديل',
      formats: 'CSV أو Excel — صدّر من Google Sheet',
      chooseFile: 'اختر ملف',
      parsed: 'تم تحليل {n} عملية',
      familiesSaved: 'تم حفظ ربط عائلة تيجو 8',
      familyTitle: 'ربط موديلات تيجو 8', familyHint: 'عمليات T8 = common تُطبَّق فقط على الموديلات المحددة هنا (وليس كل الموديلات في النظام).',
      previewCount: '{stations} محطة · {ops} عملية',
      reviewDiff: 'مراجعة الفروقات',
      truncated: 'عرض أول 100 عملية فقط',
      diffTitle: 'معاينة قبل الحفظ', diffHint: 'راجع ما سيُنشأ أو يُحدَّث. ثم أكّد الاستيراد.',
      modeMerge: 'دمج (تحديث الموجود)', modeReplaceHw: 'دمج + استبدال قطع الغيار/الأدوات لكل عملية',
      confirm: 'تأكيد الاستيراد',
      completed: 'اكتمل الاستيراد',
      summaryTitle: 'ملخص الاستيراد',
      sum: { stations: 'محطات: {c} جديد · {u} محدّث', operations: 'عمليات: {c} جديد · {u} محدّث', hardware: 'سجلات أدوات: {n}', routes: 'مسارات موديل: {n}', skills: 'مهارات مرتبطة: {n}' },
      step: { upload: 'رفع', families: 'عائلة T8', preview: 'معاينة', diff: 'فروقات', done: 'تم' },
      col: { station: 'المحطة', operation: 'العملية', type: 'التصنيف', time: 'الزمن (د)', hw: 'أدوات' }
    },
    permissions: {
      tabs: { users: 'المستخدمون', roles: 'الأدوار', matrix: 'مصفوفة الصلاحيات', overrides: 'استثناءات', blocked: 'الحسابات المحظورة' },
      userEmail: 'البريد', linkedEmployee: 'الموظف المرتبط', jobRole: 'المسمى الوظيفي', systemRole: 'دور النظام', status: 'الحالة',
      statusBlocked: 'محظور', statusInactive: 'غير نشط', statusUnlinked: 'غير مرتبط بموظف', statusEmployeeStopped: 'موظف موقوف', statusActive: 'نشط',
      userBlocked: 'تم حظر المستخدم.', userUnblocked: 'تم إلغاء الحظر.',
      link: 'ربط', blockUser: 'حظر', unblockUser: 'إلغاء الحظر',
      module: 'الوحدة',
      action: { view: 'عرض', create: 'إنشاء', update: 'تعديل', delete: 'حذف', approve: 'اعتماد', import: 'استيراد', export: 'تصدير', manage: 'إدارة' },
      user: 'المستخدم', permission: 'الصلاحية', allow: 'مسموح', reason: 'السبب', savePermissions: 'حفظ الصلاحيات',
      linkUserEmployee: 'ربط مستخدم بموظف', employee: 'الموظف', noEmployee: 'بدون موظف',
      blockReason: 'سبب الإيقاف / الحظر', reasonRequired: 'سبب الإيقاف مطلوب.',
      suspendEmployee: 'إيقاف عن العمل', reactivateEmployee: 'إعادة تفعيل',
      suspendConfirm: 'سيتم إيقاف الموظف عن العمل. يمكن حظر حسابه المرتبط أيضاً.',
      blockLinkedUser: 'حظر حساب المستخدم المرتبط (إن وُجد)',
      reactivateConfirm: 'إعادة تفعيل الموظف للعمل؟'
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
      saving: 'Saving...', search: 'Search', all: 'All', yes: 'Yes', no: 'No', required: 'required', back: 'Back', next: 'Next',
      actions: 'Actions', notes: 'Notes', logout: 'Logout', items: '{n} items', noData: 'No data.',
      noResults: 'No matching results.', error: 'Something went wrong.', cannotUndo: 'This cannot be undone.'
    },
    nav: { home: 'Home', missingParts: 'Vehicle Shortages', vehicles: 'Vehicle Delivery', org: 'Org Structure', training: 'Training Matrix', bom: 'BOM', settings: 'Settings' },
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
      org: 'Org Structure', orgDesc: 'Manage employees, job roles and hierarchy',
      training: 'Training Matrix', trainingDesc: 'Employee skills, station qualification and expiry',
      bom: 'Bill of Materials', bomDesc: 'Engineering BOM — parts by station, model, and part-number comparison',
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
      tabs: { models: 'Models', areas: 'Work Areas', stations: 'Stations', colors: 'Vehicle Colors', users: 'Users & Permissions' },
      addTitle: 'Add - {title}', editTitle: 'Edit - {title}',
      deleteTitle: 'Confirm delete', deleteMsg: 'Are you sure you want to delete “{name}”? This cannot be undone.',
      added: 'Added.', updated: 'Updated.', deleted: 'Deleted.',
      wizard: {
        basic: 'Basic data', location: 'Location & line', responsibility: 'Responsibility', review: 'Review',
        addStation: 'Add station', saveEdit: 'Save changes',
        activeStatus: 'Status', active: 'Active', inactive: 'Inactive',
        reviewHint: 'Review the data before saving.', empty: 'Not set'
      },
      fields: {
        modelName: 'Model name', areaName: 'Area name', description: 'Description',
        stationNameEn: 'Station name (EN)', stationType: 'Station type', sortOrder: 'Sort order',
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
      noReportPermHint: 'You cannot report shortages with this account (role: {role}). Ask an admin to set your system role to Production or Supervisor, or grant missing_parts «create» in Settings → Users & Permissions.',
      sectionVehicle: 'Vehicle details',
      sectionIssues: 'Vehicle issues',
      sectionIssuesHint: 'Per issue: station, reason, vehicle count, class, department — then a VIN per vehicle.',
      issueN: 'Issue {n}', issueReasonPlaceholder: 'e.g. no seats, door A dent…',
      addIssueLine: 'Add issue', singleVinTitle: 'VIN number',
      vinListTitle: 'VIN numbers', vinCount: '{n} VINs', batchHintTotal: 'Total shortage records: {total}',
      vinListModal: { title: 'VIN numbers', subtitle: '{n} vehicles', open: 'Show all VIN numbers' },
      errIssueStation: 'Issue {n}: select a station.', errIssueVins: 'Issue {n}: enter all VIN numbers.',
      errIssueVinIndex: 'Issue {issue} — VIN {vin}: at least 6 characters.',
      deleteGroupConfirm: 'Delete {n} shortage records for «{part}»?',
      addPartLine: 'Add part', batchHint: '{lines} parts × {cars} vehicles = {total} shortage records.',
      batchSuccess: 'Recorded: {cars} vehicles · {parts} shortage lines',
      errAllVins: 'Enter a VIN for each vehicle in the count.',
      errVinIndex: 'VIN #{n}: must be at least 6 characters.',
      errOnePart: 'Add at least one missing part.',
      errOneIssue: 'Add at least one issue (reason description).',
      filterStation: 'All stations', filterPriority: 'All priorities', filterStatus: 'All statuses',
      searchPlaceholder: 'Search VIN / part',
      tabs: { active: 'Active shortages', history: 'Archive / completed' },
      actionsHint: 'Next to VIN: «Complete vehicle». In «Actions»: Edit · Update · Delete. Use the Active tab, not Archive.',
      complete: 'Complete vehicle',
      completeDisabledHint: 'Install all parts first (installed = required) via Update.',
      completeConfirm: 'Mark shortage follow-up complete for {vin} and move to archive?',
      noActionsPerm: 'No permission',
      completeSuccess: 'Vehicle {vin} archived — all lines closed.',
      deleteConfirm: 'Delete shortage record «{part}»?',
      detail: { title: 'Shortage details', stopper: 'Stopper (line / car)' },
      edit: {
        title: 'Edit shortage record', vehicleTitle: 'Edit vehicle issues', groupTitle: 'Edit multi-VIN report',
        editVehicle: 'Edit all issues ({n})', saveAll: 'Save all changes',
        partRequired: 'Reason description is required.', nothingChanged: 'Nothing changed.',
        qtyBelowInstalled: 'Required qty cannot be less than installed.'
      },
      history: { empty: 'No completed vehicles in the archive yet.' },
      cols: {
        vin: 'VIN', model: 'Model', color: 'Color', station: 'Station', part: 'Missing part',
        qty: 'Qty', reason: 'Reason', reasonClass: 'Reason class', department: 'Department',
        dateTime: 'Date & time',
        priority: 'Priority', status: 'Status',
        dr: 'DR', stopper: 'Stopper', createdBy: 'Entered by', createdAt: 'Date', actions: '',
        resolvedAt: 'Completed at'
      },
      f: {
        vin: 'VIN / Chassis number', model: 'Model', color: 'Color', station: 'Station',
        part: 'Missing part', qty: 'Required qty', reason: 'Reason', department: 'Department',
        priority: 'Priority', dr: 'DR item?', stopper: 'Stopper Type', notes: 'Notes',
        vehicleCount: 'Number of vehicles', vinN: 'VIN {n}', partN: 'Part {n}'
      },
      success: 'Shortage recorded successfully.',
      thread: {
        open: 'Vehicle notes & follow-up',
        placeholder: 'Write a note or update…',
        send: 'Send',
        empty: 'No notes yet. Start the thread with the first comment.',
        emptyNote: 'Enter note text before sending.',
        deleteNoteConfirm: 'Delete this note?',
        clearAll: 'Clear entire thread',
        clearAllConfirm: 'Delete all notes for this vehicle? This cannot be undone.',
        deleteDenied: 'Cannot delete — you need an admin system role or users.manage permission. Apply migrations 0020 and 0021 on Supabase.'
      },
      act: {
        update: 'Update', title: 'Update installed quantity',
        vehicleTitle: 'Update vehicle installation', vehicleIssues: '{n} issues on this vehicle',
        updateVehicle: 'Update all issues ({n})', saveAll: 'Save all installations', noOpenIssues: 'No open issues on this vehicle.',
        required: 'Required', installed: 'Installed', remaining: 'Remaining',
        qtyCounter: 'Installed quantity', saveInstall: 'Save installation', willInstall: 'Will add {n} to installed qty',
        needIncrease: 'Increase the counter before saving — cannot lower saved quantity.',
        readyCompleteVehicle: 'Part complete — when all lines for this VIN are full, press «Complete vehicle» in the table.',
        noInstallPerm: 'View only — editing requires Production/Admin or missing_parts update permission.',
        usePlus: 'Press + to increase, then «Save installation».',
        installed_btn: 'Mark installed / assembled', qcPass: 'Approve QC & close', qcFail: 'Reject QC', cancel: 'Cancel shortage',
        done: 'Status updated.', noActions: 'No actions available for your role or the current status.'
      }
    },
    vehicles: {
      title: 'Vehicle Delivery',
      subtitle: 'VIN, model, shortages, completion %, QC, delivery status.',
      newVehicle: 'New vehicle',
      cols: { vin: 'VIN', model: 'Model', po: 'Prod. Order', missing: 'Missing', completion: 'Completion', production: 'Production', qc: 'QC', delivery: 'Delivery' },
      release: 'Release', deliver: 'Deliver', blockedHint: 'Open shortages exist - cannot release',
      total: 'Total vehicles', withMissing: 'With shortages', blocked: 'Blocked', qcFailed: 'QC failed'
    },
    stopper: { line_stopper: 'Line Stopper', car_stopper: 'Car Stopper' },
    station: {
      search: 'Search by station name or code...', searching: 'Searching...', noResults: 'No matching stations.',
      notFound: 'Station not found. Please contact admin.', create: 'Create new station',
      code: 'Code', line: 'Line', area: 'Area', department: 'Dept', person: 'Owner', clear: 'Clear'
    },
    jobRole: {
      general_manager: 'General Manager', manager: 'Manager', engineer: 'Engineer',
      supervisor: 'Supervisor', assistant_supervisor: 'Assistant Supervisor', technician: 'Technician'
    },
    org: {
      title: 'Organizational Structure', subtitle: 'Manage factory employees and reporting hierarchy',
      tableView: 'Table View', chartView: 'Chart View',
      add: 'Add employee', edit: 'Edit employee', view: 'View details',
      activate: 'Activate', deactivate: 'Deactivate',
      count: '{n} employees',
      f: {
        code: 'Employee code', name: 'Full name', role: 'Job role', department: 'Department',
        workArea: 'Work area', station: 'Station', line: 'Production line', manager: 'Direct manager',
        phone: 'Phone', email: 'Email', notes: 'Notes', status: 'Status',
        active: 'Active', inactive: 'Inactive', noManager: 'No direct manager'
      },
      filters: { search: 'Search by name or code...', role: 'All roles', department: 'All departments', area: 'All areas', status: 'All statuses' },
      steps: { basic: 'Basic data', location: 'Location & reporting', contact: 'Contact & notes', review: 'Review' },
      err: {
        codeRequired: 'Employee code is required.', nameRequired: 'Full name is required.', roleRequired: 'Job role is required.',
        email: 'Invalid email address.', selfManager: 'An employee cannot manage themselves.',
        managerInactive: 'Direct manager must be active.', duplicateCode: 'Employee code already exists.'
      },
      noPerm: 'View only — editing is restricted to managers/HR.',
      empty: 'No employees registered yet.'
    },
    stationType: {
      main_line: 'Main line', side_assembly: 'Side assembly', offline_prep: 'Offline / prep'
    },
    trainingLevel: {
      level_0: 'Not trained', level_1: 'Theory only', level_2: 'Under supervision', level_3: 'Qualified (solo)', level_4: 'Trainer'
    },
    trainingStatus: {
      not_trained: 'Not trained', in_training: 'In training', qualified: 'Qualified', expired: 'Expired', suspended: 'Suspended'
    },
    qualReason: {
      not_trained: 'Not trained', level_too_low: 'Level too low', expired: 'Expired', suspended: 'Suspended', in_training: 'In training'
    },
    training: {
      title: 'Training Matrix', subtitle: 'Employee skills and station qualification',
      tabs: { skills: 'Skills', operations: 'Operations', stationSkills: 'Station Skills', matrix: 'Employee Matrix', qualification: 'Station Qualification', expiry: 'Training Expiry', import: 'Import Operations' },
      view: { table: 'Table view', grid: 'Matrix view' },
      add: 'Add', edit: 'Edit', activate: 'Activate', deactivate: 'Deactivate', delete: 'Delete',
      addSkill: 'Add skill', addStationSkill: 'Add station skill', addRecord: 'Add employee training',
      count: '{n} records',
      skill: {
        code: 'Skill code', nameAr: 'Name (Arabic)', nameEn: 'Name (English)', description: 'Description',
        department: 'Department', station: 'Related station', validity: 'Validity (days)', mandatory: 'Mandatory', status: 'Status',
        standardTime: 'Standard time (min)', manpower: 'Required manpower', critical: 'Critical operation',
        addTitle: 'Add skill', editTitle: 'Edit skill'
      },
      srs: {
        station: 'Station', skill: 'Skill', level: 'Required level', mandatory: 'Mandatory', notes: 'Notes', status: 'Status',
        addTitle: 'Add station skill', editTitle: 'Edit station skill', selectStation: 'Select a station'
      },
      rec: {
        employee: 'Employee', skill: 'Skill', level: 'Level', rating: 'Rating', lastEval: 'Last evaluation', noRating: 'No rating',
        status: 'Status', trainingDate: 'Training date',
        expiry: 'Expiry date', trainer: 'Trainer', notes: 'Notes', attachment: 'Certificate URL', cert: 'Cert',
        addTitle: 'Add training record', editTitle: 'Edit training record', noTrainer: 'No trainer'
      },
      filters: { search: 'Search by name or code...', skill: 'All skills', station: 'All stations', department: 'All departments', level: 'All levels', status: 'All statuses', expiry: 'All trainings', expired: 'Expired', near: 'Near expiry' },
      qual: {
        pick: 'Select a station to view qualification', required: 'Required skills', qualified: 'Qualified employees', notQualified: 'Not qualified',
        reason: 'Reason', missing: 'Missing skill', current: 'Current level', none: 'None', noReq: 'No mandatory skills defined for this station.'
      },
      dash: {
        totalEmp: 'Total employees', qualified: 'Qualified employees', inTraining: 'In training', expired: 'Expired trainings',
        near: 'Expiring in 30 days', expiredList: 'Expired trainings', nearList: 'Near-expiry trainings'
      },
      err: { codeRequired: 'Skill code is required.', nameRequired: 'A skill name (Arabic or English) is required.', duplicate: 'Code already exists.', empSkillRequired: 'Employee and skill are required.', stationSkillRequired: 'Station and skill are required.', dupReq: 'This skill is already set for this station.' },
      qualifiedBadge: 'Qualified', notRequired: 'Not required',
      srsCols: { stationCode: 'Station code', stationName: 'Station name' },
      noPerm: 'View only — editing is restricted to admins.', empty: 'No data yet', emptyHint: 'Click the Add button to create the first item'
    },
    operations: {
      stationCode: 'Station', stationName: 'Station name', workplace: 'Workplace',
      totalWorkers: 'Total workers', avgStationTime: 'Avg station time', minUnit: 'min',
      workerLabel: 'Worker', workerN: 'Worker #{n}', workerCode: 'Station code',
      workerLineCode: 'Worker line code (e.g. PBS1-L1)', workerStationName: 'Station name',
      workerTotalTime: 'Total operation time', workerCount: '{n} workers',
      modelPages: 'Model pages', allModels: 'All models',
      allStationsTitle: 'All stations & operations',
      modelPageTitle: '{model} operations',
      modelPageHint: 'Operations routed to this model only',
      modelPageFullCopy: 'Same list as All Models — this line highlighted, others dimmed for reference',
      allStationsHint: 'All operations aggregated with a color per product line',
      colorLegend: 'Line colors',
      countLineView: '{stations} stations · {workers} workers · {ops} ops ({line} highlighted: {lineOps})',
      count: '{stations} stations · {ops} operations',
      countHierarchical: '{stations} parent stations · {workers} workers · {ops} operations',
      opName: 'Operation name', opType: 'Classification', timeMin: 'Op time (min)', workerMin: 'Worker time (min)',
      manpower: 'Manpower', hardware: 'Hardware',
      editOp: 'Edit operation', opTypeCustom: 'Custom class (e.g. t4c-t4l)',
      editParentStation: 'Edit parent station',
      stationNamePh: 'e.g. Handles', workplaceEmpty: '— no area —',
      noParentStationId: 'No parent station record — create in Settings or re-import.',
      parentMetricsHint: 'Leave blank to use values calculated from worker lines.',
      addParentStation: 'Add parent station', addWorker: 'Add worker line', addOperation: 'Add operation',
      deleteParent: 'Delete station', deleteWorker: 'Delete worker line', deleteOperation: 'Delete operation',
      confirmDelete: 'Confirm delete', workerNamePh: 'Optional worker name',
      moveOperation: 'Move operation', moveTarget: 'Move to worker', moveConfirm: 'Move',
      moveHint: 'Operation moves with hardware and model routes. Any worker at any station.',
      moveNoTargets: 'No other workers', moveDone: 'Operation moved',
      moveDuplicate: 'Target worker already has an operation with this name.',
      variantFilter: '{line} sub-filter', allVariants: 'All {line}', variantPageHint: 'Showing {variant} operations on {line}',
      classLegend: '{line} classifications (time study)',
      emptyHint: 'Import data from Import tab or apply migration 0010',
      schemaHint: 'Apply migrations 0010 and 0011 in Supabase'
    },
    bom: {
      title: 'Bill of Materials',
      subtitle: 'Vehicle parts by station and model — engineering BOM',
      tabs: { parts: 'Parts list', compare: 'Part comparison', categories: 'Categories', import: 'Import Excel', dashboard: 'BOM dashboard' },
      filterModel: 'Model filter', allModels: 'All models', allBomSummary: '{n} total BOM rows · {shown} on this page',
      selectModel: 'Select a model', noModelBom: 'No parts — change filter, add a row, or import from Excel.',
      modelBomSummary: '{model}: {n} parts · {shown} shown after filters',
      addRow: 'Add part', editRow: 'Edit part', deleteRow: 'Remove from BOM',
      partNumberRequired: 'Part number is required.', modelRequired: 'Model is required.', noStation: 'No station',
      t4QuickFilter: 'T4 models', all: 'All',
      excel: {
        filter: 'Column filter', searchValues: 'Search values…', selectAll: 'Select all', clearAll: 'Clear selection',
        clearFilter: 'Clear filter', clearAllFilters: 'Clear all filters ({n})', filtersActive: '{n} active filters',
        blank: '(Blank)', truncated: 'Showing first values only — narrow search'
      },
      importT4Hint: 'Supports IPL-T4 files (T/L/C columns → T4T, T4L, T4C; T4 when all three have qty)',
      col: {
        model_family: 'Model family', applicable_models: 'Applicable models', station_code: 'Station', station_category: 'Station category',
        part_number: 'Part number', part_number_new: 'New part no.', alternative_part_no: 'Alternative', part_name_ar: 'Arabic name',
        part_name_en: 'English name', part_kind: 'Type', part_class: 'Part class', bom_classification: 'Classification',
        qty_by_model: 'Quantities', source_sheet: 'Source sheet', source_row: 'Source row', import_action: 'Import action'
      },
      partNumber: 'Part number', partName: 'Part name', station: 'Station', model: 'Model', qty: 'Qty',
      category: 'Category', classification: 'BOM class', search: 'Search', searchPh: 'Part number or name...',
      uncategorizedOnly: 'Uncategorized only', needsReviewOnly: 'Needs review', uncategorized: 'Uncategorized',
      rowCount: '{n} rows', normalized: 'Normalized', occurrences: 'Occurrences', stations: 'Stations', models: 'Models',
      status: 'Status', duplicatesOnly: 'Duplicates only', allStatuses: 'All statuses',
      partDetails: 'Part details', usageTitle: 'Where used',
      categoryCode: 'Category code', categoryName: 'Category name', partsCount: 'Parts',
      uncategorizedCount: '{n} uncategorized parts',
      importTitle: 'Import BOM from Excel', importHint: 'Prefer BOM_App_Import sheet — .xlsx',
      previewStats: '{total} rows ready · {errors} errors · {dup} duplicate keys',
      confirmImport: 'Confirm import', importDone: 'BOM import completed',
      sumParts: 'Parts: {c} new · {u} updated', sumBom: 'BOM rows: {c} new · {u} updated',
      sumDup: 'Duplicate numbers: {n}', sumErr: 'Errors: {n}', row: 'Row',
      dashTotalRows: 'Total BOM rows', dashUniqueParts: 'Unique part numbers', dashDuplicates: 'Duplicate numbers',
      dashUncategorized: 'Uncategorized', dashStations: 'Stations', dashModels: 'Models', dashCategories: 'Categories',
      dashLastImport: 'Last import', byCategory: 'By category', topRepeated: 'Most repeated part numbers'
    },
    import: {
      title: 'Import operation data', subtitle: 'Upload Time Study CSV/XLSX and map to stations, operations, and model routing',
      formats: 'CSV or Excel — export from Google Sheet',
      chooseFile: 'Choose file',
      parsed: 'Parsed {n} operations',
      familiesSaved: 'Tiggo 8 family mapping saved',
      familyTitle: 'Tiggo 8 model family', familyHint: 'T8 common operations apply only to models checked here, not all vehicle models.',
      previewCount: '{stations} stations · {ops} operations',
      reviewDiff: 'Review differences',
      truncated: 'Showing first 100 operations only',
      diffTitle: 'Preview before save', diffHint: 'Review creates/updates, then confirm import.',
      modeMerge: 'Merge (update existing)', modeReplaceHw: 'Merge + replace hardware per operation',
      confirm: 'Confirm import',
      completed: 'Import completed',
      summaryTitle: 'Import summary',
      sum: { stations: 'Stations: {c} new · {u} updated', operations: 'Operations: {c} new · {u} updated', hardware: 'Hardware rows: {n}', routes: 'Model routes: {n}', skills: 'Skills linked: {n}' },
      step: { upload: 'Upload', families: 'T8 family', preview: 'Preview', diff: 'Diff', done: 'Done' },
      col: { station: 'Station', operation: 'Operation', type: 'Class', time: 'Time (min)', hw: 'HW' }
    },
    permissions: {
      tabs: { users: 'Users', roles: 'Roles', matrix: 'Permission matrix', overrides: 'Overrides', blocked: 'Blocked accounts' },
      userEmail: 'Email', linkedEmployee: 'Linked employee', jobRole: 'Job role', systemRole: 'System role', status: 'Status',
      statusBlocked: 'Blocked', statusInactive: 'Inactive', statusUnlinked: 'Not linked', statusEmployeeStopped: 'Employee stopped', statusActive: 'Active',
      userBlocked: 'User blocked.', userUnblocked: 'User unblocked.',
      link: 'Link', blockUser: 'Block', unblockUser: 'Unblock',
      module: 'Module',
      action: { view: 'View', create: 'Create', update: 'Update', delete: 'Delete', approve: 'Approve', import: 'Import', export: 'Export', manage: 'Manage' },
      user: 'User', permission: 'Permission', allow: 'Allowed', reason: 'Reason', savePermissions: 'Save permissions',
      linkUserEmployee: 'Link user to employee', employee: 'Employee', noEmployee: 'No employee',
      blockReason: 'Block / stop reason', reasonRequired: 'A reason is required.',
      suspendEmployee: 'Suspend from work', reactivateEmployee: 'Reactivate',
      suspendConfirm: 'The employee will be suspended. The linked user account can also be blocked.',
      blockLinkedUser: 'Block linked user account (if any)',
      reactivateConfirm: 'Reactivate this employee for work?'
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
