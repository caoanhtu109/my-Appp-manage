select o.id, o.user_id, pf."firstname",
			(
				select array_to_json(array_agg(pf)) as product
				from (
					select p.id, p."name", od.quantity, od.price, (od.price * od.quantity) as "subprice"  
					from products p 
					inner join order_detail od on od.product_id = p.id
					where od.order_id = o.id 
				) pf
			),
			o.total_price, 
			o.create_at,
			o.update_at,
			o.status 
from ((orders o inner join users u on o.user_id = u.id)
		inner join profiles pf on u.profile_id = pf.id )
where o.id = $1;
