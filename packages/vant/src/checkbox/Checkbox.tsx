import {
  watch,
  computed,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { pick, extend, truthProp, createNamespace } from '../utils';
import { CHECKBOX_GROUP_KEY } from '../checkbox-group/CheckboxGroup';

// Composables
import { useParent, useCustomFieldValue } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Components
import Checker, { checkerProps, type CheckerShape } from './Checker';

// Types
import type { CheckboxExpose } from './types';

const [name, bem] = createNamespace('checkbox');

/**
 * @summary Checkbox 复选框 - 在一组备选项中进行多选
 * @attr {boolean} v-model - 是否为选中状态，默认 false
 * @attr {any} name - 标识符，通常为一个唯一的字符串或数字
 * @attr {string} shape - 形状，可选值为 square，默认 round
 * @attr {boolean} disabled - 是否禁用复选框，默认 false
 * @attr {boolean} label-disabled - 是否禁用复选框文本点击，默认 false
 * @attr {string} label-position - 文本位置，可选值为 left，默认 right
 * @attr {number|string} icon-size - 图标大小，默认单位为 px，默认 20px
 * @attr {string} checked-color - 选中状态颜色，默认 #1989fa
 * @attr {boolean} bind-group - 是否与复选框组绑定，默认 true
 * @attr {boolean} indeterminate - 是否为不确定状态，默认 false
 * @slot default - 自定义文本
 * @slot icon - 自定义图标
 * @event change - 当绑定值变化时触发的事件，参数：checked: boolean
 */
export const checkboxProps = extend({}, checkerProps, {
  shape: String as PropType<CheckerShape>,
  bindGroup: truthProp,
  indeterminate: {
    type: Boolean as PropType<boolean | null>,
    default: null,
  },
});

export type CheckboxProps = ExtractPropTypes<typeof checkboxProps>;

export default defineComponent({
  name,

  props: checkboxProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const { parent } = useParent(CHECKBOX_GROUP_KEY);

    const setParentValue = (checked: boolean) => {
      const { name } = props;
      const { max, modelValue } = parent!.props;
      const value = modelValue.slice();

      if (checked) {
        const overlimit = max && value.length >= +max;

        if (!overlimit && !value.includes(name)) {
          value.push(name);

          if (props.bindGroup) {
            parent!.updateValue(value);
          }
        }
      } else {
        const index = value.indexOf(name);

        if (index !== -1) {
          value.splice(index, 1);

          if (props.bindGroup) {
            parent!.updateValue(value);
          }
        }
      }
    };

    const checked = computed(() => {
      if (parent && props.bindGroup) {
        return parent.props.modelValue.indexOf(props.name) !== -1;
      }
      return !!props.modelValue;
    });

    const toggle = (newValue = !checked.value) => {
      if (parent && props.bindGroup) {
        setParentValue(newValue);
      } else {
        emit('update:modelValue', newValue);
      }

      if (props.indeterminate !== null) emit('change', newValue);
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (props.indeterminate === null) emit('change', value);
      },
    );

    useExpose<CheckboxExpose>({ toggle, props, checked });
    useCustomFieldValue(() => props.modelValue);

    return () => (
      <Checker
        v-slots={pick(slots, ['default', 'icon'])}
        bem={bem}
        role="checkbox"
        parent={parent}
        checked={checked.value}
        onToggle={toggle}
        {...props}
      />
    );
  },
});
