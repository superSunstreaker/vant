import { defineComponent, type ExtractPropTypes } from 'vue';
import { truthProp, makeStringProp, createNamespace } from '../utils';
import { Cell } from '../cell';

const [name, bem, t] = createNamespace('contact-card');

export type ContactCardType = 'add' | 'edit';

/**
 * @summary ContactCard 联系人卡片 - 以卡片的形式展示联系人信息
 * @attr {string} type - 卡片类型，可选值为 edit，默认 add
 * @attr {string} name - 联系人姓名
 * @attr {string} tel - 联系人手机号
 * @attr {string} add-text - 添加时的文案提示，默认 添加联系人
 * @attr {boolean} editable - 是否可以编辑联系人，默认 true
 * @event click - 点击时触发，参数：event: MouseEvent
 */
export const contactCardProps = {
  tel: String,
  name: String,
  type: makeStringProp<ContactCardType>('add'),
  addText: String,
  editable: truthProp,
};

export type ContactCardProps = ExtractPropTypes<typeof contactCardProps>;

export default defineComponent({
  name,

  props: contactCardProps,

  emits: ['click'],

  setup(props, { emit }) {
    const onClick = (event: MouseEvent) => {
      if (props.editable) {
        emit('click', event);
      }
    };

    const renderContent = () => {
      if (props.type === 'add') {
        return props.addText || t('addContact');
      }

      return [
        <div>{`${t('name')}：${props.name}`}</div>,
        <div>{`${t('tel')}：${props.tel}`}</div>,
      ];
    };

    return () => (
      <Cell
        v-slots={{ title: renderContent }}
        center
        icon={props.type === 'edit' ? 'contact' : 'add-square'}
        class={bem([props.type])}
        border={false}
        isLink={props.editable}
        titleClass={bem('title')}
        onClick={onClick}
      />
    );
  },
});
