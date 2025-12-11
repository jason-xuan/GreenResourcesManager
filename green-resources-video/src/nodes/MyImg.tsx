import { 
	Img,
	ImgProps,
	initial,
	signal,
} from '@motion-canvas/2d';
import { 
	ThreadGenerator, 
	all,
	easeOutCubic,
	SignalValue,
	SimpleSignal,
} from '@motion-canvas/core';

export interface MyImgProps extends Omit<ImgProps, 'src' | 'scale' | 'opacity'> {
	src: SignalValue<string>;
	scale?: SignalValue<number>;
	initialPosition?: SignalValue<[number, number] | (() => [number, number])>;
	initialOpacity?: SignalValue<number>;
}

/**
 * 自定义图片组件 - 自带 show 和 hide 方法，简化图片显示和隐藏逻辑
 * 使用方式：<MyImg src="/imgs/完.png" scale={1.5} />
 */
export class MyImg extends Img {
	public constructor(props?: MyImgProps) {
		const {
			initialPosition,
			initialOpacity = 0,
			...restProps
		} = props || {};

		// 确保 position 是函数形式
		let positionFn: (() => [number, number]) | undefined;
		if (initialPosition) {
			if (typeof initialPosition === 'function') {
				positionFn = initialPosition as () => [number, number];
			} else {
				positionFn = () => initialPosition;
			}
		}

		super({
			opacity: initialOpacity,
			position: positionFn,
			zIndex: 50, // 默认 zIndex
			...restProps,
		});
	}

	/**
	 * 显示图片（淡入并移动到指定位置）
	 * @param options 配置选项
	 * @param options.position 目标位置，默认当前位置
	 * @param options.duration 动画时长（秒），默认 1
	 * @param options.easing 缓动函数，默认 easeOutCubic
	 * @param options.zIndex 可选的 zIndex 设置
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *show(options: {
		position?: [number, number] | (() => [number, number]);
		duration?: number;
		easing?: (t: number) => number;
		zIndex?: number;
	} = {}): ThreadGenerator {
		const {
			position,
			duration = 1,
			easing = easeOutCubic,
			zIndex,
		} = options;

		const animations: ThreadGenerator[] = [];

		// 如果指定了 zIndex，先设置
		if (zIndex !== undefined) {
			this.zIndex(zIndex);
		}

		// 如果指定了位置，移动到该位置
		if (position !== undefined) {
			const targetPosition = typeof position === 'function' ? position() : position;
			animations.push(this.position(targetPosition, duration, easing));
		}

		// 淡入
		animations.push(this.opacity(1, duration, easing));

		// 同时执行所有动画
		yield* all(...animations);
	}

	/**
	 * 隐藏并删除图片（淡出后从场景中移除）
	 * @param options 配置选项
	 * @param options.duration 动画时长（秒），默认 0.5
	 * @param options.easing 缓动函数，默认 easeOutCubic
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *hide(options: {
		duration?: number;
		easing?: (t: number) => number;
	} = {}): ThreadGenerator {
		const {
			duration = 0.5,
			easing = easeOutCubic,
		} = options;

		// 先淡出
		yield* this.opacity(0, duration, easing);
		
		// 然后从场景中移除
		this.remove();
	}

	/**
	 * 移动到指定位置
	 * @param position 目标位置
	 * @param duration 动画时长（秒），默认 1
	 * @param easing 缓动函数，默认 easeOutCubic
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *moveToPosition(
		position: [number, number] | (() => [number, number]),
		duration: number = 1,
		easing: (t: number) => number = easeOutCubic
	): ThreadGenerator {
		const targetPosition = typeof position === 'function' ? position() : position;
		yield* this.position(targetPosition, duration, easing);
	}

}

