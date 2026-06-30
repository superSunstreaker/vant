import {
  ref,
  defineComponent,
  Teleport,
  Transition,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
  type TeleportProps,
} from 'vue';

// Utils
import {
  isDef,
  extend,
  truthProp,
  numericProp,
  unknownProp,
  preventDefault,
  createNamespace,
  getZIndexStyle,
} from '../utils';

// Composables
import { useEventListener } from '@vant/use';
import { useLazyRender } from '../composables/use-lazy-render';

const [name, bem] = createNamespace('overlay');

/**
 * @summary Overlay 遮罩层 - 创建一个遮罩层，用于强调特定的页面元素，并阻止用户进行其他操作
 * @attr {boolean} show - 是否展示遮罩层，默认 false
 * @attr {number|string} z-index - z-index 层级，默认 1
 * @attr {number|string} duration - 动画时长，单位秒，设置为 0 可以禁用动画，默认 0.3
 * @attr {string} class-name - 自定义类名
 * @attr {object} custom-style - 自定义样式
 * @attr {boolean} lock-scroll - 是否锁定背景滚动，默认 true
 * @attr {boolean} lazy-render - 是否在显示时才渲染节点，默认 true
 * @attr {string|Element} teleport - 指定挂载的节点
 * @slot default - 默认插槽，用于在遮罩层上方嵌入内容
 */
export const overlayProps = {
  show: Boolean,
  zIndex: numericProp,
  duration: numericProp,
  className: unknownProp,
  lockScroll: truthProp,
  lazyRender: truthProp,
  customStyle: Object as PropType<CSSProperties>,
  teleport: [String, Object] as PropType<TeleportProps['to']>,
};

export type OverlayProps = ExtractPropTypes<typeof overlayProps>;

export default defineComponent({
  name,

  inheritAttrs: false,

  props: overlayProps,

  setup(props, { attrs, slots }) {
    const root = ref<HTMLElement>();
    const lazyRender = useLazyRender(() => props.show || !props.lazyRender);

    const onTouchMove = (event: TouchEvent) => {
      if (props.lockScroll) {
        preventDefault(event, true);
      }
    };

    const renderOverlay = lazyRender(() => {
      const style: CSSProperties = extend(
        getZIndexStyle(props.zIndex),
        props.customStyle,
      );

      if (isDef(props.duration)) {
        style.animationDuration = `${props.duration}s`;
      }

      return (
        <div
          v-show={props.show}
          ref={root}
          style={style}
          class={[bem(), props.className]}
          {...attrs}
        >
          {slots.default?.()}
        </div>
      );
    });

    // useEventListener will set passive to `false` to eliminate the warning of Chrome
    useEventListener('touchmove', onTouchMove, {
      target: root,
    });

    return () => {
      const Content = (
        <Transition
          v-slots={{ default: renderOverlay }}
          name="van-fade"
          appear
        />
      );

      if (props.teleport) {
        return <Teleport to={props.teleport}>{Content}</Teleport>;
      }

      return Content;
    };
  },
});
