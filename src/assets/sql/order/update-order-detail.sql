update order_detail 
set quantity = $1, price = $2
where order_id = $3 and product_id = $4
returning product_id, quantity, price;