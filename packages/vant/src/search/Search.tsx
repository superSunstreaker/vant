import { ref, defineComponent, type ExtractPropTypes } from 'vue';

// Utils
import {
  pick,
  extend,
  truthProp,
  preventDefault,
  makeStringProp,
  createNamespace,
} from '../utils';
import { fieldSharedProps } from '../field/Field';

// Composables
import { useId } from '../composables/use-id';
import { useExpose } from '../composables/use-expose';

// Components
import { Field, FieldInstance } from '../field';

// Types
import type { SearchShape } from './types';

const [name, bem, t] = createNamespace('search');

/**
 * @summary Search 搜索 - 用于搜索场景的输入框组件
 * @attr {number|string} v-model - 当前输入的值
 * @attr {string} label - 搜索框左侧文本
 * @attr {string} name - 名称，作为提交表单时的标识符
 * @attr {SearchShape} shape - 搜索框形状，可选值为 round，默认 square
 * @attr {string} id - 搜索框 id，同时会设置 label 的 for 属性
 * @attr {string} background - 搜索框外部背景色，默认 #f2f2f2
 * @attr {number|string} maxlength - 输入的最大字符数
 * @attr {string} placeholder - 占位提示文字
 * @attr {boolean} clearable - 是否启用清除图标，默认 true
 * @attr {string} clear-icon - 清除图标名称或图片链接，默认 clear
 * @attr {string} clear-trigger - 显示清除图标的时机，默认 focus
 * @attr {boolean} autofocus - 是否自动聚焦，默认 false
 * @attr {boolean} show-action - 是否在搜索框右侧显示取消按钮，默认 false
 * @attr {string} action-text - 取消按钮文字，默认 取消
 * @attr {boolean} disabled - 是否禁用输入框，默认 false
 * @attr {boolean} readonly - 是否将输入框设为只读状态，默认 false
 * @attr {boolean} error - 是否将输入内容标红，默认 false
 * @attr {string} error-message - 底部错误提示文案
 * @attr {Function} formatter - 输入内容格式化函数
 * @attr {string} format-trigger - 格式化函数触发的时机，默认 onChange
 * @attr {string} input-align - 输入框内容对齐方式，可选值为 center / right，默认 left
 * @attr {string} left-icon - 输入框左侧图标名称或图片链接，默认 search
 * @attr {string} right-icon - 输入框右侧图标名称或图片链接
 * @attr {string} autocomplete - input 标签原生的自动完成属性
 * @slot left - 自定义左侧内容（搜索框外）
 * @slot action - 自定义右侧内容（搜索框外），设置 show-action 属性后展示
 * @slot label - 自定义左侧文本（搜索框内）
 * @slot left-icon - 自定义左侧图标（搜索框内）
 * @slot right-icon - 自定义右侧图标（搜索框内）
 * @event search - 确定搜索时触发，参数：value: string
 * @event cancel - 点击取消按钮时触发
 * @event blur - 输入框失去焦点时触发，参数：event: Event
 * @event focus - 输入框获得焦点时触发，参数：event: Event
 * @event clear - 点击清除按钮后触发，参数：event: MouseEvent
 * @event click-input - 点击输入区域时触发，参数：event: MouseEvent
 * @event click-left-icon - 点击左侧图标时触发，参数：event: MouseEvent
 * @event click-right-icon - 点击右侧图标时触发，参数：event: MouseEvent
 */
export const searchProps = extend({}, fieldSharedProps, {
  label: String,
  shape: makeStringProp<SearchShape>('square'),
  leftIcon: makeStringProp('search'),
  clearable: truthProp,
  actionText: String,
  background: String,
  showAction: Boolean,
});

export type SearchProps = ExtractPropTypes<typeof searchProps>;

export default defineComponent({
  name,

  props: searchProps,

  emits: [
    'blur',
    'focus',
    'clear',
    'search',
    'cancel',
    'clickInput',
    'clickLeftIcon',
    'clickRightIcon',
    'update:modelValue',
  ],

  setup(props, { emit, slots, attrs }) {
    const id = useId();
    const fieldRef = ref<FieldInstance>();

    const onCancel = () => {
      if (!slots.action) {
        emit('update:modelValue', '');
        emit('cancel');
      }
    };

    const onKeypress = (event: KeyboardEvent) => {
      const ENTER_CODE = 13;
      if (event.keyCode === ENTER_CODE) {
        preventDefault(event);
        emit('search', props.modelValue);
      }
    };

    const getInputId = () => props.id || `${id}-input`;

    const renderLabel = () => {
      if (slots.label || props.label) {
        return (
          <label
            class={bem('label')}
            for={getInputId()}
            data-allow-mismatch="attribute"
          >
            {slots.label ? slots.label() : props.label}
          </label>
        );
      }
    };

    const renderAction = () => {
      if (props.showAction) {
        const text = props.actionText || t('cancel');
        return (
          <div
            class={bem('action')}
            role="button"
            tabindex={0}
            onClick={onCancel}
          >
            {slots.action ? slots.action() : text}
          </div>
        );
      }
    };

    const blur = () => fieldRef.value?.blur();
    const focus = () => fieldRef.value?.focus();
    const onBlur = (event: Event) => emit('blur', event);
    const onFocus = (event: Event) => emit('focus', event);
    const onClear = (event: MouseEvent) => emit('clear', event);
    const onClickInput = (event: MouseEvent) => emit('clickInput', event);
    const onClickLeftIcon = (event: MouseEvent) => emit('clickLeftIcon', event);
    const onClickRightIcon = (event: MouseEvent) =>
      emit('clickRightIcon', event);

    const fieldPropNames = Object.keys(fieldSharedProps) as Array<
      keyof typeof fieldSharedProps
    >;

    const renderField = () => {
      const fieldAttrs = extend({}, attrs, pick(props, fieldPropNames), {
        id: getInputId(),
      });

      const onInput = (value: string) => emit('update:modelValue', value);

      return (
        <Field
          v-slots={pick(slots, ['left-icon', 'right-icon'])}
          ref={fieldRef}
          type="search"
          class={bem('field', { 'with-message': fieldAttrs.errorMessage })}
          border={false}
          labelAlign="left"
          onBlur={onBlur}
          onFocus={onFocus}
          onClear={onClear}
          onKeypress={onKeypress}
          onClickInput={onClickInput}
          onClickLeftIcon={onClickLeftIcon}
          onClickRightIcon={onClickRightIcon}
          onUpdate:modelValue={onInput}
          {...fieldAttrs}
        />
      );
    };

    useExpose({ focus, blur });

    return () => (
      <div
        class={bem({ 'show-action': props.showAction })}
        style={{ background: props.background }}
      >
        {slots.left?.()}
        <div class={bem('content', props.shape)}>
          {renderLabel()}
          {renderField()}
        </div>
        {renderAction()}
      </div>
    );
  },
});
