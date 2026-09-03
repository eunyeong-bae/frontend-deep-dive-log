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
    const [item, setItem] = useState<CartItem[]>(loadCart());

    const findProductById = (id: string) : Product | undefined => {
        return PRODUCTS.find((product) => product.id === id);
    }

    const addToCart = (id: string) => {        
        setItem((prev) => {
            const existing = prev.find((i) => i.id === id);
            if(!existing) return [...prev, {id, quantity: 1}];
            return prev.map((line) => line.id === id ? {...line, quantity: line.quantity +1} : line);
        })
    };

    const changeQty = (id: string, delta: number) => {
        setItem((prev) => 
            prev
                .map((line) => line.id === id ? {...line, quantity: line.quantity + delta}: line)
                .filter((line) => line.quantity > 0)

        )
    }

    const lines = item.map((line) => {
        const product = PRODUCTS.find((p) => p.id === line.id);
        return {...product, quantity: line.quantity, lineTotal: product?.price * line.quantity}
    });

    const totalCount = item.reduce((sum, line) => sum + line.quantity, 0);
    const totalPrice = lines.reduce((sum, line) => sum + line.lineTotal, 0);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(item));
    }, [item]);

    return (
        <div>
            <div style={{height: '50%'}}>
                {PRODUCTS.map((product:Product) => {
                    return (
                        <div id={product.id} style={{display:'flex', flexDirection:'row', justifyContent:'space-between', border:'1px solid black', marginBottom:'10px', padding:'10px'}}>
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
                {item.map((item: CartItem) => {
                    return (
                        <div id={item.id} style={{display:'flex'}}>
                            <p>{findProductById(item.id)?.name}</p>
                            <div style={{display:'flex', flexDirection:'row', marginLeft:'10px'}}>
                                <button onClick={() => {changeQty(item.id, 1)}}>+</button>
                                <p>수량: {item.quantity}</p>
                                <button onClick={() => {changeQty(item.id, -1)}}>-</button>

                            </div>
                            <p>총 가격: {lines.find((line) => line.id === item.id)?.lineTotal}원</p>
                        </div>
                    ) 
                })}

                <p> 총 수량: {totalCount}</p>
                <p> 총 금액: {totalPrice}원</p>
            </div>
{/*             
            <p>무료배송: {totalPrice >= 30000 ? '배송비 0원' : `${30000 - totalPrice}원 더 담으면 무료배송`}</p>
            <button onClick={() => setItem([])}>비우기</button> */}

        </div>
    )
    
}