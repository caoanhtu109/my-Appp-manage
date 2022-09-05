insert into public.order_detail (order_id, product_id, quantity, price) 
values ($1, $2, $3, $4) returning order_id;

