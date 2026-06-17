import {
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  extend,
  numericProp,
  preventDefault,
  makeStringProp,
  createNamespace,
  BORDER_SURROUND,
} from '../utils';
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Icon } from '../icon';
import { Loading, LoadingType } from '../loading';

// Types
import {
  ButtonSize,
  ButtonType,
  ButtonNativeType,
  ButtonIconPosition,
} from './types';

const [name, bem] = createNamespace('button');

/**
 * @summary Button 按钮 - 按钮用于触发一个操作，如提交表单
 * @attr {string} type - 按钮类型，可选值为 primary / success / warning / danger，默认 default
 * @attr {string} size - 按钮尺寸，可选值为 large / small / mini，默认 normal
 * @attr {string} text - 按钮文字
 * @attr {string} color - 按钮颜色，支持传入 linear-gradient 渐变色
 * @attr {string} icon - 左侧图标名称或图片链接
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {string} icon-position - 图标展示位置，可选值为 right，默认 left
 * @attr {string} tag - 按钮根节点的 HTML 标签，默认 button
 * @attr {string} native-type - 原生 button 标签的 type 属性，默认 button
 * @attr {boolean} block - 是否为块级元素，默认 false
 * @attr {boolean} plain - 是否为朴素按钮，默认 false
 * @attr {boolean} square - 是否为方形按钮，默认 false
 * @attr {boolean} round - 是否为圆形按钮，默认 false
 * @attr {boolean} disabled - 是否禁用按钮，默认 false
 * @attr {boolean} hairline - 是否使用 0.5px 边框，默认 false
 * @attr {boolean} loading - 是否显示为加载状态，默认 false
 * @attr {string} loading-text - 加载状态提示文字
 * @attr {string} loading-type - 加载图标类型，可选值为 spinner，默认 circular
 * @attr {number|string} loading-size - 加载图标大小，默认 20px
 * @slot default - 按钮内容
 * @slot icon - 自定义图标
 * @slot loading - 自定义加载图标
 * @event click - 点击按钮，且按钮状态不为加载或禁用时触发，参数：event: MouseEvent
 */
export const buttonProps = extend({}, routeProps, {
  tag: makeStringProp<keyof HTMLElementTagNameMap>('button'),
  text: String,
  icon: String,
  type: makeStringProp<ButtonType>('default'),
  size: makeStringProp<ButtonSize>('normal'),
  color: String,
  block: Boolean,
  plain: Boolean,
  round: Boolean,
  square: Boolean,
  loading: Boolean,
  hairline: Boolean,
  disabled: Boolean,
  iconPrefix: String,
  nativeType: makeStringProp<ButtonNativeType>('button'),
  loadingSize: numericProp,
  loadingText: String,
  loadingType: String as PropType<LoadingType>,
  iconPosition: makeStringProp<ButtonIconPosition>('left'),
});

export type ButtonProps = ExtractPropTypes<typeof buttonProps>;

export default defineComponent({
  name,

  props: buttonProps,

  emits: ['click'],

  setup(props, { emit, slots }) {
    const route = useRoute();

    const renderLoadingIcon = () => {
      if (slots.loading) {
        return slots.loading();
      }

      return (
        <Loading
          size={props.loadingSize}
          type={props.loadingType}
          class={bem('loading')}
        />
      );
    };

    const renderIcon = () => {
      if (props.loading) {
        return renderLoadingIcon();
      }

      if (slots.icon) {
        return <div class={bem('icon')}>{slots.icon()}</div>;
      }

      if (props.icon) {
        return (
          <Icon
            name={props.icon}
            class={bem('icon')}
            classPrefix={props.iconPrefix}
          />
        );
      }
    };

    const renderText = () => {
      let text;
      if (props.loading) {
        text = props.loadingText;
      } else {
        text = slots.default ? slots.default() : props.text;
      }

      if (text) {
        return <span class={bem('text')}>{text}</span>;
      }
    };

    const getStyle = () => {
      const { color, plain } = props;
      if (color) {
        const style: CSSProperties = {
          color: plain ? color : 'white',
        };

        if (!plain) {
          // Use background instead of backgroundColor to make linear-gradient work
          style.background = color;
        }

        // hide border when color is linear-gradient
        if (color.includes('gradient')) {
          style.border = 0;
        } else {
          style.borderColor = color;
        }

        return style;
      }
    };

    const onClick = (event: MouseEvent) => {
      if (props.loading) {
        preventDefault(event);
      } else if (!props.disabled) {
        emit('click', event);
        route();
      }
    };

    return () => {
      const {
        tag,
        type,
        size,
        block,
        round,
        plain,
        square,
        loading,
        disabled,
        hairline,
        nativeType,
        iconPosition,
      } = props;

      const classes = [
        bem([
          type,
          size,
          {
            plain,
            block,
            round,
            square,
            loading,
            disabled,
            hairline,
          },
        ]),
        { [BORDER_SURROUND]: hairline },
      ];

      return (
        <tag
          type={nativeType}
          class={classes}
          style={getStyle()}
          disabled={disabled}
          onClick={onClick}
        >
          <div class={bem('content')}>
            {iconPosition === 'left' && renderIcon()}
            {renderText()}
            {iconPosition === 'right' && renderIcon()}
          </div>
        </tag>
      );
    };
  },
});
