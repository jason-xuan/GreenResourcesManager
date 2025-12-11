import { Layout, Img, Txt } from '@motion-canvas/2d';
import { createRef, ThreadGenerator, waitFor } from '@motion-canvas/core';
import VideoPostion from './VideoPostion';

/**
 * 创建图片并添加到场景中
 * @param view 场景视图引用
 * @param src 图片路径
 * @param options 可选配置项
 * @param options.scale 缩放比例，默认 0.5
 * @param options.initialPosition 初始位置，默认屏幕下方中心
 * @param options.initialOpacity 初始透明度，默认 0（完全透明）
 * @returns 创建的图片引用
 */
export function createImage(
	view: Layout,
	src: string,
	options: {
		scale?: number;
		initialPosition?: [number, number] | (() => [number, number]);
	} = {}
): ReturnType<typeof createRef<Img>> {
	const imgRef = createRef<Img>();
	
	const {
		scale = 0.5,
		initialPosition = () => VideoPostion.bottomCenter(view),
	} = options;

	// 确保 position 是函数形式
	const positionFn = typeof initialPosition === 'function'
		? initialPosition
		: () => initialPosition;

	const img = (
		<Img
			ref={imgRef}
			src={src}
			scale={scale}
			position={positionFn}
			opacity={0}
			zIndex={50}
		/>
	);

	view.add(img);
	
	return imgRef;
}



/**
 * 创建多个文本并添加到场景中，以给定位置为中心排列（水平或垂直）
 * @param view 场景视图引用
 * @param texts 文本数组
 * @param options 配置选项
 * @param options.centerPosition 中心位置（函数或数组），默认为屏幕中心
 * @param options.fontSize 字体大小，默认 36
 * @param options.color 文本颜色，默认 '#ffffff'
 * @param options.spacing 文本之间的间距（像素），默认使用字体大小的 1.5 倍
 * @param options.direction 排列方向，'row' 为水平排列，'column' 为垂直排列，默认 'row'
 * @returns 包含文本引用数组的对象
 */
export function createTexts(
	view: Layout,
	texts: string[],
	options: {
		centerPosition?: [number, number] | (() => [number, number]);
		fontSize?: number;
		color?: string;
		spacing?: number;
		direction?: 'row' | 'column';
	} = {}
): {
	textRefs: ReturnType<typeof createRef<Txt>>[];
} {
	const {
		centerPosition = () => [0, 0],
		fontSize = 36,
		color = '#ffffff',
		spacing,
		direction = 'row',
	} = options;

	const defaultSpacing = spacing ?? fontSize * 1.5;

	// 创建文本引用数组
	const textRefs = texts.map(() => createRef<Txt>());

	// 确保 position 是函数形式
	const centerPositionFn = typeof centerPosition === 'function'
		? centerPosition
		: () => centerPosition;

	// 估算每个文本的宽度和高度
	const estimatedCharWidth = fontSize * 0.6; // 估算每个字符的宽度
	const estimatedLineHeight = fontSize * 1.2; // 估算每行的高度（包括行间距）

	// 计算每个文本的位置
	const textPositions: [number, number][] = [];
	
	if (direction === 'row') {
		// 水平排列：计算 X 位置，Y 保持中心
		let cumulativeX = 0;
		
		texts.forEach((text, idx) => {
			if (idx === 0) {
				// 第一个文本：计算所有文本的总宽度，然后从负的一半开始
				const totalWidth = texts.reduce((sum, t, i) => {
					const textWidth = t.length * estimatedCharWidth;
					const spacing = i < texts.length - 1 ? defaultSpacing : 0;
					return sum + textWidth + spacing;
				}, 0);
				cumulativeX = -totalWidth / 2;
			}
			
			// 当前文本的中心位置
			const textWidth = text.length * estimatedCharWidth;
			const textCenterX = cumulativeX + textWidth / 2;
			textPositions.push([textCenterX, 0]);
			
			// 更新累计位置（文本宽度 + 间距）
			cumulativeX += textWidth + defaultSpacing;
		});
	} else {
		// 垂直排列：计算 Y 位置，X 保持中心
		let cumulativeY = 0;
		
		texts.forEach((text, idx) => {
			if (idx === 0) {
				// 第一个文本：计算所有文本的总高度，然后从负的一半开始
				const totalHeight = texts.reduce((sum, t, i) => {
					const textHeight = estimatedLineHeight;
					const spacing = i < texts.length - 1 ? defaultSpacing : 0;
					return sum + textHeight + spacing;
				}, 0);
				cumulativeY = -totalHeight / 2;
			}
			
			// 当前文本的中心位置
			const textHeight = estimatedLineHeight;
			const textCenterY = cumulativeY + textHeight / 2;
			textPositions.push([0, textCenterY]);
			
			// 更新累计位置（文本高度 + 间距）
			cumulativeY += textHeight + defaultSpacing;
		});
	}

	// 创建文本组件并直接添加到场景
	texts.forEach((text, idx) => {
		const textNode = (
			<Txt
				key={`Text-${idx}-${text.substring(0, 10)}`}
				ref={textRefs[idx]}
				text={text}
				fontSize={fontSize}
				fill={color}
				opacity={0}
				textAlign="center"
				position={() => {
					const center = centerPositionFn();
					const offset = textPositions[idx];
					return [center[0] + offset[0], center[1] + offset[1]];
				}}
			/>
		);

		view.add(textNode);
	});

	return {
		textRefs
	};
}

