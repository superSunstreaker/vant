import {
  ref,
  watch,
  computed,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  pick,
  extend,
  makeArrayProp,
  makeNumericProp,
  createNamespace,
} from '../utils';
import { pickerSharedProps } from '../picker/Picker';
import { INHERIT_PROPS, INHERIT_SLOTS, formatDataForCascade } from './utils';

// Composables
import { useExpose } from '../composables/use-expose';

// Components
import { Picker, type PickerInstance } from '../picker';

// Types
import type { AreaList } from './types';
import type { PickerExpose } from '../picker/types';

const [name, bem] = createNamespace('area');

/**
 * @summary Area 省市区选择 - 省市区三级联动选择，通常与弹出层组件配合使用
 * @attr {string} v-model - 当前选中项对应的地区码
 * @attr {string} title - 顶部栏标题
 * @attr {string} confirm-button-text - 确认按钮文字，默认 确认
 * @attr {string} cancel-button-text - 取消按钮文字，默认 取消
 * @attr {object} area-list - 省市区数据，默认 {}
 * @attr {string[]} columns-placeholder - 列占位提示文字，默认 []
 * @attr {boolean} loading - 是否显示加载状态，默认 false
 * @attr {boolean} readonly - 是否为只读状态，只读状态下无法切换选项，默认 false
 * @attr {number|string} option-height - 选项高度，支持 px vw vh rem 单位，默认 44
 * @attr {number|string} columns-num - 显示列数，3-省市区，2-省市，1-省，默认 3
 * @attr {number|string} visible-option-num - 可见的选项个数，默认 6
 * @attr {number|string} swipe-duration - 快速滑动时惯性滚动的时长，单位 ms，默认 1000
 * @slot toolbar - 自定义整个顶部栏的内容
 * @slot title - 自定义标题内容
 * @slot confirm - 自定义确认按钮内容
 * @slot cancel - 自定义取消按钮内容
 * @slot columns-top - 自定义选项上方内容
 * @slot columns-bottom - 自定义选项下方内容
 * @event confirm - 点击完成按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event cancel - 点击取消按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event change - 选项改变时触发，参数：{ selectedValues, selectedOptions, selectedIndexes, columnIndex }
 */
export const areaProps = extend({}, pick(pickerSharedProps, INHERIT_PROPS), {
  modelValue: String,
  columnsNum: makeNumericProp(3),
  columnsPlaceholder: makeArrayProp<string>(),
  areaList: {
    type: Object as PropType<AreaList>,
    default: () => ({}),
  },
});

export type AreaProps = ExtractPropTypes<typeof areaProps>;

export default defineComponent({
  name,

  props: areaProps,

  emits: ['change', 'confirm', 'cancel', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const codes = ref<string[]>([]);
    const picker = ref<PickerInstance>();

    const columns = computed(() => formatDataForCascade(props));
    const onChange = (...args: unknown[]) => emit('change', ...args);
    const onCancel = (...args: unknown[]) => emit('cancel', ...args);
    const onConfirm = (...args: unknown[]) => emit('confirm', ...args);

    watch(
      codes,
      (newCodes) => {
        const lastCode = newCodes.length ? newCodes[newCodes.length - 1] : '';
        if (lastCode && lastCode !== props.modelValue) {
          emit('update:modelValue', lastCode);
        }
      },
      { deep: true },
    );

    watch(
      () => props.modelValue,
      (newCode) => {
        if (newCode) {
          const lastCode = codes.value.length
            ? codes.value[codes.value.length - 1]
            : '';
          if (newCode !== lastCode) {
            codes.value = [
              `${newCode.slice(0, 2)}0000`,
              `${newCode.slice(0, 4)}00`,
              newCode,
            ].slice(0, +props.columnsNum);
          }
        } else {
          codes.value = [];
        }
      },
      { immediate: true },
    );

    useExpose<PickerExpose>({
      confirm: () => picker.value?.confirm(),
      getSelectedOptions: () => picker.value?.getSelectedOptions() || [],
    });

    return () => (
      <Picker
        ref={picker}
        v-model={codes.value}
        v-slots={pick(slots, INHERIT_SLOTS)}
        class={bem()}
        columns={columns.value}
        onChange={onChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...pick(props, INHERIT_PROPS)}
      />
    );
  },
});
