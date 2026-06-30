import {
  watch,
  onMounted,
  onUnmounted,
  defineComponent,
  type PropType,
  type TeleportProps,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  pick,
  isDef,
  unknownProp,
  numericProp,
  makeStringProp,
  makeNumberProp,
  createNamespace,
} from '../utils';
import { lockClick } from './lock-click';

// Components
import { Icon } from '../icon';
import { Popup } from '../popup';
import { Loading, LoadingType } from '../loading';

// Types
import type { ToastType, ToastPosition, ToastWordBreak } from './types';

const [name, bem] = createNamespace('toast');

const popupInheritProps = [
  'show',
  'overlay',
  'teleport',
  'transition',
  'overlayClass',
  'overlayStyle',
  'closeOnClickOverlay',
  'zIndex',
] as const;

/**
 * @summary Toast 轻提示 - 在页面中间弹出黑色半透明提示，用于消息通知、加载提示、操作结果提示等场景
 * @attr {ToastType} type - 提示类型，可选值为 loading / success / fail / html，默认 text
 * @attr {ToastPosition} position - 位置，可选值为 top / bottom，默认 middle
 * @attr {string} message - 文本内容，支持通过 \n 换行
 * @attr {ToastWordBreak} word-break - 文本内容的换行方式，可选值为 normal / break-all / break-word，默认 break-all
 * @attr {string} icon - 自定义图标，支持传入图标名称或图片链接
 * @attr {number|string} icon-size - 图标大小，默认单位为 px，默认 36px
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {boolean} overlay - 是否显示背景遮罩层，默认 false
 * @attr {boolean} forbid-click - 是否禁止背景点击，默认 false
 * @attr {boolean} close-on-click - 是否在点击后关闭，默认 false
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭，默认 false
 * @attr {string} loading-type - 加载图标类型，可选值为 spinner，默认 circular
 * @attr {number} duration - 展示时长(ms)，值为 0 时，toast 不会消失，默认 2000
 * @attr {string|Array|object} class-name - 自定义类名
 * @attr {string|Array|object} overlay-class - 自定义遮罩层类名
 * @attr {object} overlay-style - 自定义遮罩层样式
 * @attr {string} transition - 动画类名，默认 van-fade
 * @attr {string|Element} teleport - 指定挂载的节点，默认 body
 * @attr {number|string} z-index - 将组件的 z-index 层级设置为一个固定值
 * @slot message - 自定义文本内容
 */
export const toastProps = {
  icon: String,
  show: Boolean,
  type: makeStringProp<ToastType>('text'),
  overlay: Boolean,
  message: numericProp,
  iconSize: numericProp,
  duration: makeNumberProp(2000),
  position: makeStringProp<ToastPosition>('middle'),
  teleport: [String, Object] as PropType<TeleportProps['to']>,
  wordBreak: String as PropType<ToastWordBreak>,
  className: unknownProp,
  iconPrefix: String,
  transition: makeStringProp('van-fade'),
  loadingType: String as PropType<LoadingType>,
  forbidClick: Boolean,
  overlayClass: unknownProp,
  overlayStyle: Object as PropType<CSSProperties>,
  closeOnClick: Boolean,
  closeOnClickOverlay: Boolean,
  zIndex: numericProp,
};

export type ToastProps = ExtractPropTypes<typeof toastProps>;

export default defineComponent({
  name,

  props: toastProps,

  emits: ['update:show'],

  setup(props, { emit, slots }) {
    let timer: ReturnType<typeof setTimeout>;
    let clickable = false;

    const toggleClickable = () => {
      const newValue = props.show && props.forbidClick;
      if (clickable !== newValue) {
        clickable = newValue;
        lockClick(clickable);
      }
    };

    const updateShow = (show: boolean) => emit('update:show', show);

    const onClick = () => {
      if (props.closeOnClick) {
        updateShow(false);
      }
    };

    const clearTimer = () => clearTimeout(timer);

    const renderIcon = () => {
      const { icon, type, iconSize, iconPrefix, loadingType } = props;
      const hasIcon = icon || type === 'success' || type === 'fail';

      if (hasIcon) {
        return (
          <Icon
            name={icon || type}
            size={iconSize}
            class={bem('icon')}
            classPrefix={iconPrefix}
          />
        );
      }

      if (type === 'loading') {
        return (
          <Loading class={bem('loading')} size={iconSize} type={loadingType} />
        );
      }
    };

    const renderMessage = () => {
      const { type, message } = props;

      if (slots.message) {
        return <div class={bem('text')}>{slots.message()}</div>;
      }

      if (isDef(message) && message !== '') {
        return type === 'html' ? (
          <div key={0} class={bem('text')} innerHTML={String(message)} />
        ) : (
          <div class={bem('text')}>{message}</div>
        );
      }
    };

    watch(() => [props.show, props.forbidClick], toggleClickable);

    watch(
      () => [props.show, props.type, props.message, props.duration],
      () => {
        clearTimer();
        if (props.show && props.duration > 0) {
          timer = setTimeout(() => {
            updateShow(false);
          }, props.duration);
        }
      },
    );

    onMounted(toggleClickable);
    onUnmounted(toggleClickable);

    return () => (
      <Popup
        class={[
          bem([
            props.position,
            props.wordBreak === 'normal' ? 'break-normal' : props.wordBreak,
            { [props.type]: !props.icon },
          ]),
          props.className,
        ]}
        lockScroll={false}
        onClick={onClick}
        onClosed={clearTimer}
        onUpdate:show={updateShow}
        {...pick(props, popupInheritProps)}
      >
        {renderIcon()}
        {renderMessage()}
      </Popup>
    );
  },
});