/**
 * 创建圆形排列的图片
 * @param view 场景视图引用
 * @param imageSources 图片路径数组或图片路径模板（支持 ${index} 占位符）
 * @param options 配置选项
 * @param options.count 图片数量，默认使用 imageSources 数组长度
 * @param options.scale 缩放比例，默认 0.3
 * @param options.radius 圆形半径（像素），默认使用屏幕较小边的25%
 * @param options.center 中心位置，默认 [0, 0]（屏幕中心）
 * @returns 包含图片引用数组和圆形位置数组的对象
 */
export function createCircleImages(
	view: Layout,
	imageSources: string[] | string,
	options: {
		count?: number;
		scale?: number;
		radius?: number;
		center?: [number, number];
	} = {}
): {
	imageRefs: ReturnType<typeof createRef<Img>>[];
	positions: [number, number][];
} {
	const {
		count,
		scale = 0.3,
		radius,
		center = [0, 0],
	} = options;

	// 确定图片数量
	let imageCount: number;
	let imagePaths: string[];

	if (Array.isArray(imageSources)) {
		imageCount = count ?? imageSources.length;
		imagePaths = imageSources;
	} else {
		// 如果是字符串模板，使用 count 参数
		imageCount = count ?? 1;
		imagePaths = [];
		// 检测模板中是否有 ${index} 占位符
		const hasPlaceholder = imageSources.includes('${index}');
		
		if (hasPlaceholder) {
			// 如果有占位符，需要确定有多少张不同的图片
			// 假设图片编号从1开始，尝试找到最大编号（这里假设最多5张）
			// 或者让用户指定，这里先假设循环使用1-5
			for (let i = 0; i < imageCount; i++) {
				const imageIndex = (i % 5) + 1; // 循环使用1-5的图片
				imagePaths.push(imageSources.replace(/\$\{index\}/g, String(imageIndex)));
			}
		} else {
			// 如果没有占位符，所有图片使用同一个路径
			for (let i = 0; i < imageCount; i++) {
				imagePaths.push(imageSources);
			}
		}
	}

	// 计算圆形半径
	const calculatedRadius = radius ?? Math.min(view.width(), view.height()) * 0.25;

	// 计算圆形排列的位置
	const positions: [number, number][] = [];
	for (let i = 0; i < imageCount; i++) {
		// 计算每个图片的角度（360度均匀分布）
		const angle = (i / imageCount) * Math.PI * 2; // 转换为弧度
		// 使用三角函数计算圆形坐标
		const x = center[0] + calculatedRadius * Math.cos(angle);
		const y = center[1] + calculatedRadius * Math.sin(angle);
		positions.push([x, y]);
	}

	// 创建图片引用
	const imageRefs: ReturnType<typeof createRef<Img>>[] = [];
	for (let i = 0; i < imageCount; i++) {
		const imageIndex = i % imagePaths.length; // 循环使用图片
		const imgRef = createImage(view, imagePaths[imageIndex], {
			scale,
			initialPosition: () => VideoPostion.bottomCenter(view),
		});
		imageRefs.push(imgRef);
	}

	return {
		imageRefs,
		positions,
	};
}
