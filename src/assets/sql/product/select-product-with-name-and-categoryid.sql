SELECT 
  p.id, 
  p."name", 
  p.description, 
  p.price,
  p.image,
  (
    SELECT array_to_json(array_agg(c)) AS category
    FROM 
    (
      SELECT 
        c.id, 
        c."name" 
      FROM categories c 
      INNER JOIN product_category pc ON c.id = pc.category_id 
      WHERE pc.product_id = p.id
    ) c
  ), 
  p.created_at, 
  p.updated_at
FROM products p 
INNER JOIN product_category pc2 ON p.id = pc2.product_id 
WHERE p."name" ILIKE $2 and pc2.category_id = ANY($1::int[])
GROUP BY p.id 
ORDER BY id ASC
OFFSET $3 
LIMIT $4
;