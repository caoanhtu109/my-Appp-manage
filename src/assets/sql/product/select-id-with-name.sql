SELECT p.id
FROM products p 
WHERE p."name" ILIKE $1 
GROUP BY p.id 
ORDER BY p.id ASC
;