import { type Product, PRODUCTS } from './products'
import { useState, useMemo } from 'react'

interface ItemProps {
    name: string;
    stock: number;
    totalPrice: number;
    possibleStock: number;
}

export function Cart() {
    // const [item, setItem] = useState<ItemProps[]>(() => {
    //     const savedCart = localStorage.getItem('cart');
    //     return savedCart ? JSON.parse(savedCart) : localStorage.setItem('cart', JSON.stringify([]));
    // });
    const [item, setItem] = useState<ItemProps[]>([]);

    const handleAddToCart = (product: Product) => {
        console.log('clicked', product)
        
        findItemIndex(product);

    };

    const findItemIndex = (product: Product) => {
        const originItem = item.find(item => item.name === product.name);

        if(!originItem) setItem((prev) => [...prev, {name: product.name, stock: 1, totalPrice: product.price, possibleStock: product.stock}]);
        else {
            const newItem = {...originItem, stock: originItem.stock + 1, totalPrice: originItem.totalPrice + product.price};
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

    const totalPrice = useMemo(() => {
        return item.reduce((acc,curr) => acc+curr.totalPrice, 0);
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
                            <button onClick={() => handleAddToCart(product)}>담기</button>
                        </div>
                    )
                })}
            </div>

            <div>
                <h2>장바구니</h2>
                {item.map((item: ItemProps) => {
                    return item.stock > 0 ? (
                        <div id={item.name} style={{display:'flex'}}>
                            <p>{item.name}</p>
                            <div style={{display:'flex', flexDirection:'row', marginLeft:'10px'}}>
                                <button disabled={item.stock>= item.possibleStock} onClick={() => {handleQuantityChange(item, true)}}>+</button>
                                <p>수량: {item.stock }원</p>
                                <button onClick={() => {handleQuantityChange(item, false)}}>-</button>

                            </div>
                            <p>총 가격: {item.totalPrice}원</p>
                        </div>
                    ) : null
                })}

                <p> 총 수량: {item.reduce((acc, curr) => acc + curr.stock, 0)}</p>
                <p> 총 금액: {totalPrice}원</p>
            </div>
            
            <p>무료배송: {totalPrice >= 30000 ? '배송비 0원' : `${30000 - totalPrice}원 더 담으면 무료배송`}</p>
            <button onClick={() => setItem([])}>비우기</button>

        </div>
    )
    
}