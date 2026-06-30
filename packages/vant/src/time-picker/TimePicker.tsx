import {
  computed,
  defineComponent,
  ref,
  watch,
  type ExtractPropTypes,
  type PropType,
  type ComponentPublicInstance,
} from 'vue';

// Utils
import {
  formatValueRange,
  genOptions,
  pickerInheritKeys,
  sharedProps,
} from '../date-picker/utils';
import {
  pick,
  extend,
  isSameValue,
  makeNumericProp,
  createNamespace,
} from '../utils';

// Composables
import { useExpose } from '../composables/use-expose';

// Components
import { Picker, PickerInstance } from '../picker';

const [name] = createNamespace('time-picker');

export type TimePickerColumnType = 'hour' | 'minute' | 'second';

const validateTime = (val: string) =>
  /^([01]\d|2[0-3]):([0-5]\d):([0-5]\d)$/.test(val);
const fullColumns: TimePickerColumnType[] = ['hour', 'minute', 'second'];

/**
 * @summary TimePicker 时间选择 - 时间选择器，通常与弹出层组件配合使用
 * @attr {string[]} v-model - 当前选中的时间
 * @attr {string[]} columns-type - 选项类型，由 hour、minute 和 second 组成的数组，默认 ['hour', 'minute']
 * @attr {number|string} min-hour - 可选的最小小时，默认 0
 * @attr {number|string} max-hour - 可选的最大小时，默认 23
 * @attr {number|string} min-minute - 可选的最小分钟，默认 0
 * @attr {number|string} max-minute - 可选的最大分钟，默认 59
 * @attr {number|string} min-second - 可选的最小秒数，默认 0
 * @attr {number|string} max-second - 可选的最大秒数，默认 59
 * @attr {string} min-time - 可选的最小时间，格式参考 07:40:00，使用时 min-hour min-minute min-second 不会生效
 * @attr {string} max-time - 可选的最大时间，格式参考 10:20:00，使用时 max-hour max-minute max-second 不会生效
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
export const timePickerProps = extend({}, sharedProps, {
  minHour: makeNumericProp(0),
  maxHour: makeNumericProp(23),
  minMinute: makeNumericProp(0),
  maxMinute: makeNumericProp(59),
  minSecond: makeNumericProp(0),
  maxSecond: makeNumericProp(59),
  minTime: {
    type: String,
    validator: validateTime,
  },
  maxTime: {
    type: String,
    validator: validateTime,
  },
  columnsType: {
    type: Array as PropType<TimePickerColumnType[]>,
    default: () => ['hour', 'minute'],
  },
});

export type TimePickerProps = ExtractPropTypes<typeof timePickerProps>;

export type TimePickerExpose = {
  confirm: () => void;
  getSelectedTime: () => string[];
};

export type TimePickerInstance = ComponentPublicInstance<
  TimePickerProps,
  TimePickerExpose
>;

export default defineComponent({
  name,

  props: timePickerProps,

  emits: ['confirm', 'cancel', 'change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const currentValues = ref<string[]>(props.modelValue);
    const pickerRef = ref<PickerInstance>();

    const getValidTime = (time: string) => {
      const timeLimitArr = time.split(':');
      return fullColumns.map((col, i) =>
        props.columnsType.includes(col) ? timeLimitArr[i] : '00',
      );
    };

    const confirm = () => pickerRef.value?.confirm();

    const getSelectedTime = () => currentValues.value;

    const columns = computed(() => {
      let { minHour, maxHour, minMinute, maxMinute, minSecond, maxSecond } =
        props;

      if (props.minTime || props.maxTime) {
        const fullTime: Record<TimePickerColumnType, string | number> = {
          hour: 0,
          minute: 0,
          second: 0,
        };
        props.columnsType.forEach((col, i) => {
          fullTime[col] = currentValues.value[i] ?? 0;
        });
        const { hour, minute } = fullTime;
        if (props.minTime) {
          const [minH, minM, minS] = getValidTime(props.minTime);
          minHour = minH;
          minMinute = +hour <= +minHour ? minM : '00';
          minSecond = +hour <= +minHour && +minute <= +minMinute ? minS : '00';
        }
        if (props.maxTime) {
          const [maxH, maxM, maxS] = getValidTime(props.maxTime);
          maxHour = maxH;
          maxMinute = +hour >= +maxHour ? maxM : '59';
          maxSecond = +hour >= +maxHour && +minute >= +maxMinute ? maxS : '59';
        }
      }

      return props.columnsType.map((type) => {
        const { filter, formatter } = props;
        switch (type) {
          case 'hour':
            return genOptions(
              +minHour,
              +maxHour,
              type,
              formatter,
              filter,
              currentValues.value,
            );
          case 'minute':
            return genOptions(
              +minMinute,
              +maxMinute,
              type,
              formatter,
              filter,
              currentValues.value,
            );
          case 'second':
            return genOptions(
              +minSecond,
              +maxSecond,
              type,
              formatter,
              filter,
              currentValues.value,
            );
          default:
            if (process.env.NODE_ENV !== 'production') {
              throw new Error(
                `[Vant] TimePicker: unsupported columns type: ${type}`,
              );
            }
            return [];
        }
      });
    });

    watch(currentValues, (newValues) => {
      if (!isSameValue(newValues, props.modelValue)) {
        emit('update:modelValue', newValues);
      }
    });

    watch(
      () => props.modelValue,
      (newValues) => {
        newValues = formatValueRange(newValues, columns.value);
        if (!isSameValue(newValues, currentValues.value)) {
          currentValues.value = newValues;
        }
      },
      { immediate: true },
    );

    const onChange = (...args: unknown[]) => emit('change', ...args);
    const onCancel = (...args: unknown[]) => emit('cancel', ...args);
    const onConfirm = (...args: unknown[]) => emit('confirm', ...args);

    useExpose<TimePickerExpose>({ confirm, getSelectedTime });

    return () => (
      <Picker
        ref={pickerRef}
        v-model={currentValues.value}
        v-slots={slots}
        columns={columns.value}
        onChange={onChange}
        onCancel={onCancel}
        onConfirm={onConfirm}
        {...pick(props, pickerInheritKeys)}
      />
    );
  },
});
