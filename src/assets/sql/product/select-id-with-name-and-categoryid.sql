SELECT p.id
FROM products p 
INNER JOIN product_category pc2 ON p.id = pc2.product_id 
WHERE p."name" ILIKE $2 AND pc2.category_id = ANY($1::int[])
GROUP BY p.id 
ORDER BY p.id ASC
;