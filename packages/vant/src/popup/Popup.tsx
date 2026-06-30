import {
  ref,
  watch,
  provide,
  Teleport,
  nextTick,
  computed,
  onMounted,
  Transition,
  onActivated,
  onDeactivated,
  defineComponent,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { popupSharedProps } from './shared';
import {
  isDef,
  extend,
  makeStringProp,
  callInterceptor,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';

// Composables
import { useEventListener } from '@vant/use';
import { useExpose } from '../composables/use-expose';
import { useLockScroll } from '../composables/use-lock-scroll';
import { useLazyRender } from '../composables/use-lazy-render';
import { POPUP_TOGGLE_KEY } from '../composables/on-popup-reopen';
import { useGlobalZIndex } from '../composables/use-global-z-index';
import { useScopeId } from '../composables/use-scope-id';

// Components
import { Icon } from '../icon';
import { Overlay } from '../overlay';

// Types
import type { PopupPosition, PopupCloseIconPosition } from './types';

/**
 * @summary Popup 弹出层 - 弹出层容器，用于展示弹窗、信息提示等内容，支持多个弹出层叠加展示
 * @attr {boolean} v-model:show - 是否显示弹出层，默认 false
 * @attr {boolean} overlay - 是否显示遮罩层，默认 true
 * @attr {PopupPosition} position - 弹出位置，可选值为 top / bottom / right / left，默认 center
 * @attr {string|Array|object} overlay-class - 自定义遮罩层类名
 * @attr {object} overlay-style - 自定义遮罩层样式
 * @attr {object} overlay-props - 遮罩层属性，参考 Overlay 组件
 * @attr {number|string} duration - 动画时长，单位秒，设置为 0 可以禁用动画，默认 0.3
 * @attr {number|string} z-index - 将弹窗的 z-index 层级设置为一个固定值
 * @attr {boolean} round - 是否显示圆角，默认 false
 * @attr {boolean} destroy-on-close - 是否在关闭时销毁内容，默认 false
 * @attr {boolean} lock-scroll - 是否锁定背景滚动，默认 true
 * @attr {boolean} lazy-render - 是否在显示弹层时才渲染节点，默认 true
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 false
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭，默认 true
 * @attr {boolean} closeable - 是否显示关闭图标，默认 false
 * @attr {string} close-icon - 关闭图标名称或图片链接，默认 cross
 * @attr {PopupCloseIconPosition} close-icon-position - 关闭图标位置，默认 top-right
 * @attr {Function} before-close - 关闭前的回调函数，返回 false 可阻止关闭，支持返回 Promise
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {string} transition - 动画类名，等价于 transition 的 name 属性
 * @attr {boolean} transition-appear - 是否在初始渲染时启用过渡动画，默认 false
 * @attr {string|Element} teleport - 指定挂载的节点
 * @attr {boolean} safe-area-inset-top - 是否开启顶部安全区适配，默认 false
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 false
 * @slot default - 弹窗内容
 * @slot overlay-content - 遮罩层的内容
 * @event open - 打开弹出层时立即触发
 * @event close - 关闭弹出层时立即触发
 * @event opened - 打开弹出层且动画结束后触发
 * @event closed - 关闭弹出层且动画结束后触发
 * @event click-overlay - 点击遮罩层时触发，参数：event: MouseEvent
 * @event click-close-icon - 点击关闭图标时触发，参数：event: MouseEvent
 */
export const popupProps = extend({}, popupSharedProps, {
  round: Boolean,
  position: makeStringProp<PopupPosition>('center'),
  closeIcon: makeStringProp('cross'),
  closeable: Boolean,
  transition: String,
  iconPrefix: String,
  closeOnPopstate: Boolean,
  closeIconPosition: makeStringProp<PopupCloseIconPosition>('top-right'),
  destroyOnClose: Boolean,
  safeAreaInsetTop: Boolean,
  safeAreaInsetBottom: Boolean,
});

export type PopupProps = ExtractPropTypes<typeof popupProps>;

const [name, bem] = createNamespace('popup');

export default defineComponent({
  name,

  inheritAttrs: false,

  props: popupProps,

  emits: [
    'open',
    'close',
    'opened',
    'closed',
    'keydown',
    'update:show',
    'clickOverlay',
    'clickCloseIcon',
  ],

  setup(props, { emit, attrs, slots }) {
    let opened: boolean;
    let shouldReopen: boolean;

    const zIndex = ref<number>();
    const popupRef = ref<HTMLElement>();

    const lazyRender = useLazyRender(() => props.show || !props.lazyRender);

    const style = computed(() => {
      const style: CSSProperties = {
        zIndex: zIndex.value,
      };

      if (isDef(props.duration)) {
        const key =
          props.position === 'center'
            ? 'animationDuration'
            : 'transitionDuration';
        style[key] = `${props.duration}s`;
      }

      return style;
    });

    const open = () => {
      if (!opened) {
        opened = true;

        zIndex.value =
          props.zIndex !== undefined ? +props.zIndex : useGlobalZIndex();

        emit('open');
      }
    };

    const close = () => {
      if (opened) {
        callInterceptor(props.beforeClose, {
          done() {
            opened = false;
            emit('close');
            emit('update:show', false);
          },
        });
      }
    };

    const onClickOverlay = (event: MouseEvent) => {
      emit('clickOverlay', event);

      if (props.closeOnClickOverlay) {
        close();
      }
    };

    const renderOverlay = () => {
      if (props.overlay) {
        const overlayProps = extend(
          {
            show: props.show,
            class: props.overlayClass,
            zIndex: zIndex.value,
            duration: props.duration,
            customStyle: props.overlayStyle,
            role: props.closeOnClickOverlay ? 'button' : undefined,
            tabindex: props.closeOnClickOverlay ? 0 : undefined,
          },
          props.overlayProps,
        );

        return (
          <Overlay
            v-slots={{ default: slots['overlay-content'] }}
            {...overlayProps}
            {...useScopeId()}
            onClick={onClickOverlay}
          />
        );
      }
    };

    const onClickCloseIcon = (event: MouseEvent) => {
      emit('clickCloseIcon', event);
      close();
    };

    const renderCloseIcon = () => {
      if (props.closeable) {
        return (
          <Icon
            role="button"
            tabindex={0}
            name={props.closeIcon}
            class={[
              bem('close-icon', props.closeIconPosition),
              HAPTICS_FEEDBACK,
            ]}
            classPrefix={props.iconPrefix}
            onClick={onClickCloseIcon}
          />
        );
      }
    };

    // see: https://github.com/youzan/vant/issues/11901
    let timer: ReturnType<typeof setTimeout> | null;
    const onOpened = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        emit('opened');
      });
    };
    const onClosed = () => emit('closed');
    const onKeydown = (event: KeyboardEvent) => emit('keydown', event);

    const renderPopup = lazyRender(() => {
      const {
        destroyOnClose,
        round,
        position,
        safeAreaInsetTop,
        safeAreaInsetBottom,
        show,
      } = props;

      if (!show && destroyOnClose) {
        return;
      }

      return (
        <div
          v-show={show}
          ref={popupRef}
          style={style.value}
          role="dialog"
          tabindex={0}
          class={[
            bem({
              round,
              [position]: position,
            }),
            {
              'van-safe-area-top': safeAreaInsetTop,
              'van-safe-area-bottom': safeAreaInsetBottom,
            },
          ]}
          onKeydown={onKeydown}
          {...attrs}
          {...useScopeId()}
        >
          {slots.default?.()}
          {renderCloseIcon()}
        </div>
      );
    });

    const renderTransition = () => {
      const { position, transition, transitionAppear } = props;
      const name =
        position === 'center' ? 'van-fade' : `van-popup-slide-${position}`;

      return (
        <Transition
          v-slots={{ default: renderPopup }}
          name={transition || name}
          appear={transitionAppear}
          onAfterEnter={onOpened}
          onAfterLeave={onClosed}
        />
      );
    };

    watch(
      () => props.show,
      (show) => {
        if (show && !opened) {
          open();

          if (attrs.tabindex === 0) {
            nextTick(() => {
              popupRef.value?.focus();
            });
          }
        }
        if (!show && opened) {
          opened = false;
          emit('close');
        }
      },
    );

    useExpose({ popupRef });

    useLockScroll(popupRef, () => props.show && props.lockScroll);

    useEventListener('popstate', () => {
      if (props.closeOnPopstate) {
        close();
        shouldReopen = false;
      }
    });

    onMounted(() => {
      if (props.show) {
        open();
      }
    });

    onActivated(() => {
      if (shouldReopen) {
        emit('update:show', true);
        shouldReopen = false;
      }
    });

    onDeactivated(() => {
      // teleported popup should be closed when deactivated
      if (props.show && props.teleport) {
        close();
        shouldReopen = true;
      }
    });

    provide(POPUP_TOGGLE_KEY, () => props.show);

    return () => {
      if (props.teleport) {
        return (
          <Teleport to={props.teleport}>
            {renderOverlay()}
            {renderTransition()}
          </Teleport>
        );
      }

      return (
        <>
          {renderOverlay()}
          {renderTransition()}
        </>
      );
    };
  },
});
