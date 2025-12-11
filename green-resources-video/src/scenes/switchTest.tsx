/**
 * Switch 组件测试场景
 * 
 * 演示如何使用自定义的 Switch 类组件
 */

import {makeScene2D, Txt, Layout} from '@motion-canvas/2d';
import {
  createRef,
  all,
  easeOutCubic,
  waitFor,
  waitUntil,
} from '@motion-canvas/core';
import {Switch} from '../nodes/Switch';

// 主题颜色配置
const theme = {
  bg: '#1a1a1a',
  bgDark: '#0d0d0d',
  text: '#ffffff',
};

export default makeScene2D(function* (view) {
  // 设置背景色
  view.fill(theme.bgDark);

  // 创建 Switch 组件的引用
  const switchRef1 = createRef<Switch>();
  const switchRef2 = createRef<Switch>();
  const switchRef3 = createRef<Switch>();

  // 创建标题
  const titleRef = createRef<Txt>();
  view.add(
    <Txt
      ref={titleRef}
      text="Switch 组件测试"
      fontSize={48}
      fill={theme.text}
      fontFamily="Microsoft YaHei, sans-serif"
      fontWeight={600}
      y={-400}
      opacity={0}
    />,
  );

  // 创建说明文本
  const descRef = createRef<Txt>();
  view.add(
    <Txt
      ref={descRef}
      text="点击时间轴上的标记点来测试不同的功能"
      fontSize={24}
      fill={theme.text}
      fontFamily="Microsoft YaHei, sans-serif"
      opacity={0.7}
      y={-350}
      opacity={0}
    />,
  );

  // 创建第一个 Switch（默认样式，初始关闭）
  view.add(
    <Switch
      ref={switchRef1}
      x={-300}
      y={0}
      opacity={0}
    />,
  );

  // 创建第二个 Switch（自定义颜色，初始打开）
  view.add(
    <Switch
      ref={switchRef2}
      x={0}
      y={0}
      initialState={true}
      accent="#FF6B6B"
      opacity={0}
    />,
  );

  // 创建第三个 Switch（绿色主题）
  view.add(
    <Switch
      ref={switchRef3}
      x={300}
      y={0}
      accent="#51CF66"
      opacity={0}
    />,
  );

  // 创建标签文本
  const label1Ref = createRef<Txt>();
  const label2Ref = createRef<Txt>();
  const label3Ref = createRef<Txt>();

  view.add(
    <Txt
      ref={label1Ref}
      text="默认样式"
      fontSize={20}
      fill={theme.text}
      fontFamily="Microsoft YaHei, sans-serif"
      x={-300}
      y={120}
      opacity={0}
    />,
  );

  view.add(
    <Txt
      ref={label2Ref}
      text="红色主题（初始打开）"
      fontSize={20}
      fill={theme.text}
      fontFamily="Microsoft YaHei, sans-serif"
      x={0}
      y={120}
      opacity={0}
    />,
  );

  view.add(
    <Txt
      ref={label3Ref}
      text="绿色主题"
      fontSize={20}
      fill={theme.text}
      fontFamily="Microsoft YaHei, sans-serif"
      x={300}
      y={120}
      opacity={0}
    />,
  );

  // 等待开始标记
  yield* waitUntil('start');

  // 淡入标题和说明
  yield* all(
    titleRef().opacity(1, 0.5, easeOutCubic),
    descRef().opacity(1, 0.5, easeOutCubic),
  );

  // 等待一下
  yield* waitFor(0.3);

  // 淡入所有 Switch 和标签
  yield* all(
    switchRef1().opacity(1, 0.8, easeOutCubic),
    switchRef2().opacity(1, 0.8, easeOutCubic),
    switchRef3().opacity(1, 0.8, easeOutCubic),
    label1Ref().opacity(1, 0.8, easeOutCubic),
    label2Ref().opacity(1, 0.8, easeOutCubic),
    label3Ref().opacity(1, 0.8, easeOutCubic),
  );

  // 等待切换标记
  yield* waitUntil('toggle1');

  // 切换第一个 Switch
  yield* switchRef1().toggle(0.5);

  yield* waitUntil('toggle2');

  // 切换第二个 Switch
  yield* switchRef2().toggle(0.5);

  yield* waitUntil('toggle3');

  // 切换第三个 Switch
  yield* switchRef3().toggle(0.5);

  yield* waitUntil('toggleAll');

  // 同时切换所有 Switch
  yield* all(
    switchRef1().toggle(0.5),
    switchRef2().toggle(0.5),
    switchRef3().toggle(0.5),
  );

  yield* waitUntil('toggleFast');

  // 快速切换（演示不同速度）
  yield* all(
    switchRef1().toggle(0.2),
    switchRef2().toggle(0.4),
    switchRef3().toggle(0.6),
  );

  yield* waitUntil('setState');

  // 演示 setState 方法（无动画）
  switchRef1().setState(true);
  switchRef2().setState(false);
  switchRef3().setState(true);

  yield* waitFor(0.5);

  // 再次切换
  yield* all(
    switchRef1().toggle(0.5),
    switchRef2().toggle(0.5),
    switchRef3().toggle(0.5),
  );
});

