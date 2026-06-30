import {
  watch,
  defineComponent,
  type PropType,
  type InjectionKey,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  numericProp,
  makeArrayProp,
  makeStringProp,
  createNamespace,
} from '../utils';

// Composables
import { useChildren, useCustomFieldValue } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Types
import type { CheckerShape, CheckerDirection } from '../checkbox/Checker';
import type {
  CheckboxGroupExpose,
  CheckboxGroupProvide,
  CheckboxGroupToggleAllOptions,
} from './types';

const [name, bem] = createNamespace('checkbox-group');

/**
 * @summary CheckboxGroup 复选框组 - 用于将多个复选框组合在一起
 * @attr {any[]} v-model - 所有选中项的标识符
 * @attr {boolean} disabled - 是否禁用所有复选框，默认 false
 * @attr {number|string} max - 最大可选数，0 为无限制，默认 0
 * @attr {string} direction - 排列方向，可选值为 horizontal，默认 vertical
 * @attr {number|string} icon-size - 所有复选框的图标大小，默认单位为 px，默认 20px
 * @attr {string} checked-color - 所有复选框的选中状态颜色，默认 #1989fa
 * @attr {string} shape - 形状，可选值为 square，默认 round
 * @slot default - 默认插槽，用于放置 Checkbox
 * @event change - 当绑定值变化时触发的事件，参数：names: any[]
 */
export const checkboxGroupProps = {
  max: numericProp,
  shape: makeStringProp<CheckerShape>('round'),
  disabled: Boolean,
  iconSize: numericProp,
  direction: String as PropType<CheckerDirection>,
  modelValue: makeArrayProp<unknown>(),
  checkedColor: String,
};

export type CheckboxGroupProps = ExtractPropTypes<typeof checkboxGroupProps>;

export const CHECKBOX_GROUP_KEY: InjectionKey<CheckboxGroupProvide> =
  Symbol(name);

export default defineComponent({
  name,

  props: checkboxGroupProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const { children, linkChildren } = useChildren(CHECKBOX_GROUP_KEY);

    const updateValue = (value: unknown[]) => emit('update:modelValue', value);

    const toggleAll = (options: CheckboxGroupToggleAllOptions = {}) => {
      if (typeof options === 'boolean') {
        options = { checked: options };
      }

      const { checked, skipDisabled } = options;

      const checkedChildren = children.filter((item: any) => {
        if (!item.props.bindGroup) {
          return false;
        }
        if (item.props.disabled && skipDisabled) {
          return item.checked.value;
        }
        return checked ?? !item.checked.value;
      });

      const names = checkedChildren.map((item: any) => item.name);
      updateValue(names);
    };

    watch(
      () => props.modelValue,
      (value) => emit('change', value),
    );

    useExpose<CheckboxGroupExpose>({ toggleAll });
    useCustomFieldValue(() => props.modelValue);
    linkChildren({
      props,
      updateValue,
    });

    return () => <div class={bem([props.direction])}>{slots.default?.()}</div>;
  },
});
