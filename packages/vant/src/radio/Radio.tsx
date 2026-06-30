import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import { pick, extend, createNamespace } from '../utils';
import { RADIO_KEY } from '../radio-group/RadioGroup';

// Composables
import { useParent } from '@vant/use';

// Components
import Checker, {
  checkerProps,
  type CheckerShape,
  type CheckerLabelPosition,
} from '../checkbox/Checker';

export type RadioShape = CheckerShape | 'dot';

/**
 * @summary Radio 单选框 - 在一组备选项中进行单选
 * @attr {any} name - 标识符，通常为一个唯一的字符串或数字
 * @attr {RadioShape} shape - 形状，可选值为 square / dot，默认 round
 * @attr {boolean} disabled - 是否为禁用状态，默认 false
 * @attr {boolean} label-disabled - 是否禁用文本内容点击，默认 false
 * @attr {string} label-position - 文本位置，可选值为 left，默认 right
 * @attr {number|string} icon-size - 图标大小，默认单位为 px，默认 20px
 * @attr {string} checked-color - 选中状态颜色，默认 #1989fa
 * @slot default - 自定义文本
 * @slot icon - 自定义图标
 */
export const radioProps = extend({}, checkerProps, {
  shape: String as PropType<RadioShape>,
});

export type RadioLabelPosition = CheckerLabelPosition;
export type RadioProps = ExtractPropTypes<typeof radioProps>;

const [name, bem] = createNamespace('radio');

export default defineComponent({
  name,

  props: radioProps,

  emits: ['update:modelValue'],

  setup(props, { emit, slots }) {
    const { parent } = useParent(RADIO_KEY);

    const checked = () => {
      const value = parent ? parent.props.modelValue : props.modelValue;
      return value === props.name;
    };

    const toggle = () => {
      if (parent) {
        parent.updateValue(props.name);
      } else {
        emit('update:modelValue', props.name);
      }
    };

    return () => (
      <Checker
        v-slots={pick(slots, ['default', 'icon'])}
        bem={bem}
        role="radio"
        parent={parent}
        checked={checked()}
        onToggle={toggle}
        {...props}
      />
    );
  },
});
