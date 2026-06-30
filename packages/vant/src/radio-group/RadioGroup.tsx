import {
  watch,
  defineComponent,
  type PropType,
  type InjectionKey,
  type ExtractPropTypes,
} from 'vue';
import { unknownProp, numericProp, createNamespace } from '../utils';
import { useChildren, useCustomFieldValue } from '@vant/use';

import type { RadioShape } from '../radio';
import type { CheckerDirection } from '../checkbox/Checker';

const [name, bem] = createNamespace('radio-group');

export type RadioGroupDirection = CheckerDirection;

/**
 * @summary RadioGroup 单选框组 - 用于将多个单选框组合在一起
 * @attr {any} v-model - 当前选中项的标识符
 * @attr {boolean} disabled - 是否禁用所有单选框，默认 false
 * @attr {RadioGroupDirection} direction - 排列方向，可选值为 horizontal，默认 vertical
 * @attr {number|string} icon-size - 所有单选框的图标大小，默认单位为 px，默认 20px
 * @attr {string} checked-color - 所有单选框的选中状态颜色，默认 #1989fa
 * @attr {RadioShape} shape - 形状，可选值为 square / dot，默认 round
 * @slot default - 默认插槽，用于放置 Radio
 * @event change - 当绑定值变化时触发的事件，参数：name: string
 */
export const radioGroupProps = {
  shape: String as PropType<RadioShape>,
  disabled: Boolean,
  iconSize: numericProp,
  direction: String as PropType<RadioGroupDirection>,
  modelValue: unknownProp,
  checkedColor: String,
};

export type RadioGroupProps = ExtractPropTypes<typeof radioGroupProps>;

export type RadioGroupProvide = {
  props: RadioGroupProps;
  updateValue: (value: unknown) => void;
};

export const RADIO_KEY: InjectionKey<RadioGroupProvide> = Symbol(name);

export default defineComponent({
  name,

  props: radioGroupProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const { linkChildren } = useChildren(RADIO_KEY);

    const updateValue = (value: unknown) => emit('update:modelValue', value);

    watch(
      () => props.modelValue,
      (value) => emit('change', value),
    );

    linkChildren({
      props,
      updateValue,
    });

    useCustomFieldValue(() => props.modelValue);

    return () => (
      <div class={bem([props.direction])} role="radiogroup">
        {slots.default?.()}
      </div>
    );
  },
});
