update orders
set total_price = (select sum(od.price*od.quantity)
from order_detail od
where od.order_id = $1)
from orders od, order_detail de
where orders.id = $1;