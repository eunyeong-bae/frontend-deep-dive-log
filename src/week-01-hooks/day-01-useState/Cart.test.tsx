import { render, screen, within } from "@testing-library/react";
import { Cart } from "./Cart";
import userEvent from "@testing-library/user-event";

test('담기를 누르면 장바구니에 상품이 나타난다', async() => {
    const user = userEvent.setup();
    render(<Cart />);

    const addButtons = screen.getAllByRole('button', {name: '담기'});
    await user.click(addButtons[0]);

    //장바구니 영역에 '아메리카노'라는 텍스트가 나타나야 한다.
    const cart = screen.getByRole('region', {name: '장바구니'});
    expect(within(cart).getByText('아메리카노')).toBeInTheDocument();

})

test('같은 상품 담기 2번 -> 수량 2', async() => {
    const user = userEvent.setup();
    render(<Cart />);

    const addButtons = screen.getAllByRole('button', {name: '담기'});
    await user.click(addButtons[0]);
    await user.click(addButtons[0]);

    const cart = screen.getByRole('region', {name: '장바구니'});
    expect(within(cart).getByText('총 수량: 2')).toBeInTheDocument();
})

test('+/- 버튼을 눌러 수량 변경', async() => {
    const user = userEvent.setup();
    render(<Cart />);

    const cart = screen.getByRole('region', {name: '장바구니'});

    // 1) 먼저 상품을 담아야 +/- 버튼이 생기기때문
    await user.click(screen.getAllByRole('button', {name: '담기'})[0]);
    expect(within(cart).getByText('총 수량: 1')).toBeInTheDocument();

    // 2) + 버튼을 눌러 수량 증가
    await user.click(within(cart).getByRole('button', {name: '+'}));
    expect(within(cart).getByText('총 수량: 2')).toBeInTheDocument();

    // 3) - 버튼을 눌러 수량 감소
    await user.click(within(cart).getByRole('button', {name: '-'}));
    expect(within(cart).getByText('총 수량: 1')).toBeInTheDocument();
})

test('수량 1에서 - -> 장바구니에서 제거', async() => {
    const user = userEvent.setup();
    render(<Cart />);

    const cart = screen.getByRole('region', {name: '장바구니'});

    await user.click(screen.getAllByRole('button', {name: '담기'})[0]);
    expect(within(cart).getByText('총 수량: 1')).toBeInTheDocument();

    // 3) - 버튼을 눌러 수량 감소
    await user.click(screen.getByRole('button', {name: '-'}));
    expect(within(cart).queryByText('아메리카노')).not.toBeInTheDocument();
    expect(within(cart).queryByRole('button', {name: '-'})).not.toBeInTheDocument();

})
test('총 수량 / 총 금액이 내용과 일치', async() => {
    const user = userEvent.setup();
    render(<Cart />)

    const cart = screen.getByRole('region', {name: '장바구니'});
    const addButtons = screen.getAllByRole('button', {name: '담기'})

    await user.click(addButtons[0])
    await user.click(addButtons[0])
    await user.click(addButtons[1])

    expect(within(cart).getByText('총 수량: 3')).toBeInTheDocument();
    expect(within(cart).getByText('총 금액: 14000원')).toBeInTheDocument();
})

test('합계 30,000 미만 -> N원 더.. / 이상 -> 배송비 0원 ', async() => {
    const user = userEvent.setup();
    render(<Cart />)

    const cart = screen.getByRole('region', {name: '장바구니'})
    const addButtons = screen.getAllByRole('button', {name: '담기'})
    
    await user.click(addButtons[4])
    await user.click(addButtons[3])
    await user.click(addButtons[3])

    expect(screen.getByText('무료배송: 4000원 더 담으면 무료배송')).toBeInTheDocument()

    await user.click(addButtons[4])

    expect(screen.getByText('무료배송: 배송비 0원')).toBeInTheDocument()
})

test('재고 상한 도달 → + 버튼 disabled', async() => {
    const user = userEvent.setup();
    render(<Cart />)

    const cart = screen.getByRole('region', {name: '장바구니'})
    const addButtons = screen.getAllByRole('button', {name: '담기'})

    await user.click(addButtons[2])
    expect(within(cart).getByRole('button', {name:'+'})).toBeEnabled()

    await user.click(addButtons[2])
    expect(within(cart).getByRole('button', {name: '+'})).toBeDisabled()

})

test('localStorage에 값이 있으면 첫 렌더에서 복원', () => {
    localStorage.setItem('cart', JSON.stringify([{id: 'p1', quantity: 2}]))

    render(<Cart />)
    const cart = screen.getByRole('region', {name: '장바구니'})

    expect(within(cart).getByText('아메리카노')).toBeInTheDocument()
    expect(within(cart).getByText('수량: 2')).toBeInTheDocument()
    expect(within(cart).getByText('총 수량: 2')).toBeInTheDocument()
})