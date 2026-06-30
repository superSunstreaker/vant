import {
  defineComponent,
  type PropType,
  type InjectionKey,
  type ExtractPropTypes,
} from 'vue';
import {
  createNamespace,
  addUnit,
  truthProp,
  numericProp,
  makeNumericProp,
} from '../utils';
import { BORDER_TOP } from '../utils/constant';
import { useChildren } from '@vant/use';

const [name, bem] = createNamespace('grid');

export type GridDirection = 'horizontal' | 'vertical';

/**
 * @summary Grid 宫格 - 在水平方向上把页面分隔成等宽度的区块，用于展示内容或进行页面导航
 * @attr {number|string} column-num - 列数，默认 4
 * @attr {number|string} icon-size - 图标大小，默认单位为 px，默认 28px
 * @attr {number|string} gutter - 格子之间的间距，默认单位为 px，默认 0
 * @attr {boolean} border - 是否显示边框，默认 true
 * @attr {boolean} center - 是否将格子内容居中显示，默认 true
 * @attr {boolean} square - 是否将格子固定为正方形，默认 false
 * @attr {boolean} clickable - 是否开启格子点击反馈，默认 false
 * @attr {GridDirection} direction - 格子内容排列的方向，可选值为 horizontal，默认 vertical
 * @attr {boolean} reverse - 是否调换图标和文本的位置，默认 false
 * @slot default - 默认插槽，用于放置 GridItem
 */
export const gridProps = {
  square: Boolean,
  center: truthProp,
  border: truthProp,
  gutter: numericProp,
  reverse: Boolean,
  iconSize: numericProp,
  direction: String as PropType<GridDirection>,
  clickable: Boolean,
  columnNum: makeNumericProp(4),
};

export type GridProps = ExtractPropTypes<typeof gridProps>;

export type GridProvide = {
  props: GridProps;
};

export const GRID_KEY: InjectionKey<GridProvide> = Symbol(name);

export default defineComponent({
  name,

  props: gridProps,

  setup(props, { slots }) {
    const { linkChildren } = useChildren(GRID_KEY);

    linkChildren({ props });

    return () => (
      <div
        style={{ paddingLeft: addUnit(props.gutter) }}
        class={[bem(), { [BORDER_TOP]: props.border && !props.gutter }]}
      >
        {slots.default?.()}
      </div>
    );
  },
});
