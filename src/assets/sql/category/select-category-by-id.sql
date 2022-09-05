SELECT 
  c.id,
  c.name,
  c.created_at,
  c.updated_at
FROM categories c
WHERE id=$1
;
