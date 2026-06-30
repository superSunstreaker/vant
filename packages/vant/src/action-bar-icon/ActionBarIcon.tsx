import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';
import { extend, createNamespace, unknownProp, numericProp } from '../utils';
import { ACTION_BAR_KEY } from '../action-bar/ActionBar';

// Composables
import { useParent } from '@vant/use';
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Icon } from '../icon';
import { Badge, type BadgeProps } from '../badge';

const [name, bem] = createNamespace('action-bar-icon');

/**
 * @summary ActionBarIcon 动作栏图标 - 用于在 ActionBar 中放置图标按钮
 * @attr {string} text - 按钮文字
 * @attr {string} icon - 图标
 * @attr {string} color - 图标颜色，默认 #323233
 * @attr {string|Array|object} icon-class - 图标额外类名
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {boolean} dot - 是否显示图标右上角小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {BadgeProps} badge-props - 自定义徽标的属性，传入的对象会被透传给 Badge 组件的 props
 * @attr {boolean} disabled - 是否禁用图标，默认 false
 * @slot default - 文本内容
 * @slot icon - 自定义图标
 */
export const actionBarIconProps = extend({}, routeProps, {
  dot: Boolean,
  text: String,
  icon: String,
  color: String,
  badge: numericProp,
  iconClass: unknownProp,
  badgeProps: Object as PropType<Partial<BadgeProps>>,
  iconPrefix: String,
  disabled: Boolean,
});

export type ActionBarIconProps = ExtractPropTypes<typeof actionBarIconProps>;

export default defineComponent({
  name,

  props: actionBarIconProps,

  setup(props, { slots }) {
    const route = useRoute();

    useParent(ACTION_BAR_KEY);

    const renderIcon = () => {
      const { dot, badge, icon, color, iconClass, badgeProps, iconPrefix } =
        props;

      if (slots.icon) {
        return (
          <Badge
            v-slots={{ default: slots.icon }}
            dot={dot}
            class={bem('icon')}
            content={badge}
            {...badgeProps}
          />
        );
      }

      return (
        <Icon
          tag="div"
          dot={dot}
          name={icon}
          badge={badge}
          color={color}
          class={[bem('icon'), iconClass]}
          badgeProps={badgeProps}
          classPrefix={iconPrefix}
        />
      );
    };

    const onClick = () => {
      if (!props.disabled) {
        route();
      }
    };

    return () => (
      <div
        role="button"
        class={bem({ disabled: props.disabled })}
        tabindex={props.disabled ? -1 : 0}
        onClick={onClick}
      >
        {renderIcon()}
        {slots.default ? slots.default() : props.text}
      </div>
    );
  },
});
