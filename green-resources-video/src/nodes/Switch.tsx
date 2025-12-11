/**
 * Switch 开关组件
 * 
 * 这是一个基于 Motion Canvas 官方文档实现的自定义组件示例
 * 展示了如何创建类式组件（Class-based Component）
 * 
 * 参考文档：https://motioncanvas.io/docs/custom-components
 */

import {
  Circle,
  Node,
  NodeProps,
  Rect,
  colorSignal,
  initial,
  signal,
} from '@motion-canvas/2d';
import {
  Color,
  ColorSignal,
  PossibleColor,
  SignalValue,
  SimpleSignal,
  all,
  createRef,
  createSignal,
  easeInOutCubic,
  tween,
  ThreadGenerator,
} from '@motion-canvas/core';

/**
 * Switch 组件的属性接口
 * 
 * 所有属性都必须使用 SignalValue<> 包装，这样可以让属性支持：
 * - 静态值：initialState={false}
 * - 函数值：initialState={() => someValue}
 * - 信号值：initialState={someSignal}
 * 
 * 继承 NodeProps 可以获取所有 Node 的基础属性（如 position, scale, opacity 等）
 */
export interface SwitchProps extends NodeProps {
  /**
   * 初始状态（开关是否打开）
   * 可选属性，默认为 false（关闭状态）
   */
  initialState?: SignalValue<boolean>;

  /**
   * 开关打开时的强调色
   * 可选属性，默认为蓝色 '#68ABDF'
   * 
   * 注意：这里使用 PossibleColor 而不是 Color，因为：
   * - PossibleColor 可以接受字符串（如 '#68ABDF'）
   * - PossibleColor 可以接受 RGB 值（如 'rgb(104, 171, 223)'）
   * - ColorSignal 会自动将这些值转换为 Color 对象
   */
  accent?: SignalValue<PossibleColor>;
}

/**
 * Switch 开关组件类
 * 
 * 这是一个类式组件，继承自 Node
 * 类式组件的优势：
 * 1. 可以定义方法（如 toggle()）用于动画控制
 * 2. 可以维护内部状态（如 isOn）
 * 3. 可以创建内部信号（如 indicatorPosition）
 * 4. 更好的封装性和可复用性
 * 
 * 如果不需要这些功能，可以使用函数式组件（如 Folder、Paper）
 */
export class Switch extends Node {
  /**
   * @initial 装饰器
   * 
   * 作用：
   * - 如果属性未提供，设置默认值
   * - 例如：如果用户没有传 initialState，则使用 false
   * 
   * 使用方式：
   * @initial(默认值)
   */
  @initial(false)
  /**
   * @signal 装饰器
   * 
   * 作用：
   * - 将属性转换为响应式信号（Signal）
   * - 信号可以动态更新，Motion Canvas 会自动处理响应式更新
   * - 这是 Motion Canvas 中所有可动画属性的基础
   * 
   * 使用方式：
   * @signal()
   * 
   * 注意：
   * - 必须与 @initial 一起使用
   * - 属性必须声明为 public declare readonly
   * - 类型必须是 SimpleSignal<类型, this> 或 ColorSignal<this>
   */
  @signal()
  /**
   * 初始状态信号
   * 
   * SimpleSignal<boolean, this> 的含义：
   * - boolean: 信号的值类型
   * - this: 当前类类型（用于类型推断）
   * 
   * 访问方式：
   * - this.initialState() 获取当前值
   * - this.initialState(true) 设置新值
   */
  public declare readonly initialState: SimpleSignal<boolean, this>;

  /**
   * @colorSignal 装饰器
   * 
   * 作用：
   * - 专门用于颜色类型的信号
   * - 自动处理颜色字符串到 Color 对象的转换
   * - 例如：'#68ABDF' 会自动转换为 Color 对象
   * 
   * 使用方式：
   * @colorSignal()
   * 
   * 注意：
   * - 不需要指定类型参数，Motion Canvas 知道它必须是颜色类型
   * - 必须与 @initial 一起使用
   */
  @initial('#68ABDF')
  @colorSignal()
  /**
   * 强调色信号
   * 
   * ColorSignal<this> 的含义：
   * - 专门用于颜色的信号类型
   * - 可以接受字符串、RGB 值等多种颜色格式
   * - 自动转换为 Color 对象
   */
  public declare readonly accent: ColorSignal<this>;

