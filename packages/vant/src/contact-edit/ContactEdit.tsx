import {
  watch,
  reactive,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import { isMobile, createNamespace, extend } from '../utils';

// Components
import { Cell } from '../cell';
import { Form } from '../form';
import { Field } from '../field';
import { Button } from '../button';
import { Switch } from '../switch';

const [name, bem, t] = createNamespace('contact-edit');

export type ContactEditInfo = {
  tel: string;
  name: string;
  isDefault?: boolean;
};

const DEFAULT_CONTACT: ContactEditInfo = {
  tel: '',
  name: '',
};

/**
 * @summary ContactEdit 联系人编辑 - 编辑并保存联系人信息
 * @attr {ContactEditInfo} contact-info - 联系人信息，默认 {}
 * @attr {boolean} is-edit - 是否为编辑联系人，默认 false
 * @attr {boolean} is-saving - 是否显示保存按钮加载动画，默认 false
 * @attr {boolean} is-deleting - 是否显示删除按钮加载动画，默认 false
 * @attr {Function} tel-validator - 手机号格式校验函数
 * @attr {boolean} show-set-default - 是否显示默认联系人栏，默认 false
 * @attr {string} set-default-label - 默认联系人栏文案
 * @event save - 点击保存按钮时触发，参数：content: 表单内容
 * @event delete - 点击删除按钮时触发，参数：content: 表单内容
 * @event change-default - 切换是否为默认联系人时触发，参数：checked: 是否默认
 */
export const contactEditProps = {
  isEdit: Boolean,
  isSaving: Boolean,
  isDeleting: Boolean,
  showSetDefault: Boolean,
  setDefaultLabel: String,
  contactInfo: {
    type: Object as PropType<ContactEditInfo>,
    default: () => extend({}, DEFAULT_CONTACT),
  },
  telValidator: {
    type: Function as PropType<(val: string) => boolean>,
    default: isMobile,
  },
};

export type ContactEditProps = ExtractPropTypes<typeof contactEditProps>;

export default defineComponent({
  name,

  props: contactEditProps,

  emits: ['save', 'delete', 'changeDefault'],

  setup(props, { emit }) {
    const contact = reactive(extend({}, DEFAULT_CONTACT, props.contactInfo));

    const onSave = () => {
      if (!props.isSaving) {
        emit('save', contact);
      }
    };

    const onDelete = () => emit('delete', contact);

    const renderButtons = () => (
      <div class={bem('buttons')}>
        <Button
          block
          round
          type="primary"
          text={t('save')}
          class={bem('button')}
          loading={props.isSaving}
          nativeType="submit"
        />
        {props.isEdit && (
          <Button
            block
            round
            text={t('delete')}
            class={bem('button')}
            loading={props.isDeleting}
            onClick={onDelete}
          />
        )}
      </div>
    );

    const renderSwitch = () => (
      <Switch
        v-model={contact.isDefault}
        onChange={(checked: boolean) => emit('changeDefault', checked)}
      />
    );

    const renderSetDefault = () => {
      if (props.showSetDefault) {
        return (
          <Cell
            v-slots={{ 'right-icon': renderSwitch }}
            title={props.setDefaultLabel}
            class={bem('switch-cell')}
            border={false}
          />
        );
      }
    };

    watch(
      () => props.contactInfo,
      (value) => extend(contact, DEFAULT_CONTACT, value),
    );

    return () => (
      <Form class={bem()} onSubmit={onSave}>
        <div class={bem('fields')}>
          <Field
            v-model={contact.name}
            clearable
            label={t('name')}
            rules={[{ required: true, message: t('nameEmpty') }]}
            maxlength="30"
            placeholder={t('name')}
          />
          <Field
            v-model={contact.tel}
            clearable
            type="tel"
            label={t('tel')}
            rules={[
              { validator: props.telValidator, message: t('telInvalid') },
            ]}
            placeholder={t('tel')}
          />
        </div>
        {renderSetDefault()}
        {renderButtons()}
      </Form>
    );
  },
});
