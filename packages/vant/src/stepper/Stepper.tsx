import {
  ref,
  watch,
  computed,
  nextTick,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  isDef,
  addUnit,
  addNumber,
  truthProp,
  resetScroll,
  Interceptor,
  numericProp,
  formatNumber,
  getSizeStyle,
  preventDefault,
  createNamespace,
  callInterceptor,
  makeNumericProp,
  HAPTICS_FEEDBACK,
  LONG_PRESS_START_TIME,
  type Numeric,
} from '../utils';

// Composables
import { useCustomFieldValue } from '@vant/use';

const [name, bem] = createNamespace('stepper');

const LONG_PRESS_INTERVAL = 200;

const isEqual = (value1?: Numeric, value2?: Numeric) =>
  String(value1) === String(value2);

export type StepperTheme = 'default' | 'round';

/**
 * @summary Stepper 步进器 - 步进器由增加按钮、减少按钮和输入框组成，用于在一定范围内输入、调整数字
 * @attr {number|string} v-model - 当前输入的值
 * @attr {number|string} min - 最小值，默认 1
 * @attr {number|string} max - 最大值
 * @attr {boolean} auto-fixed - 是否自动校正超出限制范围的数值，默认 true
 * @attr {number|string} default-value - 初始值，当 v-model 为空时生效，默认 1
 * @attr {number|string} step - 步长，每次点击时改变的值，默认 1
 * @attr {number|string} name - 标识符，通常为一个唯一的字符串或数字，可以在 change 事件回调参数中获取
 * @attr {number|string} input-width - 输入框宽度，默认单位为 px，默认 32px
 * @attr {number|string} button-size - 按钮大小以及输入框高度，默认单位为 px，默认 28px
 * @attr {number|string} decimal-length - 固定显示的小数位数
 * @attr {StepperTheme} theme - 样式风格，可选值为 round
 * @attr {string} placeholder - 输入框占位提示文字
 * @attr {boolean} integer - 是否只允许输入整数，默认 false
 * @attr {boolean} disabled - 是否禁用步进器，默认 false
 * @attr {boolean} disable-plus - 是否禁用增加按钮，默认 false
 * @attr {boolean} disable-minus - 是否禁用减少按钮，默认 false
 * @attr {boolean} disable-input - 是否禁用输入框，默认 false
 * @attr {Function} before-change - 输入值变化前的回调函数，返回 false 可阻止输入，支持返回 Promise
 * @attr {boolean} show-plus - 是否显示增加按钮，默认 true
 * @attr {boolean} show-minus - 是否显示减少按钮，默认 true
 * @attr {boolean} show-input - 是否显示输入框，默认 true
 * @attr {boolean} long-press - 是否开启长按手势，开启后可以长按增加和减少按钮，默认 true
 * @attr {boolean} allow-empty - 是否允许输入的值为空，设置为 true 后允许传入空字符串，默认 false
 * @event change - 当绑定值变化时触发的事件，参数：value: string, detail: { name: string }
 * @event overlimit - 点击不可用的按钮时触发
 * @event plus - 点击增加按钮时触发
 * @event minus - 点击减少按钮时触发
 * @event focus - 输入框聚焦时触发，参数：event: Event
 * @event blur - 输入框失焦时触发，参数：event: Event
 */
export const stepperProps = {
  min: makeNumericProp(1),
  max: makeNumericProp(Infinity),
  name: makeNumericProp(''),
  step: makeNumericProp(1),
  theme: String as PropType<StepperTheme>,
  integer: Boolean,
  disabled: Boolean,
  showPlus: truthProp,
  showMinus: truthProp,
  showInput: truthProp,
  longPress: truthProp,
  autoFixed: truthProp,
  allowEmpty: Boolean,
  modelValue: numericProp,
  inputWidth: numericProp,
  buttonSize: numericProp,
  placeholder: String,
  disablePlus: Boolean,
  disableMinus: Boolean,
  disableInput: Boolean,
  beforeChange: Function as PropType<Interceptor>,
  defaultValue: makeNumericProp(1),
  decimalLength: numericProp,
};

export type StepperProps = ExtractPropTypes<typeof stepperProps>;