  /**
   * 内部状态：开关是否打开
   * 
   * 注意：
   * - 这是普通的类属性，不是信号
   * - 用于在 toggle() 方法中跟踪状态
   * - 不会自动触发响应式更新
   */
  private isOn: boolean;

  /**
   * 指示器位置信号
   * 
   * createSignal(初始值) 用于创建内部信号
   * 这个信号用于控制开关内部圆球的位置
   * 
   * 使用方式：
   * - this.indicatorPosition() 获取当前值
   * - this.indicatorPosition(50) 设置新值
   */
  private readonly indicatorPosition = createSignal(0);

  /**
   * 关闭状态的颜色
   * 
   * 使用 Color 对象而不是字符串，因为：
   * - Color 对象支持颜色插值（lerp）
   * - Color 对象支持颜色运算
   * - 在动画中更高效
   */
  private readonly offColor = new Color('#242424');

  /**
   * 指示器（圆球）的引用
   * 
   * createRef<Circle>() 用于创建组件引用
   * 引用允许我们在代码中访问和操作子组件
   * 
   * 使用方式：
   * - this.indicator() 获取 Circle 组件实例
   * - 可以调用其方法，如 this.indicator().position([x, y])
   */
  private readonly indicator = createRef<Circle>();

  /**
   * 容器（背景矩形）的引用
   */
  private readonly container = createRef<Rect>();

  /**
   * 构造函数
   * 
   * @param props 组件属性（可选）
   * 
   * 构造函数的工作流程：
   * 1. 调用 super() 传递属性给父类 Node
   * 2. 初始化内部状态
   * 3. 使用 this.add() 添加子组件
   */
  public constructor(props?: SwitchProps) {
    /**
     * super() 调用
     * 
     * 作用：
     * - 将属性传递给父类 Node
     * - 初始化 Node 的基础功能（如布局、变换等）
     * 
     * 可以在这里设置固定属性：
     * - layout: true 强制启用布局
     * - 其他 Node 的基础属性
     */
    super({
      // 如果需要强制某些属性，可以在这里设置
      // 例如：layout: true
      ...props,
    });

    /**
     * 初始化内部状态
     * 
     * this.initialState() 获取信号的当前值
     * 注意：即使 initialState 是信号，我们也需要调用 () 来获取值
     */
    this.isOn = this.initialState();

    /**
     * 设置指示器初始位置
     * 
     * 如果开关打开，圆球在右侧（50）
     * 如果开关关闭，圆球在左侧（-50）
     */
    this.indicatorPosition(this.isOn ? 50 : -50);

    /**
     * 添加子组件到视图
     * 
     * this.add() 方法用于添加子节点
     * 类似于在场景中使用 view.add()
     * 
     * 注意：
     * - 可以使用 JSX 语法
     * - 可以使用 ref 来引用子组件
     * - 可以使用响应式函数 () => ... 来动态计算属性
     */
    this.add(
      <Rect
        // 使用 ref 创建引用，方便后续访问
        ref={this.container}
        // 根据状态设置颜色：打开时使用强调色，关闭时使用深灰色
        fill={this.isOn ? this.accent() : this.offColor}
        // 开关尺寸：宽 200，高 100
        size={[200, 100]}
        // 圆角半径：100（完全圆形）
        radius={100}
      >
        {/* 指示器圆球 */}
        <Circle
          // 使用响应式函数计算 X 位置
          // 当 indicatorPosition 信号改变时，位置会自动更新
          x={() => this.indicatorPosition()}
          ref={this.indicator}
          // 圆球尺寸：80x80
          size={[80, 80]}
          // 白色填充
          fill="#ffffff"
        />
      </Rect>,
    );
  }

