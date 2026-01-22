SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'authority_profiles_scope_check';
