import { memo, useCallback, useMemo, useState } from "react";
import { makeItems, type Item } from "./makeItems"
import { useRenderCount } from "./useRenderCount";

const DATA = makeItems(500);

const Row = memo(function Row({item, onSelect}: {item: Item, onSelect:(id: number)=>void}) {
    const renderCount = useRenderCount();

    return <p onClick={() => onSelect(item.id)}>{item.name} - Render {renderCount}회</p>
})

export function ItemList () {
    const [count, setCount] = useState(0);
    const [keyword, setKeyword] = useState('');
    const [category, setCategory] = useState<'ALL' | 'A' | 'B' | 'C'>('ALL');
    const [sort, setSort] = useState<'name' | 'score'>('name')

    const visibleItems = useMemo(()=> {
        return DATA
        .filter((item) => category === 'ALL' || item.category === category)
        .filter((item) => item.name.toLowerCase().includes(keyword.toLowerCase()))
        .sort((a,b) => {
            if(sort === 'name') return a.name.localeCompare(b.name)
            return b.score - a.score
        });
    }, [keyword, category, sort])

    const handleSelect = useCallback((id: number) => {
        console.log(id)
    }, []);

    return (
        <div style={{width:'50%', margin:'0 auto'}}>
            <input type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="input keyword" />
            <div>
                {(['ALL', 'A', 'B', 'C'] as const).map((c) => (
                    <button key={c} onClick={() => setCategory(c)}>{c}</button>
                ))}
            </div>
            <div>
                <button onClick={() => setSort('name')}>이름순</button>
                <button onClick={() => setSort('score')}>점수순</button>
            </div>

            <button onClick={() => setCount((prev) => prev+1)}>+{count}</button>


            <p>{visibleItems.length}개</p>
            {visibleItems.map((item) => (
                <Row key={item.id} item={item} onSelect={handleSelect}/>
            ))}

        </div>
    )
}