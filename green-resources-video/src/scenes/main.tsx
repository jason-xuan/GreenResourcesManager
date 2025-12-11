import {makeScene2D, Layout} from '@motion-canvas/2d';
import {createMouseRef, Mouse} from '../nodes/Mouse';
import {Subtitle} from '../utils/subtitle';
import {createMainSubtitles, getProgressSegments} from '../data/mainSubtitles';
import {ProgressBar} from '../nodes/ProgressBar';
import {all, createRef} from '@motion-canvas/core';

export default makeScene2D(function* (view) {
  // 创建鼠标引用
  // const mouse = createMouseRef();
  // view.add(<Mouse refs={mouse} fill={'#000000'} x={200} y={-160} />);

  // 创建字幕数组（从数据文件导入，callback 在数据文件中定义）
  const subtitles = createMainSubtitles(view);

  // 获取进度条分段配置
  const progressSegments = getProgressSegments(subtitles.length);

  // 创建字幕组件
  const subtitleRef = createRef<Subtitle>();
  view.add(
    <Subtitle
      ref={subtitleRef}
      texts={subtitles}
    />
  );

  // 创建进度条组件
  const progressBarRef = createRef<ProgressBar>();
  view.add(
    <ProgressBar
      ref={progressBarRef}
      segments={progressSegments}
      totalItems={subtitles.length}
      position={() => [0, view.height() / 2 - 16]}
    />
  );

  // 计算整个动画的总时长（用于进度条动画）
  let totalDuration = 0;
  for (const item of subtitles) {
    const text = typeof item === 'string' ? item : item.text;
    const duration = Math.max(2, text.length * 0.1); // minDisplayDuration = 2, charsPerSecond = 0.1
    totalDuration += 0.5 + duration + 0.5; // fadeInDuration + duration + fadeOutDuration
  }

  // 并行执行字幕显示和进度条动画
  yield* all(
    // 字幕显示
    subtitleRef().show(),
    // 进度条动画
    progressBarRef().animateProgress(totalDuration)
  );
});
