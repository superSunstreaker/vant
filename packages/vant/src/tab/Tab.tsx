import {
  ref,
  watch,
  computed,
  nextTick,
  watchEffect,
  defineComponent,
  getCurrentInstance,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';
// eslint-disable-next-line vue/prefer-import-from-vue
import { normalizeClass, normalizeStyle, stringifyStyle } from '@vue/shared';

// Utils
import {
  pick,
  extend,
  truthProp,
  unknownProp,
  numericProp,
  createNamespace,
  ComponentInstance,
} from '../utils';
import { TABS_KEY } from '../tabs/Tabs';

// Composables
import { doubleRaf, useParent } from '@vant/use';
import { useId } from '../composables/use-id';
import { useExpose } from '../composables/use-expose';
import { routeProps } from '../composables/use-route';
import { useProvideTabStatus } from '../composables/use-tab-status';

// Components
import { TabTitle } from './TabTitle';
import { SwipeItem } from '../swipe-item';

const [name, bem] = createNamespace('tab');

/**
 * @summary Tab 标签页 - 用于放置在 Tabs 中的单个标签页
 * @attr {string} title - 标题
 * @attr {number|string} name - 标签名称，作为匹配的标识符
 * @attr {boolean} disabled - 是否禁用该项，默认 false
 * @attr {boolean} dot - 是否在标题右上角显示小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {boolean} show-zero-badge - 当 badge 为数字 0 或字符串 '0' 时，是否展示徽标，默认 true
 * @attr {string|object} title-class - 标题额外类名
 * @attr {string|object} title-style - 标题额外样式
 * @slot default - 标签页内容
 * @slot title - 自定义标题内容
 */
export const tabProps = extend({}, routeProps, {
  dot: Boolean,
  name: numericProp,
  badge: numericProp,
  title: String,
  disabled: Boolean,
  titleClass: unknownProp,
  titleStyle: [String, Object] as PropType<string | CSSProperties>,
  showZeroBadge: truthProp,
});

export type TabProps = ExtractPropTypes<typeof tabProps>;

export default defineComponent({
  name,

  props: tabProps,

  setup(props, { slots }) {
    const id = useId();
    const inited = ref(false);
    const instance = getCurrentInstance();
    const { parent, index } = useParent(TABS_KEY);

    if (!parent) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Vant] <Tab> must be a child component of <Tabs>.');
      }
      return;
    }

    const getName = () => props.name ?? index.value;

    const init = () => {
      inited.value = true;

      if (parent.props.lazyRender) {
        nextTick(() => {
          parent.onRendered(getName(), props.title);
        });
      }
    };

    const active = computed(() => {
      const isActive = getName() === parent.currentName.value;

      if (isActive && !inited.value) {
        init();
      }

      return isActive;
    });

    // see: https://github.com/vant-ui/vant/issues/11763
    const parsedClass = ref('');
    const parsedStyle = ref<string | undefined>('');
    watchEffect(() => {
      const { titleClass, titleStyle } = props;
      parsedClass.value = titleClass ? normalizeClass(titleClass) : '';
      parsedStyle.value =
        titleStyle && typeof titleStyle !== 'string'
          ? stringifyStyle(normalizeStyle(titleStyle))
          : titleStyle;
    });

    const renderTitle = (
      onClickTab: (
        instance: ComponentInstance,
        index: number,
        event: MouseEvent,
      ) => void,
    ) => (
      <TabTitle
        key={id}
        v-slots={{ title: slots.title }}
        id={`${parent.id}-${index.value}`}
        ref={parent.setTitleRefs(index.value)}
        style={parsedStyle.value}
        class={parsedClass.value}
        isActive={active.value}
        controls={id}
        scrollable={parent.scrollable.value}
        activeColor={parent.props.titleActiveColor}
        inactiveColor={parent.props.titleInactiveColor}
        onClick={(event: MouseEvent) =>
          onClickTab(instance!.proxy!, index.value, event)
        }
        {...pick(parent.props, ['type', 'color', 'shrink'])}
        {...pick(props, ['dot', 'badge', 'title', 'disabled', 'showZeroBadge'])}
      />
    );

    const hasInactiveClass = ref(!active.value);

    watch(active, (val) => {
      if (val) {
        hasInactiveClass.value = false;
      } else {
        // mark tab as inactive until the active tab is rendered
        // to avoid incorrect scroll position or other render issue
        // https://github.com/youzan/vant/issues/11050
        doubleRaf(() => {
          hasInactiveClass.value = true;
        });
      }
    });

    watch(
      () => props.title,
      () => {
        parent.setLine();
        parent.scrollIntoView();
      },
    );

    useProvideTabStatus(active);

    useExpose({
      id,
      renderTitle,
    });

    return () => {
      const label = `${parent.id}-${index.value}`;
      const { animated, swipeable, scrollspy, lazyRender } = parent.props;

      if (!slots.default && !animated) {
        return;
      }

      const show = scrollspy || active.value;

      if (animated || swipeable) {
        return (
          <SwipeItem
            id={id}
            role="tabpanel"
            class={bem('panel-wrapper', { inactive: hasInactiveClass.value })}
            tabindex={active.value ? 0 : -1}
            aria-hidden={!active.value}
            aria-labelledby={label}
            data-allow-mismatch="attribute"
          >
            <div class={bem('panel')}>{slots.default?.()}</div>
          </SwipeItem>
        );
      }

      const shouldRender = inited.value || scrollspy || !lazyRender;
      const Content = shouldRender ? slots.default?.() : null;

      return (
        <div
          v-show={show}
          id={id}
          role="tabpanel"
          class={bem('panel')}
          tabindex={show ? 0 : -1}
          aria-labelledby={label}
          data-allow-mismatch="attribute"
        >
          {Content}
        </div>
      );
    };
  },
});
