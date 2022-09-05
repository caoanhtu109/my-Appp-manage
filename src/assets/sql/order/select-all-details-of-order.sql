select od.product_id, od.quantity, od.price, (od.quantity*od.price) as into_money, od.create_at, od.update_at 
from order_detail od where order_id = $1
order by create_at DESC
offset $2
limit $3;