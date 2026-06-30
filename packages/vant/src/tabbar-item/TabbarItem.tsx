import {
  computed,
  defineComponent,
  getCurrentInstance,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { createNamespace, extend, isObject, numericProp } from '../utils';
import { TABBAR_KEY } from '../tabbar/Tabbar';

// Composables
import { useParent } from '@vant/use';
import { routeProps, useRoute } from '../composables/use-route';

// Components
import { Icon } from '../icon';
import { Badge, type BadgeProps } from '../badge';

const [name, bem] = createNamespace('tabbar-item');

/**
 * @summary TabbarItem 标签栏项 - 用于放置在 Tabbar 中的单个标签项
 * @attr {number|string} name - 标签名称，作为匹配的标识符，默认当前标签的索引值
 * @attr {string} icon - 图标名称或图片链接
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {boolean} dot - 是否显示图标右上角小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {BadgeProps} badge-props - 自定义徽标的属性，传入的对象会被透传给 Badge 组件的 props
 * @slot icon - 自定义图标
 * @slot default - 自定义文字
 * @event click - 点击时触发
 */
export const tabbarItemProps = extend({}, routeProps, {
  dot: Boolean,
  icon: String,
  name: numericProp,
  badge: numericProp,
  badgeProps: Object as PropType<Partial<BadgeProps>>,
  iconPrefix: String,
});

export type TabbarItemProps = ExtractPropTypes<typeof tabbarItemProps>;

export default defineComponent({
  name,

  props: tabbarItemProps,

  emits: ['click'],

  setup(props, { emit, slots }) {
    const route = useRoute();
    const vm = getCurrentInstance()!.proxy!;
    const { parent, index } = useParent(TABBAR_KEY);

    if (!parent) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[Vant] <TabbarItem> must be a child component of <Tabbar>.',
        );
      }
      return;
    }

    const active = computed(() => {
      const { route, modelValue } = parent.props;

      if (route && '$route' in vm) {
        const { $route } = vm;
        const { to } = props;
        const config = isObject(to) ? to : { path: to };
        return $route.matched.some((val) => {
          const pathMatched = 'path' in config && config.path === val.path;
          const nameMatched = 'name' in config && config.name === val.name;
          return pathMatched || nameMatched;
        });
      }

      return (props.name ?? index.value) === modelValue;
    });

    const onClick = (event: MouseEvent) => {
      if (!active.value) {
        parent.setActive(props.name ?? index.value, route);
      }
      emit('click', event);
    };

    const renderIcon = () => {
      if (slots.icon) {
        return slots.icon({ active: active.value });
      }
      if (props.icon) {
        return <Icon name={props.icon} classPrefix={props.iconPrefix} />;
      }
    };

    return () => {
      const { dot, badge } = props;
      const { activeColor, inactiveColor } = parent.props;
      const color = active.value ? activeColor : inactiveColor;

      return (
        <div
          role="tab"
          class={bem({ active: active.value })}
          style={{ color }}
          tabindex={0}
          aria-selected={active.value}
          onClick={onClick}
        >
          <Badge
            v-slots={{ default: renderIcon }}
            dot={dot}
            class={bem('icon')}
            content={badge}
            {...props.badgeProps}
          />
          <div class={bem('text')}>
            {slots.default?.({ active: active.value })}
          </div>
        </div>
      );
    };
  },
});
