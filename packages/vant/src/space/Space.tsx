import {
  computed,
  Comment,
  CSSProperties,
  defineComponent,
  ExtractPropTypes,
  Fragment,
  PropType,
  Text,
  type VNode,
} from 'vue';
import { createNamespace } from '../utils';

const [name, bem] = createNamespace('space');

export type SpaceSize = number | string;
export type SpaceAlign = 'start' | 'end' | 'center' | 'baseline';

/**
 * @summary Space 间距 - 设置元素之间的间距
 * @attr {string} direction - 间距方向，可选值为 vertical / horizontal，默认 horizontal
 * @attr {number|string|Array} size - 间距大小，如 20px 2em，默认单位为 px，支持数组形式来分别设置横向和纵向间距，默认 8px
 * @attr {SpaceAlign} align - 设置子元素的对齐方式，可选值为 start / end / center / baseline
 * @attr {boolean} wrap - 是否自动换行，仅适用于水平方向排列，默认 false
 * @attr {boolean} fill - 是否让 Space 变为一个块级元素，填充整个父元素，默认 false
 * @slot default - 间距组件内容
 */
export const spaceProps = {
  align: String as PropType<SpaceAlign>,
  direction: {
    type: String as PropType<'vertical' | 'horizontal'>,
    default: 'horizontal',
  },
  size: {
    type: [Number, String, Array] as PropType<
      number | string | [SpaceSize, SpaceSize]
    >,
    default: 8,
  },
  wrap: Boolean,
  fill: Boolean,
};

export type SpaceProps = ExtractPropTypes<typeof spaceProps>;

function filterEmpty(children: VNode[] = []) {
  const nodes: VNode[] = [];
  children.forEach((child) => {
    if (Array.isArray(child)) {
      nodes.push(...child);
    } else if (child.type === Fragment) {
      nodes.push(...filterEmpty(child.children as VNode[]));
    } else {
      nodes.push(child);
    }
  });
  return nodes.filter(
    (c) =>
      !(
        c &&
        (c.type === Comment ||
          (c.type === Fragment && c.children?.length === 0) ||
          (c.type === Text && (c.children as string).trim() === ''))
      ),
  );
}

export default defineComponent({
  name,
  props: spaceProps,
  setup(props, { slots }) {
    const mergedAlign = computed(
      () => props.align ?? (props.direction === 'horizontal' ? 'center' : ''),
    );

    const getMargin = (size: SpaceSize) => {
      if (typeof size === 'number') {
        return size + 'px';
      }
      return size;
    };
    const getMarginStyle = (isLast: boolean): CSSProperties => {
      const style: CSSProperties = {};

      const marginRight = `${getMargin(
        Array.isArray(props.size) ? props.size[0] : props.size,
      )}`;
      const marginBottom = `${getMargin(
        Array.isArray(props.size) ? props.size[1] : props.size,
      )}`;

      if (isLast) {
        return props.wrap ? { marginBottom } : {};
      }

      if (props.direction === 'horizontal') {
        style.marginRight = marginRight;
      }
      if (props.direction === 'vertical' || props.wrap) {
        style.marginBottom = marginBottom;
      }

      return style;
    };

    return () => {
      const children = filterEmpty(slots.default?.());
      return (
        <div
          class={[
            bem({
              [props.direction]: props.direction,
              [`align-${mergedAlign.value}`]: mergedAlign.value,
              wrap: props.wrap,
              fill: props.fill,
            }),
          ]}
        >
          {children.map((c, i) => (
            <div
              key={`item-${i}`}
              class={`${name}-item`}
              style={getMarginStyle(i === children.length - 1)}
            >
              {c}
            </div>
          ))}
        </div>
      );
    };
  },
});
