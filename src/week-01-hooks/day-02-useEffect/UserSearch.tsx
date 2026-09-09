import { useEffect, useState, type ChangeEvent } from "react"
import { searchUsers, type User } from "./fakeApi";

function isAbortError(e: unknown) {
        return e instanceof DOMException && e.name === 'AbortError'
}

export function UserSearch() {
    const [input, setInput] = useState<string>('');
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isError, setIsError] = useState<boolean>(false);

    const handleKeyword = (e: ChangeEvent<HTMLInputElement>) => {
        setInput(e.target.value);
    }

    useEffect(function detectChangingKeyword(){

        const query = input.trim();
        if(query === '') {
            return;
        }

        const controller = new AbortController();
        const timer = setTimeout(async() => {
            try{
                setIsLoading(true)
                const result = await searchUsers(query, {signal: controller.signal});
                setUsers(result);
                setIsError(false)
                setIsLoading(false)
            }catch(error) {
                if(isAbortError(error)) return;

                setIsError(true);
                setIsLoading(false);
            }
        }, 300);


        return () => {
            clearTimeout(timer);
            controller.abort();
        }
    }, [input])

    const results = input.trim() === '' ? [] : users;

    return (
        <div style={{width:'50%', margin:'0 auto'}}>
            <input 
                type="text" 
                placeholder="검색어를 입력하세요..." 
                onChange={handleKeyword} 
                value={input}    
            />
            {isLoading && <div>검색 중 ....</div>  }
            {isError && <p role="alert">Error!!</p>}
           
            <ul>
                {results.map((user) => (
                    <li key={user.id}>{user.name} — {user.email}</li>
                ))}
            </ul>
            <p>결과 개수: {results.length}명</p>
        </div>
    )
}