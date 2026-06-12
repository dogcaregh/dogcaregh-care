-- Reinterpret dog age from years to months.
-- Existing values (stored as whole years) are multiplied by 12.
-- New entries will be entered and stored directly in months.
UPDATE dogs SET age = age * 12 WHERE age IS NOT NULL;
