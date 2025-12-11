import {
	Layout,
	LayoutProps,
	Rect,
	Txt,
	initial,
	signal,
} from '@motion-canvas/2d';
import {
	createRef,
	ThreadGenerator,
	SignalValue,
	SimpleSignal,
	waitFor,
	all,
} from '@motion-canvas/core';
import VideoPostion from '../utils/VideoPostion';

/**
 * 标题项的数据结构
 */
interface TitleItem {
	title: string;
	content?: string;
	layoutRef: ReturnType<typeof createRef<Layout>>;
	titleRef: ReturnType<typeof createRef<Txt>>;
	contentRef?: ReturnType<typeof createRef<Txt>>;
}

export interface PersistentKeywordsProps extends LayoutProps {
	/** 标题字体大小（像素），默认 48 */
	titleFontSize?: SignalValue<number>;
	/** 标题文字颜色（十六进制或颜色名），默认 '#ffffff'（白色） */
	titleColor?: SignalValue<string>;
	/** 内容字体大小（像素），默认 32 */
	contentFontSize?: SignalValue<number>;
	/** 内容文字颜色（十六进制或颜色名），默认 '#ffffff'（白色） */
	contentColor?: SignalValue<string>;
	/** 背景矩形颜色（十六进制或颜色名），默认 '#000000'（黑色） */
	backgroundColor?: SignalValue<string>;
	/** 背景矩形透明度（0-1），默认 0.7 */
	backgroundOpacity?: SignalValue<number>;
	/** 背景矩形圆角半径（像素），默认 8 */
	borderRadius?: SignalValue<number>;
	/** 每个标题块内部的内边距（像素），默认 20 */
	keywordPadding?: SignalValue<number>;
	/** 两个标题块之间的间距（像素），默认 20。这是控制多个 title 块之间间距的属性 */
	keywordGap?: SignalValue<number>;
	/** 标题和内容之间的间距（像素），默认 12 */
	titleGap?: SignalValue<number>;
	/** 打字机效果的速度（字符/秒），默认 15 */
	charsPerSecond?: SignalValue<number>;
	/** 标题排列方向：'column'（竖向，默认）或 'row'（横向） */
	direction?: SignalValue<'column' | 'row'>;
}

/**
 * 持久关键词组件 - 可以动态添加标题和内容
 * 使用方式：
 * const keywordsRef = createRef<PersistentKeywords>();
 * view.add(<PersistentKeywords ref={keywordsRef} direction="column" />);
 * yield* keywordsRef().addTitle('标题1');
 * yield* keywordsRef().addContent('标题1', '内容文本');
 * 
 * direction 属性：
 * - 'column'（默认）：标题竖向排列
 * - 'row'：标题横向排列
 */
export class PersistentKeywords extends Layout {
	/** 标题字体大小（像素），默认 48 */
	@initial(48)
	@signal()
	public declare readonly titleFontSize: SimpleSignal<number, this>;

	/** 标题文字颜色（十六进制或颜色名），默认 '#ffffff'（白色） */
	@initial('#ffffff')
	@signal()
	public declare readonly titleColor: SimpleSignal<string, this>;

	/** 内容字体大小（像素），默认 32 */
	@initial(32)
	@signal()
	public declare readonly contentFontSize: SimpleSignal<number, this>;

	/** 内容文字颜色（十六进制或颜色名），默认 '#ffffff'（白色） */
	@initial('#ffffff')
	@signal()
	public declare readonly contentColor: SimpleSignal<string, this>;

	/** 背景矩形颜色（十六进制或颜色名），默认 '#000000'（黑色） */
	@initial('#000000')
	@signal()
	public declare readonly backgroundColor: SimpleSignal<string, this>;

	/** 背景矩形透明度（0-1），默认 0.7 */
	@initial(0.7)
	@signal()
	public declare readonly backgroundOpacity: SimpleSignal<number, this>;

	/** 背景矩形圆角半径（像素），默认 8 */
	@initial(8)
	@signal()
	public declare readonly borderRadius: SimpleSignal<number, this>;

	/** 每个标题块内部的内边距（像素），默认 20 */
	@initial(20)
	@signal()
	public declare readonly keywordPadding: SimpleSignal<number, this>;

	/** 两个标题块之间的间距（像素），默认 20。这是控制多个 title 块之间间距的属性 */
	@initial(20)
	@signal()
	public declare readonly keywordGap: SimpleSignal<number, this>;

	/** 标题和内容之间的间距（像素），默认 12 */
	@initial(12)
	@signal()
	public declare readonly titleGap: SimpleSignal<number, this>;

	/** 打字机效果的速度（字符/秒），默认 15 */
	@initial(15)
	@signal()
	public declare readonly charsPerSecond: SimpleSignal<number, this>;

	/** 标题排列方向：'column'（竖向，默认）或 'row'（横向） */
	@initial('column')
	@signal()
	public declare readonly direction: SimpleSignal<'column' | 'row', this>;

	// 存储所有标题项
	private readonly titles = new Map<string, TitleItem>();

