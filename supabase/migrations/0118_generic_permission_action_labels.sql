-- Normalize common action labels in system_permissions (generic, not module-specific).

update public.system_permissions set
  permission_name_ar = case permission_key
    when 'view' then 'عرض'
    when 'create' then 'إضافة'
    when 'update' then 'تعديل'
    when 'delete' then 'حذف'
    when 'filter' then 'فلاتر'
    when 'update_status' then 'تحديث الحالة'
    when 'notes' then 'ملاحظات'
    when 'complete' then 'إكمال'
    when 'bulk_install' then 'تنفيذ جماعي'
    when 'approve' then 'اعتماد'
    when 'import' then 'استيراد'
    when 'export' then 'تصدير'
    when 'print' then 'طباعة'
    when 'manage' then 'إدارة'
    when 'assign' then 'تعيين'
    when 'override' then 'تجاوز'
    else permission_name_ar
  end,
  permission_name_en = case permission_key
    when 'view' then 'View'
    when 'create' then 'Add'
    when 'update' then 'Edit'
    when 'delete' then 'Delete'
    when 'filter' then 'Filters'
    when 'update_status' then 'Update status'
    when 'notes' then 'Notes'
    when 'complete' then 'Complete'
    when 'bulk_install' then 'Bulk action'
    when 'approve' then 'Approve'
    when 'import' then 'Import'
    when 'export' then 'Export'
    when 'print' then 'Print'
    when 'manage' then 'Manage'
    when 'assign' then 'Assign'
    when 'override' then 'Override'
    else permission_name_en
  end
where permission_key in (
  'view', 'create', 'update', 'delete', 'filter', 'update_status', 'notes',
  'complete', 'bulk_install', 'approve', 'import', 'export', 'print',
  'manage', 'assign', 'override'
);