export default defineComponent({
  name,

  props: stepperProps,

  emits: [
    'plus',
    'blur',
    'minus',
    'focus',
    'change',
    'overlimit',
    'update:modelValue',
  ],

  setup(props, { emit }) {
    const format = (value: Numeric, autoFixed = true) => {
      const { min, max, allowEmpty, decimalLength } = props;

      if (allowEmpty && value === '') {
        return value;
      }

      // format scientific number
      if (typeof value === 'number' && String(value).includes('e')) {
        value = value.toFixed(decimalLength ? +decimalLength : 17); // 17 is the max precision of a JS number
      }

      value = formatNumber(String(value), !props.integer);
      value = value === '' ? 0 : +value;
      value = Number.isNaN(value) ? +min : value;

      // whether to format the value entered by the user
      value = autoFixed ? Math.max(Math.min(+max, value), +min) : value;

      // format decimal
      if (isDef(decimalLength)) {
        value = value.toFixed(+decimalLength);
      }

      return value;
    };

    const getInitialValue = () => {
      const defaultValue = props.modelValue ?? props.defaultValue;
      const value = format(defaultValue);

      if (!isEqual(value, props.modelValue)) {
        emit('update:modelValue', value);
      }

      return value;
    };

    let actionType: 'plus' | 'minus';
    const inputRef = ref<HTMLInputElement>();
    const current = ref(getInitialValue());

    const minusDisabled = computed(
      () =>
        props.disabled || props.disableMinus || +current.value <= +props.min,
    );

    const plusDisabled = computed(
      () => props.disabled || props.disablePlus || +current.value >= +props.max,
    );

    const inputStyle = computed(() => ({
      width: addUnit(props.inputWidth),
      height: addUnit(props.buttonSize),
    }));

    const buttonStyle = computed(() => getSizeStyle(props.buttonSize));

    const check = () => {
      const value = format(current.value);
      if (!isEqual(value, current.value)) {
        current.value = value;
      }
    };

    const setValue = (value: Numeric) => {
      if (props.beforeChange) {
        callInterceptor(props.beforeChange, {
          args: [value],
          done() {
            current.value = value;
          },
        });
      } else {
        current.value = value;
      }
    };

    const onChange = () => {
      if (
        (actionType === 'plus' && plusDisabled.value) ||
        (actionType === 'minus' && minusDisabled.value)
      ) {
        emit('overlimit', actionType);
        return;
      }

      const diff = actionType === 'minus' ? -props.step : +props.step;
      const value = format(addNumber(+current.value, diff));

      setValue(value);
      emit(actionType);
    };

    const onInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const { value } = input;
      const { decimalLength } = props;

      let formatted = formatNumber(String(value), !props.integer);

      // limit max decimal length
      if (isDef(decimalLength) && formatted.includes('.')) {
        const pair = formatted.split('.');
        formatted = `${pair[0]}.${pair[1].slice(0, +decimalLength)}`;
      }

      if (props.beforeChange) {
        input.value = String(current.value);
      } else if (!isEqual(value, formatted)) {
        input.value = formatted;
      }

      // prefer number type
      const isNumeric = formatted === String(+formatted);
      setValue(isNumeric ? +formatted : formatted);
    };

    const onFocus = (event: Event) => {
      // readonly not work in legacy mobile safari
      if (props.disableInput) {
        inputRef.value?.blur();
      } else {
        emit('focus', event);
      }
    };

    const onBlur = (event: Event) => {
      const input = event.target as HTMLInputElement;
      const value = format(input.value, props.autoFixed);
      input.value = String(value);
      current.value = value;
      nextTick(() => {
        emit('blur', event);
        resetScroll();
      });
    };

    let isLongPress: boolean;
    let longPressTimer: ReturnType<typeof setTimeout>;

    const longPressStep = () => {
      longPressTimer = setTimeout(() => {
        onChange();
        longPressStep();
      }, LONG_PRESS_INTERVAL);
    };

    const onTouchStart = () => {
      if (props.longPress) {
        isLongPress = false;
        clearTimeout(longPressTimer);
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          onChange();
          longPressStep();
        }, LONG_PRESS_START_TIME);
      }
    };

    const onTouchEnd = (event: TouchEvent) => {
      if (props.longPress) {
        clearTimeout(longPressTimer);
        if (isLongPress) {
          preventDefault(event);
        }
      }
    };

    const onMousedown = (event: MouseEvent) => {
      // fix mobile safari page scroll down issue
      // see: https://github.com/vant-ui/vant/issues/7690
      if (props.disableInput) {
        preventDefault(event);
      }
    };

    const createListeners = (type: typeof actionType) => ({
      onClick: (event: MouseEvent) => {
        // disable double tap scrolling on mobile safari
        preventDefault(event);
        actionType = type;
        onChange();
      },
      onTouchstartPassive: () => {
        actionType = type;
        onTouchStart();
      },
      onTouchend: onTouchEnd,
      onTouchcancel: onTouchEnd,
    });

    watch(
      () => [props.max, props.min, props.integer, props.decimalLength],
      check,
    );

    watch(
      () => props.modelValue,
      (value) => {
        if (!isEqual(value, current.value)) {
          current.value = format(value!);
        }
      },
    );

    watch(current, (value) => {
      emit('update:modelValue', value);
      emit('change', value, { name: props.name });
    });

    useCustomFieldValue(() => props.modelValue);

    return () => (
      <div role="group" class={bem([props.theme])}>
        <button
          v-show={props.showMinus}
          type="button"
          style={buttonStyle.value}
          class={[
            bem('minus', { disabled: minusDisabled.value }),
            { [HAPTICS_FEEDBACK]: !minusDisabled.value },
          ]}
          aria-disabled={minusDisabled.value || undefined}
          {...createListeners('minus')}
        />
        <input
          v-show={props.showInput}
          ref={inputRef}
          type={props.integer ? 'tel' : 'text'}
          role="spinbutton"
          class={bem('input')}
          value={current.value}
          style={inputStyle.value}
          disabled={props.disabled}
          readonly={props.disableInput}
          // set keyboard in modern browsers
          inputmode={props.integer ? 'numeric' : 'decimal'}
          placeholder={props.placeholder}
          autocomplete="off"
          aria-valuemax={props.max}
          aria-valuemin={props.min}
          aria-valuenow={current.value}
          onBlur={onBlur}
          onInput={onInput}
          onFocus={onFocus}
          onMousedown={onMousedown}
        />
        <button
          v-show={props.showPlus}
          type="button"
          style={buttonStyle.value}
          class={[
            bem('plus', { disabled: plusDisabled.value }),
            { [HAPTICS_FEEDBACK]: !plusDisabled.value },
          ]}
          aria-disabled={plusDisabled.value || undefined}
          {...createListeners('plus')}
        />
      </div>
    );
  },
});
