import { defineComponent, type ExtractPropTypes } from 'vue';
import { addUnit, numericProp, unknownProp, createNamespace } from '../utils';
import { useCustomFieldValue } from '@vant/use';
import { Loading } from '../loading';

const [name, bem] = createNamespace('switch');

/**
 * @summary Switch 开关 - 用于在打开和关闭状态之间进行切换
 * @attr {any} v-model - 开关选中状态
 * @attr {boolean} loading - 是否为加载状态，默认 false
 * @attr {boolean} disabled - 是否为禁用状态，默认 false
 * @attr {number|string} size - 开关尺寸，默认 30px
 * @attr {string} active-color - 打开时的背景色
 * @attr {string} inactive-color - 关闭时的背景色
 * @attr {any} active-value - 打开时的值，默认 true
 * @attr {any} inactive-value - 关闭时的值，默认 false
 * @slot node - 自定义按钮内容
 * @event change - 开关状态切换时触发，参数：value: any
 * @event update:model-value - 开关状态变化时触发，参数：value: any
 */
export const switchProps = {
  size: numericProp,
  loading: Boolean,
  disabled: Boolean,
  modelValue: unknownProp,
  activeColor: String,
  inactiveColor: String,
  activeValue: {
    type: unknownProp,
    default: true as unknown,
  },
  inactiveValue: {
    type: unknownProp,
    default: false as unknown,
  },
};

export type SwitchProps = ExtractPropTypes<typeof switchProps>;

export default defineComponent({
  name,

  props: switchProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const isChecked = () => props.modelValue === props.activeValue;

    const onClick = () => {
      if (!props.disabled && !props.loading) {
        const newValue = isChecked() ? props.inactiveValue : props.activeValue;
        emit('update:modelValue', newValue);
        emit('change', newValue);
      }
    };

    const renderLoading = () => {
      if (props.loading) {
        const color = isChecked() ? props.activeColor : props.inactiveColor;
        return <Loading class={bem('loading')} color={color} />;
      }
      if (slots.node) {
        return slots.node();
      }
    };

    useCustomFieldValue(() => props.modelValue);

    return () => {
      const { size, loading, disabled, activeColor, inactiveColor } = props;
      const checked = isChecked();
      const style = {
        fontSize: addUnit(size),
        backgroundColor: checked ? activeColor : inactiveColor,
      };

      return (
        <div
          role="switch"
          class={bem({
            on: checked,
            loading,
            disabled,
          })}
          style={style}
          tabindex={disabled ? undefined : 0}
          aria-checked={checked}
          onClick={onClick}
        >
          <div class={bem('node')}>{renderLoading()}</div>
          {slots.background?.()}
        </div>
      );
    };
  },
});
