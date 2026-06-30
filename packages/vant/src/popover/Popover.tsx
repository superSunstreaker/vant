import {
  ref,
  watch,
  nextTick,
  onMounted,
  watchEffect,
  onBeforeUnmount,
  defineComponent,
  type PropType,
  type CSSProperties,
  type TeleportProps,
  type ExtractPropTypes,
} from 'vue';
import { Instance, createPopper, offsetModifier } from '@vant/popperjs';

// Utils
import {
  pick,
  extend,
  inBrowser,
  truthProp,
  numericProp,
  unknownProp,
  BORDER_RIGHT,
  BORDER_BOTTOM,
  makeArrayProp,
  makeStringProp,
  createNamespace,
  type ComponentInstance,
} from '../utils';

// Composables
import { useClickAway } from '@vant/use';
import { useScopeId } from '../composables/use-scope-id';
import { useSyncPropRef } from '../composables/use-sync-prop-ref';

// Components
import { Icon } from '../icon';
import { Popup } from '../popup';

// Types
import {
  PopoverTheme,
  PopoverAction,
  PopoverActionsDirection,
  PopoverTrigger,
  PopoverPlacement,
} from './types';

const [name, bem] = createNamespace('popover');

const popupProps = [
  'overlay',
  'duration',
  'teleport',
  'overlayStyle',
  'overlayClass',
  'closeOnClickOverlay',
] as const;

/**
 * @summary Popover 气泡弹出框 - 弹出式的气泡菜单
 * @attr {boolean} v-model:show - 是否展示气泡弹出层，默认 false
 * @attr {PopoverAction[]} actions - 选项列表，默认 []
 * @attr {PopoverActionsDirection} actions-direction - 选项列表的排列方向，可选值为 horizontal，默认 vertical
 * @attr {PopoverPlacement} placement - 弹出位置，默认 bottom
 * @attr {PopoverTheme} theme - 主题风格，可选值为 dark，默认 light
 * @attr {PopoverTrigger} trigger - 触发方式，可选值为 manual，默认 click
 * @attr {number|string} duration - 动画时长，单位秒，设置为 0 可以禁用动画，默认 0.3
 * @attr {Array} offset - 出现位置的偏移量，默认 [0, 8]
 * @attr {boolean} overlay - 是否显示遮罩层，默认 false
 * @attr {string|Array|object} overlay-class - 自定义遮罩层类名
 * @attr {object} overlay-style - 自定义遮罩层样式
 * @attr {boolean} show-arrow - 是否展示小箭头，默认 true
 * @attr {boolean} close-on-click-action - 是否在点击选项后关闭，默认 true
 * @attr {boolean} close-on-click-outside - 是否在点击外部元素后关闭菜单，默认 true
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭菜单，默认 true
 * @attr {string|Element} teleport - 指定挂载的节点，默认 body
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @slot default - 自定义菜单内容
 * @slot reference - 触发 Popover 显示的元素内容
 * @slot action - 自定义选项内容
 * @event select - 点击选项时触发，参数：action: PopoverAction, index: number
 */
export const popoverProps = {
  show: Boolean,
  theme: makeStringProp<PopoverTheme>('light'),
  overlay: Boolean,
  actions: makeArrayProp<PopoverAction>(),
  actionsDirection: makeStringProp<PopoverActionsDirection>('vertical'),
  trigger: makeStringProp<PopoverTrigger>('click'),
  duration: numericProp,
  showArrow: truthProp,
  placement: makeStringProp<PopoverPlacement>('bottom'),
  iconPrefix: String,
  overlayClass: unknownProp,
  overlayStyle: Object as PropType<CSSProperties>,
  closeOnClickAction: truthProp,
  closeOnClickOverlay: truthProp,
  closeOnClickOutside: truthProp,
  offset: {
    type: Array as unknown as PropType<[number, number]>,
    default: () => [0, 8],
  },
  teleport: {
    type: [String, Object] as PropType<TeleportProps['to']>,
    default: 'body',
  },
};

export type PopoverProps = ExtractPropTypes<typeof popoverProps>;

