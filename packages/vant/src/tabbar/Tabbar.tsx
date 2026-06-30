import {
  ref,
  defineComponent,
  type PropType,
  type InjectionKey,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  truthProp,
  numericProp,
  getZIndexStyle,
  createNamespace,
  callInterceptor,
  makeNumericProp,
  BORDER_TOP_BOTTOM,
  type Numeric,
  type Interceptor,
} from '../utils';

// Composables
import { useChildren } from '@vant/use';
import { usePlaceholder } from '../composables/use-placeholder';

const [name, bem] = createNamespace('tabbar');

/**
 * @summary Tabbar 标签栏 - 底部导航栏，用于在不同页面之间进行切换
 * @attr {number|string} v-model - 当前选中标签的名称或索引值，默认 0
 * @attr {boolean} fixed - 是否固定在底部，默认 true
 * @attr {boolean} border - 是否显示外边框，默认 true
 * @attr {number|string} z-index - 元素 z-index，默认 1
 * @attr {string} active-color - 选中标签的颜色，默认 #1989fa
 * @attr {string} inactive-color - 未选中标签的颜色，默认 #7d7e80
 * @attr {boolean} route - 是否开启路由模式，默认 false
 * @attr {boolean} placeholder - 固定在底部时，是否在标签位置生成一个等高的占位元素，默认 false
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，设置 fixed 时默认开启，默认 false
 * @attr {Function} before-change - 切换标签前的回调函数，返回 false 可阻止切换，支持返回 Promise
 * @slot default - 默认插槽，用于放置 TabbarItem
 * @event change - 切换标签时触发，参数：active: number|string
 */
export const tabbarProps = {
  route: Boolean,
  fixed: truthProp,
  border: truthProp,
  zIndex: numericProp,
  placeholder: Boolean,
  activeColor: String,
  beforeChange: Function as PropType<Interceptor>,
  inactiveColor: String,
  modelValue: makeNumericProp(0),
  safeAreaInsetBottom: {
    type: Boolean as PropType<boolean | null>,
    default: null,
  },
};

export type TabbarProps = ExtractPropTypes<typeof tabbarProps>;

export type TabbarProvide = {
  props: TabbarProps;
  setActive: (active: Numeric, afterChange: () => void) => void;
};

export const TABBAR_KEY: InjectionKey<TabbarProvide> = Symbol(name);

export default defineComponent({
  name,

  props: tabbarProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const root = ref<HTMLElement>();
    const { linkChildren } = useChildren(TABBAR_KEY);
    const renderPlaceholder = usePlaceholder(root, bem);

    // enable safe-area-inset-bottom by default when fixed
    const enableSafeArea = () => props.safeAreaInsetBottom ?? props.fixed;

    const renderTabbar = () => {
      const { fixed, zIndex, border } = props;
      return (
        <div
          ref={root}
          role="tablist"
          style={getZIndexStyle(zIndex)}
          class={[
            bem({ fixed }),
            {
              [BORDER_TOP_BOTTOM]: border,
              'van-safe-area-bottom': enableSafeArea(),
            },
          ]}
        >
          {slots.default?.()}
        </div>
      );
    };

    const setActive = (active: Numeric, afterChange: () => void) => {
      callInterceptor(props.beforeChange, {
        args: [active],
        done() {
          emit('update:modelValue', active);
          emit('change', active);
          afterChange();
        },
      });
    };

    linkChildren({ props, setActive });

    return () => {
      if (props.fixed && props.placeholder) {
        return renderPlaceholder(renderTabbar);
      }
      return renderTabbar();
    };
  },
});