  /**
   * 切换开关状态（带动画）
   * 
   * 这是一个生成器函数（Generator Function）
   * 使用 yield* 来执行动画序列
   * 
   * @param duration 动画持续时间（秒）
   * @returns ThreadGenerator 用于在场景中 yield* 调用
   * 
   * 使用示例：
   * ```typescript
   * const switchRef = createRef<Switch>();
   * view.add(<Switch ref={switchRef} />);
   * yield* switchRef().toggle(0.5); // 0.5 秒切换动画
   * ```
   */
  public *toggle(duration: number): ThreadGenerator {
    /**
     * all() 函数
     * 
     * 作用：并行执行多个动画
     * 所有动画同时开始，同时结束
     * 
     * 使用场景：
     * - 同时改变多个属性
     * - 同时移动多个元素
     */
    yield* all(
      /**
       * tween() 函数
       * 
       * 作用：创建补间动画
       * 
       * @param duration 动画持续时间
       * @param callback 每帧回调函数
       *   - value: 0 到 1 的进度值
       *   - 可以在回调中更新任何属性
       * 
       * 使用方式：
       * tween(duration, (value) => {
       *   // value 从 0 到 1
       *   // 更新属性
       * })
       */
      // 颜色过渡动画
      tween(duration, (value) => {
        /**
         * 计算当前颜色
         * 
         * 根据开关状态，从旧颜色过渡到新颜色
         * - 如果当前是打开状态，从强调色过渡到深灰色（关闭）
         * - 如果当前是关闭状态，从深灰色过渡到强调色（打开）
         */
        const oldColor = this.isOn ? this.accent() : this.offColor;
        const newColor = this.isOn ? this.offColor : this.accent();

        /**
         * Color.lerp() 颜色插值
         * 
         * 作用：在两个颜色之间进行线性插值
         * 
         * @param from 起始颜色
         * @param to 目标颜色
         * @param t 插值系数（0 到 1）
         * 
         * easeInOutCubic(value) 使用缓动函数
         * - 让动画开始和结束时更平滑
         * - 而不是线性变化
         */
        this.container().fill(
          Color.lerp(oldColor, newColor, easeInOutCubic(value)),
        );
      }),

      // 位置移动动画
      tween(duration, (value) => {
        /**
         * 获取当前指示器位置
         * 
         * this.indicator().position() 返回 [x, y] 数组
         * 我们只需要 X 坐标
         */
        const currentPos = this.indicator().position();

        /**
         * 计算新位置
         * 
         * easeInOutCubic(value, from, to) 的用法：
         * - value: 0 到 1 的进度
         * - from: 起始值（当前 X 位置）
         * - to: 目标值（如果打开则 -50，如果关闭则 50）
         * 
         * 注意：这里的目标位置与当前状态相反
         * - 如果当前是打开（isOn = true），要移动到 -50（关闭位置）
         * - 如果当前是关闭（isOn = false），要移动到 50（打开位置）
         */
        this.indicatorPosition(
          easeInOutCubic(value, currentPos.x, this.isOn ? -50 : 50),
        );
      }),
    );

    /**
     * 更新内部状态
     * 
     * 动画完成后，切换 isOn 状态
     * 这样下次调用 toggle() 时，会向相反方向切换
     */
    this.isOn = !this.isOn;
  }

  /**
   * 设置开关状态（无动画）
   * 
   * 如果需要立即切换状态而不播放动画，可以使用这个方法
   * 
   * @param state 新的开关状态
   */
  public setState(state: boolean): void {
    this.isOn = state;
    this.indicatorPosition(state ? 50 : -50);
    this.container().fill(state ? this.accent() : this.offColor);
  }

  /**
   * 获取当前开关状态
   * 
   * @returns 当前是否打开
   */
  public getState(): boolean {
    return this.isOn;
  }
}

