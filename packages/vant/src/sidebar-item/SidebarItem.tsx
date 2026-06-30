import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import { extend, numericProp, createNamespace } from '../utils';
import { SIDEBAR_KEY } from '../sidebar/Sidebar';

// Composables
import { useParent } from '@vant/use';
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Badge, type BadgeProps } from '../badge';

const [name, bem] = createNamespace('sidebar-item');

/**
 * @summary SidebarItem 侧边导航项 - 用于放置在 Sidebar 中的单个导航项
 * @attr {string} title - 内容
 * @attr {boolean} dot - 是否显示右上角小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {BadgeProps} badge-props - 自定义徽标的属性，传入的对象会被透传给 Badge 组件的 props
 * @attr {boolean} disabled - 是否禁用该项，默认 false
 * @slot title - 自定义标题
 * @event click - 点击时触发，参数：index: number
 */
export const sidebarItemProps = extend({}, routeProps, {
  dot: Boolean,
  title: String,
  badge: numericProp,
  disabled: Boolean,
  badgeProps: Object as PropType<Partial<BadgeProps>>,
});

export type SidebarItemProps = ExtractPropTypes<typeof sidebarItemProps>;

export default defineComponent({
  name,

  props: sidebarItemProps,

  emits: ['click'],

  setup(props, { emit, slots }) {
    const route = useRoute();
    const { parent, index } = useParent(SIDEBAR_KEY);

    if (!parent) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(
          '[Vant] <SidebarItem> must be a child component of <Sidebar>.',
        );
      }
      return;
    }

    const onClick = () => {
      if (props.disabled) {
        return;
      }

      emit('click', index.value);
      parent.setActive(index.value);
      route();
    };

    return () => {
      const { dot, badge, title, disabled } = props;
      const selected = index.value === parent.getActive();

      return (
        <div
          role="tab"
          class={bem({ select: selected, disabled })}
          tabindex={disabled ? undefined : 0}
          aria-selected={selected}
          onClick={onClick}
        >
          <Badge
            dot={dot}
            class={bem('text')}
            content={badge}
            {...props.badgeProps}
          >
            {slots.title ? slots.title() : title}
          </Badge>
        </div>
      );
    };
  },
});