export default defineComponent({
  name,

  props: popoverProps,

  emits: ['select', 'touchstart', 'update:show'],

  setup(props, { emit, slots, attrs }) {
    let popper: Instance | null;

    const popupRef = ref<HTMLElement>();
    const wrapperRef = ref<HTMLElement>();
    const popoverRef = ref<ComponentInstance>();

    const show = useSyncPropRef(
      () => props.show,
      (value) => emit('update:show', value),
    );

    const getPopoverOptions = () => ({
      placement: props.placement,
      modifiers: [
        {
          name: 'computeStyles',
          options: {
            adaptive: false,
            gpuAcceleration: false,
          },
        },
        extend({}, offsetModifier, {
          options: {
            offset: props.offset,
          },
        }),
      ],
    });

    const createPopperInstance = () => {
      if (wrapperRef.value && popoverRef.value) {
        return createPopper(
          wrapperRef.value,
          popoverRef.value.popupRef.value,
          getPopoverOptions(),
        );
      }
      return null;
    };

    const updateLocation = () => {
      nextTick(() => {
        if (!show.value) {
          return;
        }

        if (!popper) {
          popper = createPopperInstance();
          if (inBrowser) {
            window.addEventListener('animationend', updateLocation);
            window.addEventListener('transitionend', updateLocation);
          }
        } else {
          popper.setOptions(getPopoverOptions());
        }
      });
    };

    const updateShow = (value: boolean) => {
      show.value = value;
    };

    const onClickWrapper = () => {
      if (props.trigger === 'click') {
        show.value = !show.value;
      }
    };

    const onClickAction = (action: PopoverAction, index: number) => {
      if (action.disabled) {
        return;
      }

      emit('select', action, index);

      if (props.closeOnClickAction) {
        show.value = false;
      }
    };

    const onClickAway = () => {
      if (
        show.value &&
        props.closeOnClickOutside &&
        (!props.overlay || props.closeOnClickOverlay)
      ) {
        show.value = false;
      }
    };

    const renderActionContent = (action: PopoverAction, index: number) => {
      if (slots.action) {
        return slots.action({ action, index });
      }

      return [
        action.icon && (
          <Icon
            name={action.icon}
            classPrefix={props.iconPrefix}
            class={bem('action-icon')}
          />
        ),
        <div
          class={[
            bem('action-text'),
            { [BORDER_BOTTOM]: props.actionsDirection === 'vertical' },
          ]}
        >
          {action.text}
        </div>,
      ];
    };

    const renderAction = (action: PopoverAction, index: number) => {
      const { icon, color, disabled, className } = action;
      return (
        <div
          role="menuitem"
          class={[
            bem('action', { disabled, 'with-icon': icon }),
            { [BORDER_RIGHT]: props.actionsDirection === 'horizontal' },
            className,
          ]}
          style={{ color }}
          tabindex={disabled ? undefined : 0}
          aria-disabled={disabled || undefined}
          onClick={() => onClickAction(action, index)}
        >
          {renderActionContent(action, index)}
        </div>
      );
    };

    onMounted(() => {
      updateLocation();
      watchEffect(() => {
        popupRef.value = popoverRef.value?.popupRef.value;
      });
    });

    onBeforeUnmount(() => {
      if (popper) {
        if (inBrowser) {
          window.removeEventListener('animationend', updateLocation);
          window.removeEventListener('transitionend', updateLocation);
        }
        popper.destroy();
        popper = null;
      }
    });

    watch(() => [show.value, props.offset, props.placement], updateLocation);

    useClickAway([wrapperRef, popupRef], onClickAway, {
      eventName: 'touchstart',
    });

    return () => (
      <>
        <span ref={wrapperRef} class={bem('wrapper')} onClick={onClickWrapper}>
          {slots.reference?.()}
        </span>
        <Popup
          ref={popoverRef}
          show={show.value}
          class={bem([props.theme])}
          position={''}
          transition="van-popover-zoom"
          lockScroll={false}
          onUpdate:show={updateShow}
          {...attrs}
          {...useScopeId()}
          {...pick(props, popupProps)}
        >
          {props.showArrow && <div class={bem('arrow')} />}
          <div role="menu" class={bem('content', props.actionsDirection)}>
            {slots.default ? slots.default() : props.actions.map(renderAction)}
          </div>
        </Popup>
      </>
    );
  },
});
