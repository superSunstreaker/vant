import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import { createNamespace, unknownProp, type Numeric } from '../utils';

// Components
import { Tag } from '../tag';
import { Icon } from '../icon';
import { Cell } from '../cell';
import { Radio } from '../radio';
import { Button } from '../button';
import { RadioGroup } from '../radio-group';

const [name, bem, t] = createNamespace('contact-list');

export type ContactListItem = {
  id?: Numeric;
  tel: Numeric;
  name: string;
  isDefault?: boolean;
};

/**
 * @summary ContactList 联系人列表 - 展示联系人列表
 * @attr {number|string} v-model - 当前选中联系人的 id
 * @attr {ContactListItem[]} list - 联系人列表，默认 []
 * @attr {string} add-text - 新建按钮文案，默认 新建联系人
 * @attr {string} default-tag-text - 默认联系人标签文案
 * @event add - 点击新增按钮时触发
 * @event edit - 点击编辑按钮时触发，参数：contact: ContactListItem, index: number
 * @event select - 切换选中的联系人时触发，参数：contact: ContactListItem, index: number
 */
export const contactListProps = {
  list: Array as PropType<ContactListItem[]>,
  addText: String,
  modelValue: unknownProp,
  defaultTagText: String,
};

export type ContactListProps = ExtractPropTypes<typeof contactListProps>;

export default defineComponent({
  name,

  props: contactListProps,

  emits: ['add', 'edit', 'select', 'update:modelValue'],

  setup(props, { emit }) {
    const renderItem = (item: ContactListItem, index: number) => {
      const onClick = () => {
        emit('update:modelValue', item.id);
        emit('select', item, index);
      };

      const renderRightIcon = () => (
        <Radio class={bem('radio')} name={item.id} iconSize={18} />
      );

      const renderEditIcon = () => (
        <Icon
          name="edit"
          class={bem('edit')}
          onClick={(event) => {
            event.stopPropagation();
            emit('edit', item, index);
          }}
        />
      );

      const renderContent = () => {
        const nodes: (JSX.Element | string)[] = [`${item.name}，${item.tel}`];

        if (item.isDefault && props.defaultTagText) {
          nodes.push(
            <Tag type="primary" round class={bem('item-tag')}>
              {props.defaultTagText}
            </Tag>,
          );
        }

        return nodes;
      };

      return (
        <Cell
          v-slots={{
            icon: renderEditIcon,
            title: renderContent,
            'right-icon': renderRightIcon,
          }}
          key={item.id}
          isLink
          center
          class={bem('item')}
          titleClass={bem('item-title')}
          onClick={onClick}
        />
      );
    };

    return () => (
      <div class={bem()}>
        <RadioGroup modelValue={props.modelValue} class={bem('group')}>
          {props.list && props.list.map(renderItem)}
        </RadioGroup>
        <div class={[bem('bottom'), 'van-safe-area-bottom']}>
          <Button
            round
            block
            type="primary"
            class={bem('add')}
            text={props.addText || t('addContact')}
            onClick={() => emit('add')}
          />
        </div>
      </div>
    );
  },
});
