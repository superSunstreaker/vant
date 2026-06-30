import {
  computed,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';
import { extend, createNamespace } from '../utils';
import { ACTION_BAR_KEY } from '../action-bar/ActionBar';

// Composables
import { useParent } from '@vant/use';
import { useExpose } from '../composables/use-expose';
import { useRoute, routeProps } from '../composables/use-route';

// Components
import { Button, ButtonType } from '../button';

const [name, bem] = createNamespace('action-bar-button');

/**
 * @summary ActionBarButton 动作栏按钮 - 用于在 ActionBar 中放置按钮
 * @attr {string} text - 按钮文字
 * @attr {string} type - 按钮类型，可选值为 primary / success / warning / danger，默认 default
 * @attr {string} color - 按钮颜色，支持传入 linear-gradient 渐变色
 * @attr {string} icon - 左侧图标名称或图片链接
 * @attr {boolean} disabled - 是否禁用按钮，默认 false
 * @attr {boolean} loading - 是否显示为加载状态，默认 false
 * @slot default - 按钮显示内容
 */
export const actionBarButtonProps = extend({}, routeProps, {
  type: String as PropType<ButtonType>,
  text: String,
  icon: String,
  color: String,
  loading: Boolean,
  disabled: Boolean,
});

export type ActionBarButtonProps = ExtractPropTypes<
  typeof actionBarButtonProps
>;

export default defineComponent({
  name,

  props: actionBarButtonProps,

  setup(props, { slots }) {
    const route = useRoute();
    const { parent, index } = useParent(ACTION_BAR_KEY);

    const isFirst = computed(() => {
      if (parent) {
        const prev = parent.children[index.value - 1];
        return !(prev && 'isButton' in prev);
      }
    });

    const isLast = computed(() => {
      if (parent) {
        const next = parent.children[index.value + 1];
        return !(next && 'isButton' in next);
      }
    });

    useExpose({ isButton: true });

    return () => {
      const { type, icon, text, color, loading, disabled } = props;

      return (
        <Button
          class={bem([
            type,
            {
              last: isLast.value,
              first: isFirst.value,
            },
          ])}
          size="large"
          type={type}
          icon={icon}
          color={color}
          loading={loading}
          disabled={disabled}
          onClick={route}
        >
          {slots.default ? slots.default() : text}
        </Button>
      );
    };
  },
});
