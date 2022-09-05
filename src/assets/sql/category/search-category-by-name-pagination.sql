SELECT 
  c.id,
  c.name,
  c.created_at,
  c.updated_at
FROM categories c
WHERE 
  name ILIKE $1 
ORDER BY c.id ASC 
OFFSET $2 
LIMIT $3
;