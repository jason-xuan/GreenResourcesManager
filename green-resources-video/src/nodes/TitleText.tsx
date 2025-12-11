import { 
	Txt,
	TxtProps,
} from '@motion-canvas/2d';
import { 
	ThreadGenerator, 
	all,
	easeOutCubic,
	SignalValue,
} from '@motion-canvas/core';
import VideoPostion from '../utils/VideoPostion';
import { Layout } from '@motion-canvas/2d';

export interface TitleTextProps extends Omit<TxtProps, 'text' | 'position' | 'opacity' | 'fontSize' | 'fill'> {
	text: SignalValue<string>;
	view: Layout;  // 视图引用，用于计算位置
	fontSize?: SignalValue<number>;
	color?: SignalValue<string>;
}

/**
 * 标题文本组件 - 自带 showOnCenter、showOnTop、moveToTop 方法
 * 用于显示标题文本，并带有动画效果
 * 使用方式：<TitleText text="标题文本" view={view} fontSize={56} />
 */
export class TitleText extends Txt {
	// view 不是 signal，直接存储
	private readonly viewRef: Layout;

	public constructor(props?: TitleTextProps) {
		if (!props || !props.view) {
			throw new Error('TitleText requires a view prop');
		}

		const {
			text,
			view,
			fontSize = 56,
			color = '#000000',
			zIndex = 50,
			...restProps
		} = props;

		// 必须先调用 super() 才能访问 this
		super({
			text,
			fontSize,
			fill: color,
			fontFamily: 'Microsoft YaHei, sans-serif',
			textAlign: 'center',
			opacity: 0,
			position: () => VideoPostion.bottomCenter(view),
			zIndex,
			...restProps,
		});

		// super() 调用后才能设置 this.viewRef
		this.viewRef = view;
	}

	/**
	 * 在中心显示标题（淡入）
	 * @param options 配置选项
	 * @param options.duration 动画时长（秒），默认 0.6
	 * @param options.easing 缓动函数，默认 easeOutCubic
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *showOnCenter(options: {
		duration?: number;
		easing?: (t: number) => number;
	} = {}): ThreadGenerator {
		const {
			duration = 0.6,
			easing = easeOutCubic,
		} = options;

		const centerPos = VideoPostion.center(this.viewRef);

		yield* all(
			this.position(centerPos, duration, easing),
			this.opacity(1, duration, easing)
		);
	}

	/**
	 * 在顶部显示标题（淡入并移动到顶部）
	 * @param options 配置选项
	 * @param options.duration 动画时长（秒），默认 0.6
	 * @param options.easing 缓动函数，默认 easeOutCubic
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *showOnTop(options: {
		duration?: number;
		easing?: (t: number) => number;
	} = {}): ThreadGenerator {
		const {
			duration = 0.6,
			easing = easeOutCubic,
		} = options;

		const topPos = VideoPostion.topCenter(this.viewRef);

		yield* all(
			this.position(topPos, duration, easing),
			this.opacity(1, duration, easing)
		);
	}

	/**
	 * 移动到顶部（如果已经显示，则移动到顶部；如果未显示，则先显示再移动）
	 * @param options 配置选项
	 * @param options.duration 动画时长（秒），默认 0.6
	 * @param options.easing 缓动函数，默认 easeOutCubic
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *moveToTopPosition(options: {
		duration?: number;
		easing?: (t: number) => number;
	} = {}): ThreadGenerator {
		const {
			duration = 0.6,
			easing = easeOutCubic,
		} = options;

		const topPos = VideoPostion.topCenter(this.viewRef);

		// 如果当前不可见，先显示
		if (this.opacity() < 0.1) {
			yield* all(
				this.position(topPos, duration, easing),
				this.opacity(1, duration, easing)
			);
		} else {
			// 如果已经可见，只移动位置
			yield* this.position(topPos, duration, easing);
		}
		yield;
	}
}

