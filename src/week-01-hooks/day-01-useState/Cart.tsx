import { type Product, PRODUCTS } from './products'
import { useState } from 'react'

interface ItemProps {
    name: string;
    stock: number;
    totalPrice: number;
}

export function Cart() {
    const [item, setItem] = useState<ItemProps[]>([]);

    const handleAddToCart = (product: Product) => {
        console.log('clicked', product)
        
        findItemIndex(product);

    };

    const findItemIndex = (product: Product) => {
        const originItem = item.find(item => item.name === product.name);

        if(!originItem) setItem((prev) => [...prev, {name: product.name, stock: product.stock, totalPrice: product.price * product.stock}])
        else {
            const newItem = {...originItem};
            setItem((prev) => prev.map(item => item.name === product.name ? newItem : item));
        }
    }

    const handleQuantityChange = (item: ItemProps, status: boolean) => {
        if(item.stock === 0 && !status) {
            const removedItem = {...item};
            setItem((prev) => prev.filter(i => i.name !== removedItem.name));
            return;
        }

        if(status) {
            const newItem = {...item, stock: item.stock + 1, totalPrice: item.totalPrice + item.totalPrice / item.stock};
            setItem((prev) => prev.map(i => i.name === item.name ? newItem : i));
        } else {
            const newItem = {...item, stock: item.stock - 1, totalPrice: item.totalPrice - item.totalPrice / item.stock};
            setItem((prev) => prev.map(i => i.name === item.name ? newItem : i));
        }
    }


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
                            <button onClick={() => handleAddToCart(product)}>담기</button>
                        </div>
                    )
                })}
            </div>

            <div>
                <h2>장바구니</h2>
                {item.map((item: ItemProps) => {
                    return (
                        <div id={item.name} style={{display:'flex'}}>
                            <p>{item.name}</p>
                            <div style={{display:'flex', flexDirection:'row', marginLeft:'10px'}}>
                                <button onClick={() => {handleQuantityChange(item, true)}}>+</button>
                                <p>수량: {item.stock }원</p>
                                <button onClick={() => {handleQuantityChange(item, false)}}>-</button>

                            </div>
                            <p>총 가격: {item.totalPrice}원</p>
                        </div>
                    )
                })}

                <p> 총 수량: {item.reduce((acc, curr) => acc + curr.stock, 0)}</p>
                <p> 총 금액: {item.reduce((acc, curr) => acc + curr.totalPrice, 0)}원</p>
            </div>

        </div>
    )
    
}