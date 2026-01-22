-- Check constraint definition
SELECT pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = '2200_20597_1_not_null';

-- Check all CHECK constraints on broadcasts
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'broadcasts'::regclass
  AND contype = 'c';
