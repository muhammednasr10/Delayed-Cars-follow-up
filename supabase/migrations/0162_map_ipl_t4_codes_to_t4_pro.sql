-- Map IPL codes T4T/T4L/T4C to catalog variant names so IPL-by-model tabs show imported rows.

UPDATE bom_items b
SET
  qty_by_model_raw = replace(b.qty_by_model_raw, 'T4T=', v.name || '='),
  applicable_models_text = replace(coalesce(b.applicable_models_text, ''), 'T4T', v.name)
FROM vehicle_models v
WHERE v.is_active
  AND regexp_replace(upper(v.name), '[\s_-]+', '', 'g') = 'T4PROT'
  AND b.is_active
  AND (
    coalesce(b.qty_by_model_raw, '') LIKE '%T4T=%'
    OR coalesce(b.applicable_models_text, '') LIKE '%T4T%'
  );

UPDATE bom_items b
SET
  qty_by_model_raw = replace(b.qty_by_model_raw, 'T4L=', v.name || '='),
  applicable_models_text = replace(coalesce(b.applicable_models_text, ''), 'T4L', v.name)
FROM vehicle_models v
WHERE v.is_active
  AND regexp_replace(upper(v.name), '[\s_-]+', '', 'g') = 'T4PROL'
  AND b.is_active
  AND (
    coalesce(b.qty_by_model_raw, '') LIKE '%T4L=%'
    OR coalesce(b.applicable_models_text, '') LIKE '%T4L%'
  );

UPDATE bom_items b
SET
  qty_by_model_raw = replace(b.qty_by_model_raw, 'T4C=', v.name || '='),
  applicable_models_text = replace(coalesce(b.applicable_models_text, ''), 'T4C', v.name)
FROM vehicle_models v
WHERE v.is_active
  AND regexp_replace(upper(v.name), '[\s_-]+', '', 'g') = 'T4PROC'
  AND b.is_active
  AND (
    coalesce(b.qty_by_model_raw, '') LIKE '%T4C=%'
    OR coalesce(b.applicable_models_text, '') LIKE '%T4C%'
  );
