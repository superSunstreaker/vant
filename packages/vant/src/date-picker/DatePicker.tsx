import {
  ref,
  watch,
  computed,
  defineComponent,
  type ComponentPublicInstance,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { pick, extend, isDate, isSameValue, createNamespace } from '../utils';
import {
  genOptions,
  sharedProps,
  getMonthEndDay,
  pickerInheritKeys,
  formatValueRange,
} from './utils';

// Composables
import { useExpose } from '../composables/use-expose';

// Components
import { Picker, PickerInstance } from '../picker';

const currentYear = new Date().getFullYear();
const [name] = createNamespace('date-picker');

export type DatePickerColumnType = 'year' | 'month' | 'day';

/**
 * @summary DatePicker 日期选择 - 日期选择器，用于选择年、月、日，通常与弹出层组件配合使用
 * @attr {string[]} v-model - 当前选中的日期，默认 []
 * @attr {string[]} columns-type - 选项类型，由 year、month 和 day 组成的数组，默认 ['year', 'month', 'day']
 * @attr {Date} min-date - 可选的最小时间，精确到日，默认十年前
 * @attr {Date} max-date - 可选的最大时间，精确到日，默认十年后
 * @attr {string} title - 顶部栏标题
 * @attr {string} confirm-button-text - 确认按钮文字，默认 确认
 * @attr {string} cancel-button-text - 取消按钮文字，默认 取消
 * @attr {boolean} show-toolbar - 是否显示顶部栏，默认 true
 * @attr {boolean} loading - 是否显示加载状态，默认 false
 * @attr {boolean} readonly - 是否为只读状态，只读状态下无法切换选项，默认 false
 * @attr {Function} filter - 选项过滤函数
 * @attr {Function} formatter - 选项格式化函数
 * @attr {number|string} option-height - 选项高度，支持 px vw vh rem 单位，默认 44
 * @attr {number|string} visible-option-num - 可见的选项个数，默认 6
 * @attr {number|string} swipe-duration - 快速滑动时惯性滚动的时长，单位 ms，默认 1000
 * @slot toolbar - 自定义整个顶部栏的内容
 * @slot title - 自定义标题内容
 * @slot confirm - 自定义确认按钮内容
 * @slot cancel - 自定义取消按钮内容
 * @slot option - 自定义选项内容
 * @slot columns-top - 自定义选项上方内容
 * @slot columns-bottom - 自定义选项下方内容
 * @event confirm - 点击完成按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event cancel - 点击取消按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event change - 选项改变时触发，参数：{ selectedValues, selectedOptions, selectedIndexes, columnIndex }
 */
export const datePickerProps = extend({}, sharedProps, {
  columnsType: {
    type: Array as PropType<DatePickerColumnType[]>,
    default: () => ['year', 'month', 'day'],
  },
  minDate: {
    type: Date,
    default: () => new Date(currentYear - 10, 0, 1),
    validator: isDate,
  },
  maxDate: {
    type: Date,
    default: () => new Date(currentYear + 10, 11, 31),
    validator: isDate,
  },
});

export type DatePickerExpose = {
  confirm: () => void;
  getSelectedDate: () => string[];
};

export type DatePickerProps = ExtractPropTypes<typeof datePickerProps>;

export type DatePickerInstance = ComponentPublicInstance<
  DatePickerProps,
  DatePickerExpose
>;

export default defineComponent({
  name,

  props: datePickerProps,

  emits: ['confirm', 'cancel', 'change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const currentValues = ref<string[]>(props.modelValue);
    const updatedByExternalSources = ref(false);
    const pickerRef = ref<PickerInstance>();
    const computedValues = computed(() =>
      updatedByExternalSources.value ? props.modelValue : currentValues.value,
    );

    const isMinYear = (year: number) => year === props.minDate.getFullYear();
    const isMaxYear = (year: number) => year === props.maxDate.getFullYear();
    const isMinMonth = (month: number) =>
      month === props.minDate.getMonth() + 1;
    const isMaxMonth = (month: number) =>
      month === props.maxDate.getMonth() + 1;

    const getValue = (type: DatePickerColumnType) => {
      const { minDate, columnsType } = props;
      const index = columnsType.indexOf(type);
      const value = computedValues.value[index];

      if (value) {
        return +value;
      }

      switch (type) {
        case 'year':
          return minDate.getFullYear();
        case 'month':
          return minDate.getMonth() + 1;
        case 'day':
          return minDate.getDate();
      }
    };

    const genYearOptions = () => {
      const minYear = props.minDate.getFullYear();
      const maxYear = props.maxDate.getFullYear();
      return genOptions(
        minYear,
        maxYear,
        'year',
        props.formatter,
        props.filter,
        computedValues.value,
      );
    };

    const genMonthOptions = () => {
      const year = getValue('year');
      const minMonth = isMinYear(year) ? props.minDate.getMonth() + 1 : 1;
      const maxMonth = isMaxYear(year) ? props.maxDate.getMonth() + 1 : 12;

      return genOptions(
        minMonth,
        maxMonth,
        'month',
        props.formatter,
        props.filter,
        computedValues.value,
      );
    };

    const genDayOptions = () => {
      const year = getValue('year');
      const month = getValue('month');
      const minDate =
        isMinYear(year) && isMinMonth(month) ? props.minDate.getDate() : 1;
      const maxDate =
        isMaxYear(year) && isMaxMonth(month)
          ? props.maxDate.getDate()
          : getMonthEndDay(year, month);

      return genOptions(
        minDate,
        maxDate,
        'day',
        props.formatter,
        props.filter,
        computedValues.value,
      );
    };

    const confirm = () => pickerRef.value?.confirm();

    const getSelectedDate = () => currentValues.value;

    const columns = computed(() =>
      props.columnsType.map((type) => {
        switch (type) {
          case 'year':
            return genYearOptions();
          case 'month':
            return genMonthOptions();
          case 'day':
            return genDayOptions();
          default:
            if (process.env.NODE_ENV !== 'production') {
              throw new Error(
                `[Vant] DatePicker: unsupported columns type: ${type}`,
              );
            }
            return [];
        }
      }),
    );

    watch(currentValues, (newValues) => {
      if (!isSameValue(newValues, props.modelValue)) {
        emit('update:modelValue', newValues);
      }
    });

    watch(
      () => props.modelValue,
      (newValues, oldValues) => {
        updatedByExternalSources.value = isSameValue(
          oldValues,
          currentValues.value,
        );
        newValues = formatValueRange(newValues, columns.value);
        if (!isSameValue(newValues, currentValues.value)) {
          currentValues.value = newValues;
        }
        updatedByExternalSources.value = false;
      },
      {
        immediate: true,
      },
    );

    const onChange = (...args: unknown[]) => emit('change', ...args);
    const onCancel = (...args: unknown[]) => emit('cancel', ...args);
    const onConfirm = (...args: unknown[]) => emit('confirm', ...args);

    useExpose<DatePickerExpose>({ confirm, getSelectedDate });

    return () => (
      <Picker
        ref={pickerRef}
        v-slots={slots}
        v-model={currentValues.value}
        columns={columns.value}
        onChange={onChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...pick(props, pickerInheritKeys)}
      />
    );
  },
});
