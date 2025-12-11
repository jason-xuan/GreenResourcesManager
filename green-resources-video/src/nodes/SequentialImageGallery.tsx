import { 
	Layout, 
	LayoutProps, 
	Img,
	initial,
	signal,
} from '@motion-canvas/2d';
import { 
	createRef,
	ThreadGenerator, 
	all,
	easeOutCubic,
	SignalValue,
	SimpleSignal,
} from '@motion-canvas/core';
import VideoPostion from '../utils/VideoPostion';

export interface SequentialImageGalleryProps extends LayoutProps {
	imagePaths: SignalValue<string[]>;  // 4个图片路径数组
	view: Layout;  // 视图引用，用于计算位置
	initialScale?: SignalValue<number>;  // 初始缩放，默认 0.5
	finalScale?: SignalValue<number>;  // 缩小后的缩放，默认 0.3
	topOffset?: SignalValue<number>;  // 顶部偏移，默认 170
	duration?: SignalValue<number>;  // 动画时长，默认 1
}

/**
 * 顺序图片展示组件 - 管理多个图片的顺序展示
 * 使用方式：<SequentialImageGallery imagePaths={['/imgs/1.png', '/imgs/2.png', ...]} view={view} />
 */
export class SequentialImageGallery extends Layout {
	@signal()
	public declare readonly imagePaths: SimpleSignal<string[], this>;

	// view 不是 signal，直接存储
	private readonly viewRef: Layout;

	@initial(0.5)
	@signal()
	public declare readonly initialScale: SimpleSignal<number, this>;

	@initial(0.3)
	@signal()
	public declare readonly finalScale: SimpleSignal<number, this>;

	@initial(170)
	@signal()
	public declare readonly topOffset: SimpleSignal<number, this>;

	@initial(1)
	@signal()
	public declare readonly duration: SimpleSignal<number, this>;

	// 图片引用数组
	private readonly imageRefs: ReturnType<typeof createRef<Img>>[] = [];
	
	// 当前显示的图片索引（0-3）
	private currentIndex = -1;

	public constructor(props?: SequentialImageGalleryProps) {
		if (!props || !props.view) {
			throw new Error('SequentialImageGallery requires a view prop');
		}

		super({
			layout: false,
			...props,
		});

		this.viewRef = props.view;

		const imagePaths = this.imagePaths();
		const initialScale = this.initialScale();
		const initialPosition = () => VideoPostion.bottomCenter(this.viewRef);

		// 创建所有图片（初始隐藏）
		for (let i = 0; i < imagePaths.length; i++) {
			const imgRef = createRef<Img>();
			this.imageRefs.push(imgRef);

			this.add(
				<Img
					key={`SequentialImage-${i}`}
					ref={imgRef}
					src={imagePaths[i]}
					scale={initialScale}
					position={initialPosition}
					opacity={0}
					zIndex={50}
				/>
			);
		}
	}

	/**
	 * 显示下一个图片
	 * 第一次调用显示第一个，第二次显示第二个，以此类推
	 * 每次显示新图片时，会将之前的图片缩小并移动到左上角对应位置
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *showNext(): ThreadGenerator {
		const imagePaths = this.imagePaths();
		const view = this.viewRef;
		const initialScale = this.initialScale();
		const finalScale = this.finalScale();
		const topOffset = this.topOffset();
		const duration = this.duration();

		// 如果已经显示完所有图片，直接返回
		if (this.currentIndex >= imagePaths.length - 1) {
			return;
		}

		// 移动到下一个索引
		this.currentIndex++;

		const animations: ThreadGenerator[] = [];

		// 如果有上一个图片，需要缩小并移动到左上角
		if (this.currentIndex > 0) {
			const prevIndex = this.currentIndex - 1;
			const prevImgRef = this.imageRefs[prevIndex];
			
			// 计算左上角位置（横向排列）
			const x = VideoPostion.getWidthByPercent(view, prevIndex + 1, imagePaths.length);
			const topLeftPos = VideoPostion.topLeft(view, x, topOffset);

			animations.push(
				prevImgRef().position(topLeftPos, duration, easeOutCubic),
				prevImgRef().scale(finalScale, duration, easeOutCubic)
			);
		}

		// 显示当前图片（移动到中心并淡入）
		const currentImgRef = this.imageRefs[this.currentIndex];
		const centerPos = VideoPostion.center(view);

		animations.push(
			currentImgRef().position(centerPos, duration, easeOutCubic),
			currentImgRef().opacity(1, duration, easeOutCubic),
			currentImgRef().scale(initialScale, duration, easeOutCubic)
		);

		// 同时执行所有动画
		yield* all(...animations);
	}

	/**
	 * 完成展示：将最后一个图片也缩小并移动到左上角
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *finalize(): ThreadGenerator {
		const imagePaths = this.imagePaths();
		const view = this.viewRef;
		const finalScale = this.finalScale();
		const topOffset = this.topOffset();
		const duration = this.duration();

		// 如果还没有显示最后一个图片，先显示它
		if (this.currentIndex < imagePaths.length - 1) {
			yield* this.showNext();
		}

		// 将最后一个图片缩小并移动到左上角
		const lastIndex = imagePaths.length - 1;
		const lastImgRef = this.imageRefs[lastIndex];
		const x = VideoPostion.getWidthByPercent(view, lastIndex + 1, imagePaths.length);
		const topLeftPos = VideoPostion.topLeft(view, x, topOffset);

		yield* all(
			lastImgRef().position(topLeftPos, duration, easeOutCubic),
			lastImgRef().scale(finalScale, duration, easeOutCubic)
		);
	}

	/**
	 * 将所有图片向上移动并淡出（用于最终清理）
	 * @param yOffset Y轴向上偏移量，默认 400
	 * @param duration 动画时长，默认 1
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *hideAll(yOffset: number = 400, duration: number = 1): ThreadGenerator {
		const animations: ThreadGenerator[] = [];

		for (let i = 0; i <= this.currentIndex; i++) {
			const imgRef = this.imageRefs[i];
			const currentPos = imgRef().position();
			
			animations.push(
				imgRef().y(currentPos.y - yOffset, duration, easeOutCubic),
				imgRef().opacity(0, duration, easeOutCubic)
			);
		}

		yield* all(...animations);
	}

	/**
	 * 获取指定索引的图片引用（用于高级操作）
	 */
	public getImageRef(index: number): ReturnType<typeof createRef<Img>> | undefined {
		return this.imageRefs[index];
	}
}

