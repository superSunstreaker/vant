import {
  ref,
  watch,
  computed,
  Teleport,
  nextTick,
  onMounted,
  defineComponent,
  type PropType,
  type TeleportProps,
  type ExtractPropTypes,
  onDeactivated,
  onActivated,
} from 'vue';

// Utils
import {
  extend,
  addUnit,
  inBrowser,
  numericProp,
  getScrollTop,
  getZIndexStyle,
  createNamespace,
  makeNumericProp,
} from '../utils';
import { throttle } from '../lazyload/vue-lazyload/util';

// Composables
import { useEventListener, getScrollParent } from '@vant/use';

// Components
import { Icon } from '../icon';

const [name, bem] = createNamespace('back-top');

/**
 * @summary BackTop 回到顶部 - 返回页面顶部的操作按钮
 * @attr {string|HTMLElement} target - 触发滚动的目标对象，支持传入选择器或 DOM 元素，默认最近的父级滚动容器
 * @attr {number|string} right - 距离页面右侧的距离，默认单位为 px，默认 30
 * @attr {number|string} bottom - 距离页面底部的距离，默认单位为 px，默认 40
 * @attr {number} offset - 滚动高度达到此参数值时才显示组件，默认 200
 * @attr {string|Element} teleport - 指定挂载的节点，默认 body
 * @attr {boolean} immediate - 是否瞬间滚动到顶部，默认 false
 * @attr {number|string} z-index - 设置组件的 z-index 层级，默认 100
 * @slot default - 自定义按钮显示内容
 * @event click - 点击组件时触发，参数：event: MouseEvent
 */
export const backTopProps = {
  right: numericProp,
  bottom: numericProp,
  zIndex: numericProp,
  target: [String, Object] as PropType<TeleportProps['to']>,
  offset: makeNumericProp(200),
  immediate: Boolean,
  teleport: {
    type: [String, Object] as PropType<TeleportProps['to']>,
    default: 'body',
  },
};

export type BackTopProps = ExtractPropTypes<typeof backTopProps>;

export default defineComponent({
  name,

  inheritAttrs: false,

  props: backTopProps,

  emits: ['click'],

  setup(props, { emit, slots, attrs }) {
    let shouldReshow = false;
    const show = ref(false);
    const root = ref<HTMLElement>();
    const scrollParent = ref<Window | Element>();

    const style = computed(() =>
      extend(getZIndexStyle(props.zIndex), {
        right: addUnit(props.right),
        bottom: addUnit(props.bottom),
      }),
    );

    const onClick = (event: MouseEvent) => {
      emit('click', event);
      scrollParent.value?.scrollTo({
        top: 0,
        behavior: props.immediate ? 'auto' : 'smooth',
      });
    };

    const scroll = () => {
      show.value = scrollParent.value
        ? getScrollTop(scrollParent.value) >= +props.offset
        : false;
    };

    const getTarget = () => {
      const { target } = props;

      if (typeof target === 'string') {
        const el = document.querySelector(target);

        if (el) {
          return el;
        }

        if (process.env.NODE_ENV !== 'production') {
          console.error(
            `[Vant] BackTop: target element "${target}" was not found, the BackTop component will not be rendered.`,
          );
        }
      } else {
        return target as Element;
      }
    };

    const updateTarget = () => {
      if (inBrowser) {
        nextTick(() => {
          scrollParent.value = props.target
            ? getTarget()
            : getScrollParent(root.value!);
          scroll();
        });
      }
    };

    useEventListener('scroll', throttle(scroll, 100), { target: scrollParent });

    onMounted(updateTarget);

    onActivated(() => {
      if (shouldReshow) {
        show.value = true;
        shouldReshow = false;
      }
    });

    onDeactivated(() => {
      // teleported back-top should be hide when deactivated
      if (show.value && props.teleport) {
        show.value = false;
        shouldReshow = true;
      }
    });

    watch(() => props.target, updateTarget);

    return () => {
      const Content = (
        <div
          ref={!props.teleport ? root : undefined}
          class={bem({ active: show.value })}
          style={style.value}
          onClick={onClick}
          {...attrs}
        >
          {slots.default ? (
            slots.default()
          ) : (
            <Icon name="back-top" class={bem('icon')} />
          )}
        </div>
      );

      if (props.teleport) {
        return [
          <div ref={root} class={bem('placeholder')}></div>,
          <Teleport to={props.teleport}>{Content}</Teleport>,
        ];
      }
      return Content;
    };
  },
});
