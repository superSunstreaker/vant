import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import {
  FORM_KEY,
  truthProp,
  numericProp,
  preventDefault,
  createNamespace,
} from '../utils';

// Composables
import { useChildren } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Types
import type {
  FieldTextAlign,
  FieldValidateError,
  FieldValidateTrigger,
  FieldValidationStatus,
} from '../field/types';
import type { FormExpose } from './types';

const [name, bem] = createNamespace('form');

/**
 * @summary Form 表单 - 用于数据录入、校验，支持输入框、单选框、复选框、文件上传等类型，需要与 Field 组件搭配使用
 * @attr {boolean} colon - 是否在 label 后面添加冒号，默认 false
 * @attr {boolean} disabled - 是否禁用表单中的所有输入框，默认 false
 * @attr {boolean} readonly - 是否将表单中的所有输入框设为只读状态，默认 false
 * @attr {boolean|'auto'} required - 是否显示表单必填星号
 * @attr {boolean} show-error - 是否在校验不通过时标红输入框，默认 false
 * @attr {number|string} label-width - 表单项 label 宽度
 * @attr {FieldTextAlign} label-align - 表单项 label 对齐方式
 * @attr {FieldTextAlign} input-align - 输入框对齐方式
 * @attr {boolean} scroll-to-error - 是否在提交表单校验不通过时滚动至错误的表单项，默认 false
 * @attr {boolean} validate-first - 是否在某一项表单校验失败后停止校验，默认 false
 * @attr {boolean} submit-on-enter - 是否在按下回车键时提交表单，默认 true
 * @attr {boolean} show-error-message - 是否在校验不通过时显示错误消息，默认 true
 * @attr {FieldTextAlign} error-message-align - 错误提示文案对齐方式
 * @attr {FieldValidateTrigger|FieldValidateTrigger[]} validate-trigger - 表单校验触发时机，默认 onBlur
 * @slot default - 默认插槽，用于放置表单项
 * @event submit - 提交表单且校验通过后触发，参数：values: 表单内容
 * @event failed - 提交表单且校验不通过时触发，参数：{ values, errors }
 */
export const formProps = {
  colon: Boolean,
  disabled: Boolean,
  readonly: Boolean,
  required: [Boolean, String] as PropType<boolean | 'auto'>,
  showError: Boolean,
  labelWidth: numericProp,
  labelAlign: String as PropType<FieldTextAlign>,
  inputAlign: String as PropType<FieldTextAlign>,
  scrollToError: Boolean,
  scrollToErrorPosition: String as PropType<ScrollLogicalPosition>,
  validateFirst: Boolean,
  submitOnEnter: truthProp,
  showErrorMessage: truthProp,
  errorMessageAlign: String as PropType<FieldTextAlign>,
  validateTrigger: {
    type: [String, Array] as PropType<
      FieldValidateTrigger | FieldValidateTrigger[]
    >,
    default: 'onBlur',
  },
};

export type FormProps = ExtractPropTypes<typeof formProps>;

export default defineComponent({
  name,

  props: formProps,

  emits: ['submit', 'failed'],

  setup(props, { emit, slots }) {
    const { children, linkChildren } = useChildren(FORM_KEY);

    const getFieldsByNames = (names?: string[]) => {
      if (names) {
        return children.filter((field) => names.includes(field.name));
      }
      return children;
    };

    const validateSeq = (names?: string[]) =>
      new Promise<void>((resolve, reject) => {
        const errors: FieldValidateError[] = [];
        const fields = getFieldsByNames(names);

        fields
          .reduce(
            (promise, field) =>
              promise.then(() => {
                if (!errors.length) {
                  return field.validate().then((error?: FieldValidateError) => {
                    if (error) {
                      errors.push(error);
                    }
                  });
                }
              }),
            Promise.resolve(),
          )
          .then(() => {
            if (errors.length) {
              reject(errors);
            } else {
              resolve();
            }
          });
      });

    const validateAll = (names?: string[]) =>
      new Promise<void>((resolve, reject) => {
        const fields = getFieldsByNames(names);
        Promise.all(fields.map((item) => item.validate())).then((errors) => {
          errors = errors.filter(Boolean);

          if (errors.length) {
            reject(errors);
          } else {
            resolve();
          }
        });
      });

    const validateField = (name: string) => {
      const matched = children.find((item) => item.name === name);

      if (matched) {
        return new Promise<void>((resolve, reject) => {
          matched.validate().then((error?: FieldValidateError) => {
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          });
        });
      }

      return Promise.reject();
    };

    const validate = (name?: string | string[]) => {
      if (typeof name === 'string') {
        return validateField(name);
      }
      return props.validateFirst ? validateSeq(name) : validateAll(name);
    };

    const resetValidation = (name?: string | string[]) => {
      if (typeof name === 'string') {
        name = [name];
      }

      const fields = getFieldsByNames(name);
      fields.forEach((item) => {
        item.resetValidation();
      });
    };

    const getValidationStatus = () =>
      children.reduce<Record<string, FieldValidationStatus>>((form, field) => {
        form[field.name] = field.getValidationStatus();
        return form;
      }, {});

    const scrollToField = (
      name: string,
      options?: boolean | ScrollIntoViewOptions,
    ) => {
      children.some((item) => {
        if (item.name === name) {
          item.$el.scrollIntoView(options);
          return true;
        }
        return false;
      });
    };

    const getValues = () =>
      children.reduce<Record<string, unknown>>((form, field) => {
        if (field.name !== undefined) {
          form[field.name] = field.formValue.value;
        }
        return form;
      }, {});

    const submit = () => {
      const values = getValues();

      validate()
        .then(() => emit('submit', values))
        .catch((errors: FieldValidateError[]) => {
          emit('failed', { values, errors });
          const { scrollToError, scrollToErrorPosition } = props;

          if (scrollToError && errors[0].name) {
            scrollToField(
              errors[0].name,
              scrollToErrorPosition
                ? {
                    block: scrollToErrorPosition,
                  }
                : undefined,
            );
          }
        });
    };

    const onSubmit = (event: Event) => {
      preventDefault(event);
      submit();
    };

    linkChildren({ props });
    useExpose<FormExpose>({
      submit,
      validate,
      getValues,
      scrollToField,
      resetValidation,
      getValidationStatus,
    });

    return () => (
      <form class={bem()} onSubmit={onSubmit}>
        {slots.default?.()}
      </form>
    );
  },
});
