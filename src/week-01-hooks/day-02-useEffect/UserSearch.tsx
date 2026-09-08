// UserSearch.tsx는 기본 요구사항(1~5) 부터 — 디바운스·레이스 없이 "타이핑하면 결과 나온다"까지만 먼저 돌려보고 가져와요.

import { useEffect, useState, type ChangeEvent } from "react"
import { searchUsers, type User } from "./fakeApi";


export function UserSearch() {
    const [input, setInput] = useState<string>('');
    const [users, setUsers] = useState<User[]>();
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleKeyword = (e: ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }

    useEffect(function detectChangingKeyword(){
        
        if(input === '') return;

        const getUsers = async() => {
            setIsLoading(true);

            const result = await searchUsers(input);
            console.log("🚀 ~ getUsers ~ result:", result)

            setUsers(result);
          
            
            setIsLoading(false);
        }

        getUsers();
    }, [input])

    if(isLoading) return <div>검색 중 ....</div>

    return (
        <div style={{width:'50%', margin:'0 auto'}}>
            <input 
                type="input" 
                placeholder="검색어를 입력하세요..." 
                onChange={(e) => handleKeyword(e)} 
                value={input}    
            />
            {isLoading && <div>검색 중 ....</div>  }
           
            {users?.map((user) => {
                return (
                    <ul key={user.id} style={{display:'flex', flexDirection:'row', justifyContent:'space-between'}}>
                        <li >{user.name}</li>
                        <li>{user.email}</li>
                    </ul>
                )})}
            
        </div>
    )
}