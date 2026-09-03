// import {render, screen} from '@testing-library/react';
// import userEvent from '@testing-library/user-event';
// import { Cart } from './Cart';

// describe('Cart 컴포넌트 테스트', () => {
//     render(<Cart />);
//     const addButton = screen.getByRole('button', {name: '담기'});
//     expect(addButton).toBeInTheDocument();
//     const increaseButton = screen.getByRole('button', {name: '+'});
//     expect(increaseButton).toBeInTheDocument();
//     expect(increaseButton).toBeGreaterThan(0);
//     expect(increaseButton).toBeLessThan(1);
//     expect(increaseButton).toBeDisabled();
//     const decreaseButton = screen.getByRole('button', {name: '-'});
//     expect(decreaseButton).toBeInTheDocument();
//     expect(decreaseButton).toBeGreaterThan(0);
//     expect(decreaseButton).toBeLessThan(1);
//     expect(decreaseButton).toBeDisabled();
// })


// /**
//  * 
//  * 
//  * import { render, screen } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
// import { useState } from 'react'

// function Counter() {
//   const [n, setN] = useState(0)
//   return <button onClick={() => setN((v) => v + 1)}>count: {n}</button>
// }

// test('테스트 파이프라인 동작 확인', async () => {
//   render(<Counter />)
//   const button = screen.getByRole('button')
//   expect(button).toHaveTextContent('count: 0')
//   await userEvent.click(button)
//   expect(button).toHaveTextContent('count: 1')
// })
//  */