import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import {
  addUnit,
  truthProp,
  numericProp,
  makeStringProp,
  makeNumericProp,
  createNamespace,
  type Numeric,
} from '../utils';

// Components
import SkeletonTitle from '../skeleton-title';
import SkeletonAvatar from '../skeleton-avatar';
import SkeletonParagraph, { DEFAULT_ROW_WIDTH } from '../skeleton-paragraph';

// Types
import type { SkeletonAvatarShape } from '../skeleton-avatar';

const [name, bem] = createNamespace('skeleton');
const DEFAULT_LAST_ROW_WIDTH = '60%';

/**
 * @summary Skeleton 骨架屏 - 用于在内容加载过程中展示一组占位图形
 * @attr {number|string} row - 段落占位图行数，默认 0
 * @attr {number|string|Array} row-width - 段落占位图宽度，可传数组来设置每一行的宽度，默认 100%
 * @attr {boolean} title - 是否显示标题占位图，默认 false
 * @attr {boolean} avatar - 是否显示头像占位图，默认 false
 * @attr {boolean} loading - 是否显示骨架屏，传 false 时会展示子组件内容，默认 true
 * @attr {boolean} animate - 是否开启动画，默认 true
 * @attr {boolean} round - 是否将标题和段落显示为圆角风格，默认 false
 * @attr {number|string} title-width - 标题占位图宽度，默认 40%
 * @attr {number|string} avatar-size - 头像占位图大小，默认 32px
 * @attr {string} avatar-shape - 头像占位图形状，可选值为 square，默认 round
 * @slot default - 骨架屏内容
 * @slot template - 自定义内容
 */
export const skeletonProps = {
  row: makeNumericProp(0),
  round: Boolean,
  title: Boolean,
  titleWidth: numericProp,
  avatar: Boolean,
  avatarSize: numericProp,
  avatarShape: makeStringProp<SkeletonAvatarShape>('round'),
  loading: truthProp,
  animate: truthProp,
  rowWidth: {
    type: [Number, String, Array] as PropType<Numeric | Numeric[]>,
    default: DEFAULT_ROW_WIDTH,
  },
};

export type SkeletonProps = ExtractPropTypes<typeof skeletonProps>;

export default defineComponent({
  name,

  inheritAttrs: false,

  props: skeletonProps,

  setup(props, { slots, attrs }) {
    const renderAvatar = () => {
      if (props.avatar) {
        return (
          <SkeletonAvatar
            avatarShape={props.avatarShape}
            avatarSize={props.avatarSize}
          />
        );
      }
    };

    const renderTitle = () => {
      if (props.title) {
        return (
          <SkeletonTitle round={props.round} titleWidth={props.titleWidth} />
        );
      }
    };

    const getRowWidth = (index: number) => {
      const { rowWidth } = props;

      if (rowWidth === DEFAULT_ROW_WIDTH && index === +props.row - 1) {
        return DEFAULT_LAST_ROW_WIDTH;
      }

      if (Array.isArray(rowWidth)) {
        return rowWidth[index];
      }

      return rowWidth;
    };

    const renderRows = () =>
      Array(+props.row)
        .fill('')
        .map((_, i) => (
          <SkeletonParagraph
            key={i}
            round={props.round}
            rowWidth={addUnit(getRowWidth(i))}
          />
        ));

    const renderContents = () => {
      if (slots.template) {
        return slots.template();
      }

      return (
        <>
          {renderAvatar()}
          <div class={bem('content')}>
            {renderTitle()}
            {renderRows()}
          </div>
        </>
      );
    };

    return () => {
      if (!props.loading) {
        return slots.default?.();
      }

      return (
        <div
          class={bem({ animate: props.animate, round: props.round })}
          {...attrs}
        >
          {renderContents()}
        </div>
      );
    };
  },
});
