import {
  computed,
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';
import {
  isDef,
  addUnit,
  isNumeric,
  truthProp,
  numericProp,
  makeStringProp,
  createNamespace,
  type Numeric,
} from '../utils';

const [name, bem] = createNamespace('badge');

export type BadgePosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

/**
 * @summary Badge 徽标 - 在右上角展示徽标数字或小红点
 * @attr {number|string} content - 徽标内容（dot 为 false 时生效）
 * @attr {string} color - 徽标背景颜色，默认 #ee0a24
 * @attr {boolean} dot - 是否展示为小红点，默认 false
 * @attr {number|string} max - 最大值，超过最大值会显示 {max}+，仅当 content 为数字时有效
 * @attr {Array} offset - 设置徽标的偏移量，数组的两项分别对应水平向右和垂直向下方向的偏移量，默认单位为 px
 * @attr {boolean} show-zero - 当 content 为数字 0 或字符串 '0' 时，是否展示徽标，默认 true
 * @attr {string} position - 徽标位置，可选值为 top-left / bottom-left / bottom-right，默认 top-right
 * @slot default - 徽标包裹的子元素
 * @slot content - 自定义徽标内容
 */
export const badgeProps = {
  dot: Boolean,
  max: numericProp,
  tag: makeStringProp<keyof HTMLElementTagNameMap>('div'),
  color: String,
  offset: Array as unknown as PropType<[Numeric, Numeric]>,
  content: numericProp,
  showZero: truthProp,
  position: makeStringProp<BadgePosition>('top-right'),
};

export type BadgeProps = ExtractPropTypes<typeof badgeProps>;

export default defineComponent({
  name,

  props: badgeProps,

  setup(props, { slots }) {
    const hasContent = () => {
      if (slots.content) {
        return true;
      }
      const { content, showZero } = props;
      return (
        isDef(content) &&
        content !== '' &&
        (showZero || (content !== 0 && content !== '0'))
      );
    };

    const renderContent = () => {
      const { dot, max, content } = props;

      if (!dot && hasContent()) {
        if (slots.content) {
          return slots.content();
        }

        if (isDef(max) && isNumeric(content!) && +content > +max) {
          return `${max}+`;
        }

        return content;
      }
    };

    const getOffsetWithMinusString = (val: string) =>
      val.startsWith('-') ? val.replace('-', '') : `-${val}`;

    const style = computed(() => {
      const style: CSSProperties = {
        background: props.color,
      };

      if (props.offset) {
        const [x, y] = props.offset;
        const { position } = props;
        const [offsetY, offsetX] = position.split('-') as [
          'top' | 'bottom',
          'left' | 'right',
        ];

        if (slots.default) {
          if (typeof y === 'number') {
            style[offsetY] = addUnit(offsetY === 'top' ? y : -y);
          } else {
            style[offsetY] =
              offsetY === 'top' ? addUnit(y) : getOffsetWithMinusString(y);
          }

          if (typeof x === 'number') {
            style[offsetX] = addUnit(offsetX === 'left' ? x : -x);
          } else {
            style[offsetX] =
              offsetX === 'left' ? addUnit(x) : getOffsetWithMinusString(x);
          }
        } else {
          style.marginTop = addUnit(y);
          style.marginLeft = addUnit(x);
        }
      }

      return style;
    });

    const renderBadge = () => {
      if (hasContent() || props.dot) {
        return (
          <div
            class={bem([
              props.position,
              { dot: props.dot, fixed: !!slots.default },
            ])}
            style={style.value}
          >
            {renderContent()}
          </div>
        );
      }
    };

    return () => {
      if (slots.default) {
        const { tag } = props;
        return (
          <tag class={bem('wrapper')}>
            {slots.default()}
            {renderBadge()}
          </tag>
        );
      }

      return renderBadge();
    };
  },
});
