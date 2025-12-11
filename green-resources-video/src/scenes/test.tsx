import {makeScene2D, Txt, Rect, Layout} from '@motion-canvas/2d';
import {
  createRef,
  all,
  easeOutCubic,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {Window} from '../nodes/Window';

// 主题颜色配置
const theme = {
  bg: '#1a1a1a',
  bgDark: '#0d0d0d',
  stroke: '#ffffff',
  window: '#4CAF50', // 窗口边框和背景色
  buttons: '#ffffff', // 按钮颜色
  text: '#ffffff',
  radius: 8,
};

export default makeScene2D(function* (view) {
  // 设置背景色
  view.fill(theme.bgDark);

  // 创建 Window 组件的引用
  const windowRef = createRef<Window>();

  // 创建 Window 组件
  view.add(
    <Window
      ref={windowRef}
      theme={{
        window: theme.window,
        buttons: theme.buttons,
      }}
      width={600}
      height={400}
      x={0}
      y={0}
      direction="column" // 内部布局方向：column（垂直）或 row（水平）
    >
      {/* Window 的子元素会自动放在 inner 布局中 */}
      <Layout
        direction="column"
        padding={30}
        gap={20}
        alignItems="center"
        justifyContent="center"
        size="100%"
      >
        <Txt
          text="Window 组件测试"
          fontSize={36}
          fill={theme.text}
          fontFamily="Microsoft YaHei, sans-serif"
          fontWeight={700}
        />
        <Rect
          width={200}
          height={100}
          fill={theme.bg}
          radius={theme.radius}
          layout
          alignItems="center"
          justifyContent="center"
        >
          <Txt
            text="内容区域"
            fontSize={24}
            fill={theme.text}
            fontFamily="Microsoft YaHei, sans-serif"
          />
        </Rect>
        <Txt
          text="这是一个窗口样式的组件"
          fontSize={20}
          fill={theme.text}
          fontFamily="Microsoft YaHei, sans-serif"
          opacity={0.8}
        />
      </Layout>
    </Window>,
  );

  // 等待开始
  yield* waitUntil('start');

  // 窗口淡入动画
  windowRef().opacity(0);
  windowRef().scale(0.8);
  yield* all(
    windowRef().opacity(1, 0.8, easeOutCubic),
    windowRef().scale(1, 0.8, easeOutCubic),
  );

  yield* waitFor(2);

  // 可以访问 inner 布局来操作内部内容
  const innerLayout = windowRef().inner;
  yield* innerLayout.opacity(0.5, 0.5).to(1, 0.5);

  yield* waitFor(1);

  // 创建多个窗口示例
  const window2Ref = createRef<Window>();
  const window3Ref = createRef<Window>();

  view.add(
    <Window
      ref={window2Ref}
      theme={{
        window: '#2196F3', // 蓝色窗口
        buttons: '#ffffff',
      }}
      width={400}
      height={300}
      x={-400}
      y={200}
      direction="row" // 水平布局
      opacity={0}
    >
      <Layout
        direction="row"
        padding={20}
        gap={15}
        alignItems="center"
        justifyContent="center"
        size="100%"
      >
        <Rect width={80} height={80} fill={theme.bg} radius={8} />
        <Rect width={80} height={80} fill={theme.bg} radius={8} />
        <Rect width={80} height={80} fill={theme.bg} radius={8} />
      </Layout>
    </Window>,
  );

  view.add(
    <Window
      ref={window3Ref}
      theme={{
        window: '#FF9800', // 橙色窗口
        buttons: '#000000',
      }}
      width={400}
      height={300}
      x={400}
      y={200}
      direction="column"
      opacity={0}
    >
      <Layout
        direction="column"
        padding={20}
        gap={15}
        alignItems="center"
        justifyContent="center"
        size="100%"
      >
        <Txt
          text="窗口 3"
          fontSize={28}
          fill={theme.text}
          fontFamily="Microsoft YaHei, sans-serif"
        />
        <Txt
          text="不同的主题颜色"
          fontSize={18}
          fill={theme.text}
          fontFamily="Microsoft YaHei, sans-serif"
          opacity={0.7}
        />
      </Layout>
    </Window>,
  );

  yield* waitFor(0.5);

  // 同时显示另外两个窗口
  window2Ref().scale(0.9);
  window3Ref().scale(0.9);
  yield* all(
    window2Ref().opacity(1, 0.6, easeOutCubic),
    window2Ref().scale(1, 0.6, easeOutCubic),
    window3Ref().opacity(1, 0.6, easeOutCubic),
    window3Ref().scale(1, 0.6, easeOutCubic),
  );

  yield* waitFor(2);

  yield* waitUntil('end');
});

