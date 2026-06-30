import {
  ref,
  Ref,
  reactive,
  computed,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  clamp,
  isDef,
  numericProp,
  Interceptor,
  preventDefault,
  callInterceptor,
  createNamespace,
  makeNumericProp,
} from '../utils';

// Composables
import { useRect, useClickAway, useEventListener } from '@vant/use';
import { useTouch } from '../composables/use-touch';
import { useExpose } from '../composables/use-expose';

// Types
import type {
  SwipeCellSide,
  SwipeCellExpose,
  SwipeCellPosition,
} from './types';

const [name, bem] = createNamespace('swipe-cell');

/**
 * @summary SwipeCell 滑动单元格 - 可以左右滑动来展示操作按钮的单元格组件
 * @attr {number|string} name - 标识符，通常为一个唯一的字符串或数字，可以在事件参数中获取到，默认 ''
 * @attr {number|string} left-width - 指定左侧滑动区域宽度，单位为 px，默认 auto
 * @attr {number|string} right-width - 指定右侧滑动区域宽度，单位为 px，默认 auto
 * @attr {number|string} threshold - 滑动触发阈值（滑动距离与滑动区域宽度的比例），默认 0.15
 * @attr {Function} before-close - 关闭前的回调函数，返回 false 可阻止关闭，支持返回 Promise
 * @attr {boolean} disabled - 是否禁用滑动，默认 false
 * @attr {boolean} stop-propagation - 是否阻止滑动事件冒泡，默认 false
 * @slot default - 默认显示的内容
 * @slot left - 左侧滑动区域的内容
 * @slot right - 右侧滑动区域的内容
 * @event click - 点击时触发，参数：position: 'left' | 'right' | 'cell' | 'outside'
 * @event open - 打开时触发，参数：{ name: string|number, position: 'left' | 'right' }
 * @event close - 关闭时触发，参数：{ name: string|number, position: 'left' | 'right' | 'cell' | 'outside' }
 */
export const swipeCellProps = {
  name: makeNumericProp(''),
  disabled: Boolean,
  leftWidth: numericProp,
  rightWidth: numericProp,
  threshold: {
    type: numericProp,
    default: 0.15,
    validator: (value: number | string) => +value >= 0 && +value <= 1,
  },
  beforeClose: Function as PropType<Interceptor>,
  stopPropagation: Boolean,
};

export type SwipeCellProps = ExtractPropTypes<typeof swipeCellProps>;

export default defineComponent({
  name,

  props: swipeCellProps,

  emits: ['open', 'close', 'click'],

  setup(props, { emit, slots }) {
    let opened: boolean;
    let lockClick: boolean;
    let startOffset: number;
    let isInBeforeClosing: boolean;

    const root = ref<HTMLElement>();
    const leftRef = ref<HTMLElement>();
    const rightRef = ref<HTMLElement>();

    const state = reactive({
      offset: 0,
      dragging: false,
    });

    const touch = useTouch();

    const getWidthByRef = (ref: Ref<HTMLElement | undefined>) =>
      ref.value ? useRect(ref).width : 0;

    const leftWidth = computed(() =>
      isDef(props.leftWidth) ? +props.leftWidth : getWidthByRef(leftRef),
    );

    const rightWidth = computed(() =>
      isDef(props.rightWidth) ? +props.rightWidth : getWidthByRef(rightRef),
    );

    const open = (side: SwipeCellSide) => {
      state.offset = side === 'left' ? leftWidth.value : -rightWidth.value;

      if (!opened) {
        opened = true;
        emit('open', {
          name: props.name,
          position: side,
        });
      }
    };

    const close = (position: SwipeCellPosition) => {
      state.offset = 0;

      if (opened) {
        opened = false;
        emit('close', {
          name: props.name,
          position,
        });
      }
    };

    const toggle = (side: SwipeCellSide) => {
      const offset = Math.abs(state.offset);
      const thresholdValue = +props.threshold;
      const threshold = opened ? 1 - thresholdValue : thresholdValue;
      const width = side === 'left' ? leftWidth.value : rightWidth.value;

      if (width && offset > width * threshold) {
        open(side);
      } else {
        close(side);
      }
    };

    const onTouchStart = (event: TouchEvent) => {
      if (!props.disabled) {
        startOffset = state.offset;
        touch.start(event);
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (props.disabled) {
        return;
      }

      const { deltaX } = touch;
      touch.move(event);

      if (touch.isHorizontal()) {
        lockClick = true;
        state.dragging = true;

        const isEdge = !opened || deltaX.value * startOffset < 0;
        if (isEdge) {
          preventDefault(event, props.stopPropagation);
        }

        state.offset = clamp(
          deltaX.value + startOffset,
          -rightWidth.value,
          leftWidth.value,
        );
      }
    };

    const onTouchEnd = () => {
      if (state.dragging) {
        state.dragging = false;
        toggle(state.offset > 0 ? 'left' : 'right');

        // compatible with desktop scenario
        setTimeout(() => {
          lockClick = false;
        }, 0);
      }
    };

    const onClick = (
      position: SwipeCellPosition = 'outside',
      event: MouseEvent | TouchEvent,
    ) => {
      if (isInBeforeClosing) return;

      emit('click', position);

      if (opened && !lockClick) {
        isInBeforeClosing = true;
        callInterceptor(props.beforeClose, {
          args: [
            {
              event,
              name: props.name,
              position,
            },
          ],
          done: () => {
            isInBeforeClosing = false;
            close(position);
          },
          canceled: () => (isInBeforeClosing = false),
          error: () => (isInBeforeClosing = false),
        });
      }
    };

    const getClickHandler =
      (position: SwipeCellPosition) => (event: MouseEvent) => {
        if (lockClick || opened) {
          event.stopPropagation();
        }

        if (lockClick) {
          return;
        }

        onClick(position, event);
      };

    const renderSideContent = (
      side: SwipeCellSide,
      ref: Ref<HTMLElement | undefined>,
    ) => {
      const contentSlot = slots[side];
      if (contentSlot) {
        return (
          <div ref={ref} class={bem(side)} onClick={getClickHandler(side)}>
            {contentSlot()}
          </div>
        );
      }
    };

    useExpose<SwipeCellExpose>({
      open,
      close,
    });

    useClickAway(root, (event) => onClick('outside', event as TouchEvent), {
      eventName: 'touchstart',
    });

    // useEventListener will set passive to `false` to eliminate the warning of Chrome
    useEventListener('touchmove', onTouchMove, {
      target: root,
    });

    return () => {
      const wrapperStyle = {
        transform: `translate3d(${state.offset}px, 0, 0)`,
        transitionDuration: state.dragging ? '0s' : '.6s',
      };

      return (
        <div
          ref={root}
          class={bem()}
          onClick={getClickHandler('cell')}
          onTouchstartPassive={onTouchStart}
          onTouchend={onTouchEnd}
          onTouchcancel={onTouchEnd}
        >
          <div class={bem('wrapper')} style={wrapperStyle}>
            {renderSideContent('left', leftRef)}
            {slots.default?.()}
            {renderSideContent('right', rightRef)}
          </div>
        </div>
      );
    };
  },
});
