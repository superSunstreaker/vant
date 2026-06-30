import {
  ref,
  watch,
  provide,
  computed,
  nextTick,
  reactive,
  onMounted,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
  type HTMLAttributes,
} from 'vue';

// Utils
import {
  isDef,
  extend,
  addUnit,
  toArray,
  FORM_KEY,
  numericProp,
  unknownProp,
  resetScroll,
  formatNumber,
  preventDefault,
  makeStringProp,
  makeNumericProp,
  createNamespace,
  type ComponentInstance,
  clamp,
} from '../utils';
import {
  cutString,
  runSyncRule,
  endComposing,
  mapInputType,
  isEmptyValue,
  startComposing,
  getRuleMessage,
  resizeTextarea,
  getStringLength,
  runRuleValidator,
} from './utils';
import { cellSharedProps } from '../cell/Cell';

// Composables
import {
  useParent,
  useEventListener,
  CUSTOM_FIELD_INJECTION_KEY,
} from '@vant/use';
import { useId } from '../composables/use-id';
import { useExpose } from '../composables/use-expose';

// Components
import { Icon } from '../icon';
import { Cell } from '../cell';

// Types
import type {
  FieldRule,
  FieldType,
  FieldExpose,
  FieldTextAlign,
  FieldClearTrigger,
  FieldFormatTrigger,
  FieldValidateError,
  FieldAutosizeConfig,
  FieldValidationStatus,
  FieldValidateTrigger,
  FieldFormSharedProps,
  FieldEnterKeyHint,
} from './types';

const [name, bem] = createNamespace('field');

