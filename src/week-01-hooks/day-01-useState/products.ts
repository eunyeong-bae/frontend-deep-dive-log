export interface Product {
  id: string
  name: string
  price: number   // 원
  stock: number   // 담을 수 있는 최대 수량
}

export const PRODUCTS: Product[] = [
  { id: 'p1', name: '아메리카노',    price: 4500,  stock: 5 },
  { id: 'p2', name: '카페라떼',      price: 5000,  stock: 3 },
  { id: 'p3', name: '콜드브루',      price: 5500,  stock: 2 },
  { id: 'p4', name: '녹차',          price: 4000,  stock: 10 },
  { id: 'p5', name: '핸드드립 원두',  price: 18000, stock: 4 },
]