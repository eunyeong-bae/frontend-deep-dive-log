import { type Product, PRODUCTS } from './products'
import { useState, useEffect } from 'react'

interface CartItem {
    id: string;
    quantity: number;
}

const STORAGE_KEY = 'cart';
function loadCart(): CartItem[] {
    try{
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    }catch{
        return [];
    }
}

export function Cart() {
    const [items, setItems] = useState<CartItem[]>(loadCart);

    const addToCart = (id: string) => {        
        setItems((prev) => {
            const existing = prev.find((i) => i.id === id);
            if(!existing) return [...prev, {id, quantity: 1}];
            return prev.map((line) => line.id === id ? {...line, quantity: line.quantity +1} : line);
        })
    };

    const changeQty = (id: string, delta: number) => {
        setItems((prev) => 
            prev
                .map((line) => line.id === id ? {...line, quantity: line.quantity + delta}: line)
                .filter((line) => line.quantity > 0)

        )
    }

    const lines = items.map((line) => {
        const product = PRODUCTS.find((p) => p.id === line.id)!;
        return {...product, quantity: line.quantity, lineTotal: product.price * line.quantity}
    });

    const totalCount = items.reduce((sum, line) => sum + line.quantity, 0);
    const totalPrice = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    useEffect(() => {
        localStorage.setItems(STORAGE_KEY, JSON.stringify(items));
    }, [items]);

    return (
        <div>
            <div style={{height: '50%'}}>
                {PRODUCTS.map((product:Product) => {
                    return (
                        <div key={product.id} style={{display:'flex', flexDirection:'row', justifyContent:'space-between', border:'1px solid black', marginBottom:'10px', padding:'10px'}}>
                            <div>
                                <h3>{product.name}</h3>
                                <p>가격: {product.price}원</p>
                                <p>재고: {product.stock}</p>
                            </div>
                            <button onClick={() => addToCart(product.id)}>담기</button>
                        </div>
                    )
                })}
            </div>

            <div>
                <h2>장바구니</h2>
                {lines.map((line) => {
                    return (
                        <div key={line.id} style={{display:'flex'}}>
                            <p>{line.name}</p>
                            <div style={{display:'flex', flexDirection:'row', marginLeft:'10px'}}>
                                <button disabled={line.quantity >= line.stock} onClick={() => {changeQty(line.id, 1)}}>+</button>
                                <p>수량: {line.quantity}</p>
                                <button onClick={() => {changeQty(line.id, -1)}}>-</button>

                            </div>
                            <p>총 가격: {line.lineTotal}원</p>
                        </div>
                    ) 
                })}

                <p> 총 수량: {totalCount}</p>
                <p> 총 금액: {totalPrice}원</p>
            </div>
           
            <p>무료배송: {totalPrice >= 30000 ? '배송비 0원' : `${30000 - totalPrice}원 더 담으면 무료배송`}</p>
            
            <button onClick={() => setItems([])}>비우기</button> 

        </div>
    )
    
}