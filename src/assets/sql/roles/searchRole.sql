SELECT * FROM roles WHERE name ILIKE $1 ORDER BY id ASC OFFSET $2 LIMIT $3