// UserSearch.tsx는 기본 요구사항(1~5) 부터 — 디바운스·레이스 없이 "타이핑하면 결과 나온다"까지만 먼저 돌려보고 가져와요.

import { useState } from "react";
import { type User } from "./fakeApi";

const SAMPLE_USERS: User[] = [
  { id: 1, name: 'Alice Kim', email: 'alice@corp.com' },
  { id: 2, name: 'Bob Lee', email: 'bob@gmail.com' },
  { id: 3, name: 'Carol Park', email: 'carol@corp.com' },
]

function DerivedList({users} : {users: User[]}) {
    const newUsers = users.filter((u) => u.id);
    return (
        <ul>
            {newUsers.map((user) => (
                <li key={user.id}>{user.name}</li>
            ))}
        </ul>
    )
}

function FullName() {
    const [first, setFirst] = useState('');
    const [last, setLast] = useState('');
    const fullName = `${first} ${last}`.trim();

    return (
        <>
            <input value={first} onChange={(e) => setFirst(e.target.value)} />
            <input value={last} onChange={(e) => setLast(e.target.value)} />
            <p>{fullName}</p>
        </>
    )
}

function ProfileForm({userId}: {userId: number}) {
    const [bio, setBio] = useState('');

    return (
        <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder={`user ${userId}`} />    
    )
}
export function BadEffects() {
    const [userId, setUserId] = useState(1);

    return (
        <div style={{width:'50%', margin:'0 auto', border:'1px solid red'}}>
           <DerivedList users={SAMPLE_USERS}/>
           <FullName />
           <button onClick={() => setUserId((id) => id === 1 ? 2 : 1)}>user change</button>
           <ProfileForm key={userId} userId={userId}/>
        </div>
    )
}