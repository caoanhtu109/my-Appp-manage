select product_id, quantity, price 
from order_detail 
where order_id = $1 and product_id= $2;