import {
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  isDef,
  extend,
  truthProp,
  unknownProp,
  numericProp,
  makeStringProp,
  createNamespace,
} from '../utils';

// Composables
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Icon } from '../icon';

const [name, bem] = createNamespace('cell');

export type CellSize = 'normal' | 'large';

export type CellArrowDirection = 'up' | 'down' | 'left' | 'right';

/**
 * @summary Cell 单元格 - 单元格为列表中的展示项
 * @attr {string} title - 左侧标题
 * @attr {string|number} value - 右侧内容
 * @attr {string|number} label - 标题下方的描述信息
 * @attr {string} size - 单元格大小，可选值为 large，默认 normal
 * @attr {string} icon - 左侧图标名称或图片链接
 * @attr {string} icon-prefix - 图标类名前缀
 * @attr {string} tag - 根节点标签，默认 div
 * @attr {boolean} border - 是否显示内边框，默认 true
 * @attr {boolean} center - 是否使内容垂直居中，默认 false
 * @attr {boolean} is-link - 是否展示右侧箭头并开启点击反馈，默认 false
 * @attr {boolean} required - 是否显示表单必填星号，默认 false
 * @attr {boolean} clickable - 是否开启点击反馈，默认 false
 * @attr {string} arrow-direction - 箭头方向，可选值为 left / up / down，默认 right
 * @attr {string} title-style - 标题样式
 * @slot default - 自定义右侧内容
 * @slot title - 自定义左侧标题
 * @slot label - 自定义标题下方描述
 * @slot icon - 自定义左侧图标
 * @slot right-icon - 自定义右侧图标
 * @slot extra - 自定义最右侧额外内容
 * @event click - 点击单元格时触发，参数：event: MouseEvent
 */
export const cellSharedProps = {
  tag: makeStringProp<keyof HTMLElementTagNameMap>('div'),
  icon: String,
  size: String as PropType<CellSize>,
  title: numericProp,
  value: numericProp,
  label: numericProp,
  center: Boolean,
  isLink: Boolean,
  border: truthProp,
  iconPrefix: String,
  valueClass: unknownProp,
  labelClass: unknownProp,
  titleClass: unknownProp,
  titleStyle: null as unknown as PropType<string | CSSProperties>,
  arrowDirection: String as PropType<CellArrowDirection>,
  required: {
    type: [Boolean, String] as PropType<boolean | 'auto'>,
    default: null,
  },
  clickable: {
    type: Boolean as PropType<boolean | null>,
    default: null,
  },
};

export const cellProps = extend({}, cellSharedProps, routeProps);

export type CellProps = ExtractPropTypes<typeof cellProps>;

export default defineComponent({
  name,

  props: cellProps,

  setup(props, { slots }) {
    const route = useRoute();

    const renderLabel = () => {
      const showLabel = slots.label || isDef(props.label);

      if (showLabel) {
        return (
          <div class={[bem('label'), props.labelClass]}>
            {slots.label ? slots.label() : props.label}
          </div>
        );
      }
    };

    const renderTitle = () => {
      if (slots.title || isDef(props.title)) {
        const titleSlot = slots.title?.();

        // Allow Field to dynamically set empty label
        // https://github.com/youzan/vant/issues/11368
        if (Array.isArray(titleSlot) && titleSlot.length === 0) {
          return;
        }

        return (
          <div
            class={[bem('title'), props.titleClass]}
            style={props.titleStyle}
          >
            {titleSlot || <span>{props.title}</span>}
            {renderLabel()}
          </div>
        );
      }
    };

    const renderValue = () => {
      // slots.default is an alias of slots.value
      const slot = slots.value || slots.default;
      const hasValue = slot || isDef(props.value);

      if (hasValue) {
        return (
          <div class={[bem('value'), props.valueClass]}>
            {slot ? slot() : <span>{props.value}</span>}
          </div>
        );
      }
    };

    const renderLeftIcon = () => {
      if (slots.icon) {
        return slots.icon();
      }

      if (props.icon) {
        return (
          <Icon
            name={props.icon}
            class={bem('left-icon')}
            classPrefix={props.iconPrefix}
          />
        );
      }
    };

    const renderRightIcon = () => {
      if (slots['right-icon']) {
        return slots['right-icon']();
      }

      if (props.isLink) {
        const name =
          props.arrowDirection && props.arrowDirection !== 'right'
            ? `arrow-${props.arrowDirection}`
            : 'arrow';
        return <Icon name={name} class={bem('right-icon')} />;
      }
    };

    return () => {
      const { tag, size, center, border, isLink, required } = props;
      const clickable = props.clickable ?? isLink;

      const classes: Record<string, boolean | undefined> = {
        center,
        required: !!required,
        clickable,
        borderless: !border,
      };
      if (size) {
        classes[size] = !!size;
      }

      return (
        <tag
          class={bem(classes)}
          role={clickable ? 'button' : undefined}
          tabindex={clickable ? 0 : undefined}
          onClick={clickable ? route : undefined}
        >
          {renderLeftIcon()}
          {renderTitle()}
          {renderValue()}
          {renderRightIcon()}
          {slots.extra?.()}
        </tag>
      );
    };
  },
});