	public constructor(props?: PersistentKeywordsProps) {
		const keywordGap = props?.keywordGap ?? 20;
		super({
			layout: true,
			direction: props?.direction ?? 'column',
			alignItems: 'center',
			justifyContent: 'center',
			opacity: 1,
			zIndex: 200,
			gap: keywordGap, // 使用 keywordGap 来控制两个标题块之间的间距
			...props,
		});
	}

	/**
	 * 添加一个标题（如果已存在则更新）
	 * @param title 标题文本
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *addTitle(title: string): ThreadGenerator {
		const existingItem = this.titles.get(title);

		if (existingItem) {
			// 如果标题已存在，淡入显示（如果之前是隐藏的）
			if (existingItem.layoutRef().opacity() < 1) {
				yield* existingItem.layoutRef().opacity(1, 0.5);
			}
		} else {
			// 创建新的标题项
			const keywordLayoutRef = createRef<Layout>();
			const titleRef = createRef<Txt>();
			const contentRef = createRef<Txt>();

			const titleFontSize = this.titleFontSize();
			const titleColor = this.titleColor();
			const contentFontSize = this.contentFontSize();
			const contentColor = this.contentColor();
			const backgroundColor = this.backgroundColor();
			const backgroundOpacity = this.backgroundOpacity();
			const borderRadius = this.borderRadius();
			const keywordPadding = this.keywordPadding();
			const titleGap = this.titleGap();

			const keywordContainer = (
				<Layout
					ref={keywordLayoutRef}
					layout
					direction="column"
					alignItems="center"
					justifyContent="center"
					opacity={0}
					gap={titleGap}
				>
					<Rect
						fill={backgroundColor}
						opacity={backgroundOpacity}
						radius={borderRadius}
						padding={keywordPadding}
						layout
						direction="column"
						gap={titleGap}
					>
						{/* 标题 - 大字体 */}
						<Txt
							ref={titleRef}
							text={title}
							fontSize={titleFontSize}
							fill={titleColor}
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={700}
						/>
						{/* 内容占位（初始为空，后续可以通过 addContent 添加） */}
						<Txt
							ref={contentRef}
							text=""
							fontSize={contentFontSize}
							fill={contentColor}
							fontFamily="Microsoft YaHei, sans-serif"
							textAlign="center"
							fontWeight={400}
							opacity={0.9}
						/>
					</Rect>
				</Layout>
			);

			this.add(keywordContainer);

			// 保存引用
			this.titles.set(title, {
				title,
				layoutRef: keywordLayoutRef,
				titleRef: titleRef,
				contentRef: contentRef,
			});

			// 淡入动画
			yield* keywordLayoutRef().opacity(1, 0.5);
		}
	}

	/**
	 * 给指定标题添加内容（如果标题不存在，会先创建标题）
	 * @param title 标题文本
	 * @param content 内容文本
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *addContent(title: string, content: string): ThreadGenerator {
		// 如果标题不存在，先创建标题
		if (!this.titles.has(title)) {
			yield* this.addTitle(title);
		}

		const item = this.titles.get(title);
		if (!item || !item.contentRef) {
			return;
		}

		// 使用打字机效果显示内容
		yield* this.typewriterEffect(item.contentRef, content);

		// 更新存储的内容
		item.content = content;
	}

	/**
	 * 打字机效果：逐字显示文本
	 * @param textRef 文本引用
	 * @param text 要显示的文本
	 */
	private *typewriterEffect(
		textRef: ReturnType<typeof createRef<Txt>>,
		text: string
	): ThreadGenerator {
		const charsPerSecond = this.charsPerSecond();
		const delay = 1 / charsPerSecond; // 每个字符之间的延迟

		for (let i = 0; i <= text.length; i++) {
			textRef().text(text.substring(0, i));
			if (i < text.length) {
				yield* waitFor(delay);
			}
		}
	}

	/**
	 * 清除所有标题（淡出并删除）
	 * @param duration 淡出持续时间（秒），默认 0.5
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *clear(duration: number = 0.5): ThreadGenerator {
		const animations: ThreadGenerator[] = [];

		// 淡出所有标题
		for (const item of this.titles.values()) {
			animations.push(item.layoutRef().opacity(0, duration));
		}

		if (animations.length > 0) {
			yield* all(...animations);
		}

		// 等待动画完成后删除所有标题
		yield* waitFor(0.1);

		// 删除所有标题项
		for (const item of this.titles.values()) {
			item.layoutRef().remove();
		}

		this.titles.clear();
	}

	/**
	 * 移除指定标题
	 * @param title 要移除的标题
	 * @param duration 淡出持续时间（秒），默认 0.5
	 * @returns ThreadGenerator 可以 yield* 来等待动画完成
	 */
	public *removeTitle(title: string, duration: number = 0.5): ThreadGenerator {
		const item = this.titles.get(title);
		if (!item) {
			return;
		}

		// 淡出
		yield* item.layoutRef().opacity(0, duration);

		// 等待动画完成后删除
		yield* waitFor(0.1);
		item.layoutRef().remove();
		this.titles.delete(title);
	}
}