// provide to Search component to inherit
/**
 * @summary Field 输入框 - 用户可以在文本框内输入或编辑文字
 * @attr {number|string} v-model - 当前输入的值
 * @attr {string} label - 输入框左侧文本
 * @attr {string} name - 名称，作为提交表单时的标识符
 * @attr {string} id - 输入框 id，同时会设置 label 的 for 属性
 * @attr {FieldType} type - 输入框类型，支持原生 input 标签的所有 type 属性，额外支持 digit 类型，默认 text
 * @attr {string} size - 大小，可选值为 large / normal
 * @attr {number|string} maxlength - 输入的最大字符数
 * @attr {number} min - 输入框类型为 number 或 digit 时设置可允许的最小值
 * @attr {number} max - 输入框类型为 number 或 digit 时设置可允许的最大值
 * @attr {string} placeholder - 输入框占位提示文字
 * @attr {boolean} border - 是否显示内边框，默认 true
 * @attr {boolean} disabled - 是否禁用输入框，默认 false
 * @attr {boolean} readonly - 是否为只读状态，默认 false
 * @attr {boolean} colon - 是否在 label 后面添加冒号，默认 false
 * @attr {boolean|'auto'} required - 是否显示表单必填星号
 * @attr {boolean} center - 是否使内容垂直居中，默认 false
 * @attr {boolean} clearable - 是否启用清除图标，默认 false
 * @attr {string} clear-icon - 清除图标名称或图片链接，默认 clear
 * @attr {FieldClearTrigger} clear-trigger - 显示清除图标的时机，默认 focus
 * @attr {boolean} clickable - 是否开启点击反馈，默认 false
 * @attr {boolean} is-link - 是否展示右侧箭头并开启点击反馈，默认 false
 * @attr {boolean} autofocus - 是否自动聚焦，默认 false
 * @attr {boolean} show-word-limit - 是否显示字数统计，需要设置 maxlength 属性，默认 false
 * @attr {boolean} error - 是否将输入内容标红，默认 false
 * @attr {string} error-message - 底部错误提示文案
 * @attr {FieldTextAlign} error-message-align - 错误提示文案对齐方式，默认 left
 * @attr {Function} formatter - 输入内容格式化函数
 * @attr {FieldFormatTrigger} format-trigger - 格式化函数触发的时机，默认 onChange
 * @attr {string} arrow-direction - 箭头方向，可选值为 left / up / down，默认 right
 * @attr {string|Array|object} label-class - 左侧文本额外类名
 * @attr {number|string} label-width - 左侧文本宽度，默认单位为 px，默认 6.2em
 * @attr {FieldTextAlign} label-align - 左侧文本对齐方式，可选值为 center / right / top，默认 left
 * @attr {FieldTextAlign} input-align - 输入框对齐方式，可选值为 center / right，默认 left
 * @attr {boolean|FieldAutosizeConfig} autosize - 是否自适应内容高度，只对 textarea 有效，默认 false
 * @attr {string} left-icon - 左侧图标名称或图片链接
 * @attr {string} right-icon - 右侧图标名称或图片链接
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {FieldRule[]} rules - 表单校验规则
 * @attr {string} autocomplete - HTML 原生属性，用于控制自动完成功能
 * @attr {string} autocapitalize - HTML 原生属性，用于控制文本输入时是否自动大写
 * @attr {FieldEnterKeyHint} enterkeyhint - HTML 原生属性，用于控制回车键样式
 * @attr {boolean} spellcheck - HTML 原生属性，用于检查元素的拼写错误
 * @attr {string} autocorrect - HTML 原生属性，仅 Safari 适用，用于自动更正输入的文本
 * @attr {string} inputmode - HTML 原生属性，用于指定输入框的输入模式
 * @attr {number|string} rows - HTML 原生属性，用于指定输入框的可见文本行数，只对 textarea 有效
 * @slot label - 自定义输入框左侧文本
 * @slot input - 自定义输入框，使用此插槽后，与输入框相关的属性和事件将失效
 * @slot left-icon - 自定义输入框头部图标
 * @slot right-icon - 自定义输入框尾部图标
 * @slot button - 自定义输入框尾部按钮
 * @slot error-message - 自定义底部错误提示文案
 * @slot extra - 自定义输入框最右侧的额外内容
 * @event blur - 输入框失去焦点时触发，参数：event: Event
 * @event focus - 输入框获得焦点时触发，参数：event: Event
 * @event clear - 点击清除按钮时触发，参数：event: MouseEvent
 * @event click-input - 点击输入区域时触发，参数：event: MouseEvent
 * @event click-left-icon - 点击左侧图标时触发，参数：event: MouseEvent
 * @event click-right-icon - 点击右侧图标时触发，参数：event: MouseEvent
 * @event start-validate - 开始表单校验时触发
 * @event end-validate - 结束表单校验时触发，参数：{ status: string, message: string }
 */
export const fieldSharedProps = {
  id: String,
  name: String,
  leftIcon: String,
  rightIcon: String,
  autofocus: Boolean,
  clearable: Boolean,
  maxlength: numericProp,
  max: Number,
  min: Number,
  formatter: Function as PropType<(value: string) => string>,
  clearIcon: makeStringProp('clear'),
  modelValue: makeNumericProp(''),
  inputAlign: String as PropType<FieldTextAlign>,
  placeholder: String,
  autocomplete: String,
  autocapitalize: String,
  autocorrect: String,
  errorMessage: String,
  enterkeyhint: String as PropType<FieldEnterKeyHint>,
  clearTrigger: makeStringProp<FieldClearTrigger>('focus'),
  formatTrigger: makeStringProp<FieldFormatTrigger>('onChange'),
  spellcheck: {
    type: Boolean,
    default: null,
  },
  error: {
    type: Boolean,
    default: null,
  },
  disabled: {
    type: Boolean,
    default: null,
  },
  readonly: {
    type: Boolean,
    default: null,
  },
  inputmode: String as PropType<HTMLAttributes['inputmode']>,
};

export const fieldProps = extend({}, cellSharedProps, fieldSharedProps, {
  rows: numericProp,
  type: makeStringProp<FieldType>('text'),
  rules: Array as PropType<FieldRule[]>,
  autosize: [Boolean, Object] as PropType<boolean | FieldAutosizeConfig>,
  labelWidth: numericProp,
  labelClass: unknownProp,
  labelAlign: String as PropType<FieldTextAlign>,
  showWordLimit: Boolean,
  errorMessageAlign: String as PropType<FieldTextAlign>,
  colon: {
    type: Boolean,
    default: null,
  },
});

