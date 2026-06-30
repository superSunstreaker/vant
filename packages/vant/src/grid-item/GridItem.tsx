import {
  computed,
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  BORDER,
  extend,
  addUnit,
  numericProp,
  createNamespace,
} from '../utils';
import { GRID_KEY } from '../grid/Grid';

// Composables
import { useParent } from '@vant/use';
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Icon } from '../icon';
import { Badge, type BadgeProps } from '../badge';

const [name, bem] = createNamespace('grid-item');

/**
 * @summary GridItem 宫格项 - 用于放置在 Grid 中的单个宫格
 * @attr {string} text - 文字
 * @attr {string} icon - 图标名称或图片链接
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {string} icon-color - 图标颜色
 * @attr {boolean} dot - 是否显示图标右上角小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {BadgeProps} badge-props - 自定义徽标的属性，传入的对象会被透传给 Badge 组件的 props
 * @slot default - 自定义宫格的所有内容
 * @slot icon - 自定义图标
 * @slot text - 自定义文字
 */
export const gridItemProps = extend({}, routeProps, {
  dot: Boolean,
  text: String,
  icon: String,
  badge: numericProp,
  iconColor: String,
  iconPrefix: String,
  badgeProps: Object as PropType<Partial<BadgeProps>>,
});

export type GridItemProps = ExtractPropTypes<typeof gridItemProps>;

export default defineComponent({
  name,

  props: gridItemProps,

  setup(props, { slots }) {
    const { parent, index } = useParent(GRID_KEY);
    const route = useRoute();

    if (!parent) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[Vant] <GridItem> must be a child component of <Grid>.');
      }
      return;
    }

    const rootStyle = computed(() => {
      const { square, gutter, columnNum } = parent.props;
      const percent = `${100 / +columnNum}%`;
      const style: CSSProperties = {
        flexBasis: percent,
      };

      if (square) {
        style.paddingTop = percent;
      } else if (gutter) {
        const gutterValue = addUnit(gutter);
        style.paddingRight = gutterValue;

        if (index.value >= +columnNum) {
          style.marginTop = gutterValue;
        }
      }

      return style;
    });

    const contentStyle = computed(() => {
      const { square, gutter } = parent.props;

      if (square && gutter) {
        const gutterValue = addUnit(gutter);
        return {
          right: gutterValue,
          bottom: gutterValue,
          height: 'auto',
        };
      }
    });

    const renderIcon = () => {
      if (slots.icon) {
        return (
          <Badge
            v-slots={{ default: slots.icon }}
            dot={props.dot}
            content={props.badge}
            {...props.badgeProps}
          />
        );
      }

      if (props.icon) {
        return (
          <Icon
            dot={props.dot}
            name={props.icon}
            size={parent.props.iconSize}
            badge={props.badge}
            class={bem('icon')}
            color={props.iconColor}
            badgeProps={props.badgeProps}
            classPrefix={props.iconPrefix}
          />
        );
      }
    };

    const renderText = () => {
      if (slots.text) {
        return slots.text();
      }
      if (props.text) {
        return <span class={bem('text')}>{props.text}</span>;
      }
    };

    const renderContent = () => {
      if (slots.default) {
        return slots.default();
      }
      return [renderIcon(), renderText()];
    };

    return () => {
      const { center, border, square, gutter, reverse, direction, clickable } =
        parent.props;

      const classes = [
        bem('content', [
          direction,
          {
            center,
            square,
            reverse,
            clickable,
            surround: border && gutter,
          },
        ]),
        { [BORDER]: border },
      ];

      return (
        <div class={[bem({ square })]} style={rootStyle.value}>
          <div
            role={clickable ? 'button' : undefined}
            class={classes}
            style={contentStyle.value}
            tabindex={clickable ? 0 : undefined}
            onClick={route}
          >
            {renderContent()}
          </div>
        </div>
      );
    };
  },
});
