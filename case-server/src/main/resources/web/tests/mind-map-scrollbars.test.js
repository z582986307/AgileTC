import { getScrollAxis } from '../src/components/react-mindmap-editor/components/mindMapScrollbars';

describe('脑图滚动条边界', () => {
  test('横向滑块可覆盖整个逻辑布局并到达最右端', () => {
    const axis = getScrollAxis(-100, 4900, 0, 1000, 600);
    expect(axis.travel).toBeGreaterThan(0);
    expect(axis.position(0)).toBe(-100);
    expect(axis.position(1)).toBe(3900);
  });

  test('纵向内容小于视口时不产生可拖动距离', () => {
    const axis = getScrollAxis(0, 400, 0, 800, 500);
    expect(axis.travel).toBe(0);
    expect(axis.position(1)).toBe(0);
  });
});