export type FieldProps = ExtractPropTypes<typeof fieldProps>;

export default defineComponent({
  name,

  props: fieldProps,

  emits: [
    'blur',
    'focus',
    'clear',
    'keypress',
    'clickInput',
    'endValidate',
    'startValidate',
    'clickLeftIcon',
    'clickRightIcon',
    'update:modelValue',
  ],

  setup(props, { emit, slots }) {
    const id = useId();
    const state = reactive({
      status: 'unvalidated' as FieldValidationStatus,
      focused: false,
      validateMessage: '',
    });

    const inputRef = ref<HTMLInputElement>();
    const clearIconRef = ref<ComponentInstance>();
    const customValue = ref<() => unknown>();

    const { parent: form } = useParent(FORM_KEY);

    const getModelValue = () => String(props.modelValue ?? '');

    const getProp = <T extends FieldFormSharedProps>(key: T) => {
      if (isDef(props[key])) {
        return props[key];
      }
      if (form && isDef(form.props[key])) {
        return form.props[key];
      }
    };

    const showClear = computed(() => {
      const readonly = getProp('readonly');

      if (props.clearable && !readonly) {
        const hasValue = getModelValue() !== '';
        const trigger =
          props.clearTrigger === 'always' ||
          (props.clearTrigger === 'focus' && state.focused);

        return hasValue && trigger;
      }
      return false;
    });

    const formValue = computed(() => {
      if (customValue.value && slots.input) {
        return customValue.value();
      }
      return props.modelValue;
    });

    const showRequiredMark = computed(() => {
      const required = getProp('required');
      if (required === 'auto') {
        return props.rules?.some((rule: FieldRule) => rule.required);
      }
      return required;
    });

    const runRules = (rules: FieldRule[]) =>
      rules.reduce(
        (promise, rule) =>
          promise.then(() => {
            if (state.status === 'failed') {
              return;
            }

            let { value } = formValue;

            if (rule.formatter) {
              value = rule.formatter(value, rule);
            }

            if (!runSyncRule(value, rule)) {
              state.status = 'failed';
              state.validateMessage = getRuleMessage(value, rule);
              return;
            }

            if (rule.validator) {
              if (isEmptyValue(value) && rule.validateEmpty === false) {
                return;
              }

              return runRuleValidator(value, rule).then((result) => {
                if (result && typeof result === 'string') {
                  state.status = 'failed';
                  state.validateMessage = result;
                } else if (result === false) {
                  state.status = 'failed';
                  state.validateMessage = getRuleMessage(value, rule);
                }
              });
            }
          }),
        Promise.resolve(),
      );

    const resetValidation = () => {
      state.status = 'unvalidated';
      state.validateMessage = '';
    };

    const endValidate = () =>
      emit('endValidate', {
        status: state.status,
        message: state.validateMessage,
      });

    const validate = (rules = props.rules) =>
      new Promise<FieldValidateError | void>((resolve) => {
        resetValidation();
        if (rules) {
          emit('startValidate');
          runRules(rules).then(() => {
            if (state.status === 'failed') {
              resolve({
                name: props.name,
                message: state.validateMessage,
              });
              endValidate();
            } else {
              state.status = 'passed';
              resolve();
              endValidate();
            }
          });
        } else {
          resolve();
        }
      });

    const validateWithTrigger = (trigger: FieldValidateTrigger) => {
      if (form && props.rules) {
        const { validateTrigger } = form.props;
        const defaultTrigger = toArray(validateTrigger).includes(trigger);
        const rules = props.rules.filter((rule) => {
          if (rule.trigger) {
            return toArray(rule.trigger).includes(trigger);
          }
          return defaultTrigger;
        });

        if (rules.length) {
          validate(rules);
        }
      }
    };

    // native maxlength have incorrect line-break counting
    // see: https://github.com/vant-ui/vant/issues/5033
    const limitValueLength = (value: string) => {
      const { maxlength } = props;
      if (isDef(maxlength) && getStringLength(value) > +maxlength) {
        const modelValue = getModelValue();
        if (modelValue && getStringLength(modelValue) === +maxlength) {
          return modelValue;
        }
        // Remove redundant interpolated values,
        // make it consistent with the native input maxlength behavior.
        let selectionEnd = inputRef.value?.selectionEnd;
        if (state.focused && selectionEnd) {
          const valueArr = [...value];
          const exceededLength = valueArr.length - +maxlength;
          selectionEnd = getStringLength(value.slice(0, selectionEnd));
          valueArr.splice(selectionEnd - exceededLength, exceededLength);
          return valueArr.join('');
        }
        return cutString(value, +maxlength);
      }
      return value;
    };

    const updateValue = (
      value: string,
      trigger: FieldFormatTrigger = 'onChange',
    ) => {
      const originalValue = value;
      value = limitValueLength(value);
      // When the value length exceeds maxlength,
      // record the excess length for correcting the cursor position.
      // https://github.com/youzan/vant/issues/11289
      const limitDiffLen = originalValue.length - value.length;

      // https://github.com/youzan/vant/issues/13058
      if (props.type === 'number' || props.type === 'digit') {
        const isNumber = props.type === 'number';
        value = formatNumber(value, isNumber, isNumber);

        if (
          trigger === 'onBlur' &&
          value !== '' &&
          (props.min !== undefined || props.max !== undefined)
        ) {
          const adjustedValue = clamp(
            +value,
            props.min ?? -Infinity,
            props.max ?? Infinity,
          );

          if (+value !== adjustedValue) {
            value = adjustedValue.toString();
          }
        }
      }

      let formatterDiffLen = 0;
      if (props.formatter && trigger === props.formatTrigger) {
        const { formatter, maxlength } = props;
        value = formatter(value);
        // The length of the formatted value may exceed maxlength.
        if (isDef(maxlength) && getStringLength(value) > +maxlength) {
          value = cutString(value, +maxlength);
        }
        if (inputRef.value && state.focused) {
          const { selectionEnd } = inputRef.value;
          // The value before the cursor of the original value.
          const bcoVal = cutString(originalValue, selectionEnd!);
          // Record the length change of `bcoVal` after formatting,
          // which is used to correct the cursor position.
          formatterDiffLen = formatter(bcoVal).length - bcoVal.length;
        }
      }

      if (inputRef.value && inputRef.value.value !== value) {
        // When the input is focused, correct the cursor position.
        if (state.focused) {
          let { selectionStart, selectionEnd } = inputRef.value;
          inputRef.value.value = value;

          if (isDef(selectionStart) && isDef(selectionEnd)) {
            const valueLen = value.length;

            if (limitDiffLen) {
              selectionStart -= limitDiffLen;
              selectionEnd -= limitDiffLen;
            } else if (formatterDiffLen) {
              selectionStart += formatterDiffLen;
              selectionEnd += formatterDiffLen;
            }

            inputRef.value.setSelectionRange(
              Math.min(selectionStart, valueLen),
              Math.min(selectionEnd, valueLen),
            );
          }
        } else {
          inputRef.value.value = value;
        }
      }

      if (value !== props.modelValue) {
        emit('update:modelValue', value);
      }
    };

    const onInput = (event: Event) => {
      // skip update value when composing
      if (!event.target!.composing) {
        updateValue((event.target as HTMLInputElement).value);
      }
    };

    const blur = () => inputRef.value?.blur();
    const focus = () => inputRef.value?.focus();

    const adjustTextareaSize = () => {
      const input = inputRef.value;
      if (props.type === 'textarea' && props.autosize && input) {
        resizeTextarea(input, props.autosize);
      }
    };

    const onFocus = (event: Event) => {
      state.focused = true;
      emit('focus', event);
      nextTick(adjustTextareaSize);

      // readonly not work in legacy mobile safari
      if (getProp('readonly')) {
        blur();
      }
    };

    const onBlur = (event: Event) => {
      state.focused = false;
      updateValue(getModelValue(), 'onBlur');
      emit('blur', event);

      if (getProp('readonly')) {
        return;
      }

      validateWithTrigger('onBlur');
      nextTick(adjustTextareaSize);
      resetScroll();
    };

    const onClickInput = (event: MouseEvent) => emit('clickInput', event);

    const onClickLeftIcon = (event: MouseEvent) => emit('clickLeftIcon', event);

    const onClickRightIcon = (event: MouseEvent) =>
      emit('clickRightIcon', event);

    const onClear = (event: TouchEvent) => {
      preventDefault(event);
      emit('update:modelValue', '');
      emit('clear', event);
    };

    const showError = computed(() => {
      if (typeof props.error === 'boolean') {
        return props.error;
      }
      if (form && form.props.showError && state.status === 'failed') {
        return true;
      }
    });

    const labelStyle = computed(() => {
      const labelWidth = getProp('labelWidth');
      const labelAlign = getProp('labelAlign');
      if (labelWidth && labelAlign !== 'top') {
        return { width: addUnit(labelWidth) };
      }
    });

    const onKeypress = (event: KeyboardEvent) => {
      const ENTER_CODE = 13;

      if (event.keyCode === ENTER_CODE) {
        const submitOnEnter = form && form.props.submitOnEnter;
        if (!submitOnEnter && props.type !== 'textarea') {
          preventDefault(event);
        }

        // trigger blur after click keyboard search button
        if (props.type === 'search') {
          blur();
        }
      }

      emit('keypress', event);
    };

    const getInputId = () => props.id || `${id}-input`;

    const getValidationStatus = () => state.status;

    const renderInput = () => {
      const controlClass = bem('control', [
        getProp('inputAlign'),
        {
          error: showError.value,
          custom: !!slots.input,
          'min-height': props.type === 'textarea' && !props.autosize,
        },
      ]);

      if (slots.input) {
        return (
          <div class={controlClass} onClick={onClickInput}>
            {slots.input()}
          </div>
        );
      }

      const inputAttrs = {
        id: getInputId(),
        ref: inputRef,
        name: props.name,
        rows: props.rows !== undefined ? +props.rows : undefined,
        class: controlClass,
        disabled: getProp('disabled'),
        readonly: getProp('readonly'),
        autofocus: props.autofocus,
        placeholder: props.placeholder,
        autocomplete: props.autocomplete,
        autocapitalize: props.autocapitalize,
        autocorrect: props.autocorrect,
        enterkeyhint: props.enterkeyhint,
        spellcheck: props.spellcheck,
        'aria-labelledby': props.label ? `${id}-label` : undefined,
        'data-allow-mismatch': 'attribute',
        onBlur,
        onFocus,
        onInput,
        onClick: onClickInput,
        onChange: endComposing,
        onKeypress,
        onCompositionend: endComposing,
        onCompositionstart: startComposing,
      };

      if (props.type === 'textarea') {
        return <textarea {...inputAttrs} inputmode={props.inputmode} />;
      }

      return (
        <input {...mapInputType(props.type, props.inputmode)} {...inputAttrs} />
      );
    };

    const renderLeftIcon = () => {
      const leftIconSlot = slots['left-icon'];

      if (props.leftIcon || leftIconSlot) {
        return (
          <div class={bem('left-icon')} onClick={onClickLeftIcon}>
            {leftIconSlot ? (
              leftIconSlot()
            ) : (
              <Icon name={props.leftIcon} classPrefix={props.iconPrefix} />
            )}
          </div>
        );
      }
    };

    const renderRightIcon = () => {
      const rightIconSlot = slots['right-icon'];

      if (props.rightIcon || rightIconSlot) {
        return (
          <div class={bem('right-icon')} onClick={onClickRightIcon}>
            {rightIconSlot ? (
              rightIconSlot()
            ) : (
              <Icon name={props.rightIcon} classPrefix={props.iconPrefix} />
            )}
          </div>
        );
      }
    };

    const renderWordLimit = () => {
      if (props.showWordLimit && props.maxlength) {
        const count = getStringLength(getModelValue());
        return (
          <div class={bem('word-limit')}>
            <span class={bem('word-num')}>{count}</span>/{props.maxlength}
          </div>
        );
      }
    };

    const renderMessage = () => {
      if (form && form.props.showErrorMessage === false) {
        return;
      }

      const message = props.errorMessage || state.validateMessage;

      if (message) {
        const slot = slots['error-message'];
        const errorMessageAlign = getProp('errorMessageAlign');
        return (
          <div class={bem('error-message', errorMessageAlign)}>
            {slot ? slot({ message }) : message}
          </div>
        );
      }
    };

    const renderLabel = () => {
      const labelWidth = getProp('labelWidth');
      const labelAlign = getProp('labelAlign');
      const colon = getProp('colon') ? ':' : '';

      if (slots.label) {
        return [slots.label(), colon];
      }
      if (props.label) {
        return (
          <label
            id={`${id}-label`}
            for={slots.input ? undefined : getInputId()}
            data-allow-mismatch="attribute"
            onClick={(event: MouseEvent) => {
              // https://github.com/youzan/vant/issues/11831
              preventDefault(event);
              focus();
            }}
            style={
              labelAlign === 'top' && labelWidth
                ? { width: addUnit(labelWidth) }
                : undefined
            }
          >
            {props.label + colon}
          </label>
        );
      }
    };

    const renderFieldBody = () => [
      <div class={bem('body')}>
        {renderInput()}
        {showClear.value && (
          <Icon
            ref={clearIconRef}
            name={props.clearIcon}
            class={bem('clear')}
          />
        )}
        {renderRightIcon()}
        {slots.button && <div class={bem('button')}>{slots.button()}</div>}
      </div>,
      renderWordLimit(),
      renderMessage(),
    ];

    useExpose<FieldExpose>({
      blur,
      focus,
      validate,
      formValue,
      resetValidation,
      getValidationStatus,
      adjustTextareaSize,
    });

    provide(CUSTOM_FIELD_INJECTION_KEY, {
      customValue,
      resetValidation,
      validateWithTrigger,
    });

    watch(
      () => props.modelValue,
      () => {
        updateValue(getModelValue());
        resetValidation();
        validateWithTrigger('onChange');
        nextTick(adjustTextareaSize);
      },
    );

    onMounted(() => {
      updateValue(getModelValue(), props.formatTrigger);
      nextTick(adjustTextareaSize);
    });

    // useEventListener will set passive to `false` to eliminate the warning of Chrome
    useEventListener('touchstart', onClear, {
      target: computed(() => clearIconRef.value?.$el),
    });

    return () => {
      const disabled = getProp('disabled');
      const labelAlign = getProp('labelAlign');
      const LeftIcon = renderLeftIcon();

      const renderTitle = () => {
        const Label = renderLabel();
        if (labelAlign === 'top') {
          return [LeftIcon, Label].filter(Boolean);
        }
        return Label || [];
      };

      return (
        <Cell
          v-slots={{
            icon: LeftIcon && labelAlign !== 'top' ? () => LeftIcon : null,
            title: renderTitle,
            value: renderFieldBody,
            extra: slots.extra,
          }}
          size={props.size}
          class={bem({
            error: showError.value,
            disabled,
            [`label-${labelAlign}`]: labelAlign,
          })}
          center={props.center}
          border={props.border}
          isLink={disabled ? false : props.isLink}
          clickable={disabled ? false : props.clickable}
          onClick={
            disabled
              ? (e: MouseEvent) => e.stopImmediatePropagation()
              : undefined
          }
          titleStyle={labelStyle.value}
          valueClass={bem('value')}
          titleClass={[
            bem('label', [labelAlign, { required: showRequiredMark.value }]),
            props.labelClass,
          ]}
          arrowDirection={props.arrowDirection}
        />
      );
    };
  },
});
