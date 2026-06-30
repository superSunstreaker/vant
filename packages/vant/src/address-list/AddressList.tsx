import {
  defineComponent,
  computed,
  type ExtractPropTypes,
  type PropType,
} from 'vue';

// Utils
import {
  truthProp,
  numericProp,
  makeArrayProp,
  createNamespace,
  makeStringProp,
} from '../utils';

// Components
import { Button } from '../button';
import { RadioGroup } from '../radio-group';
import { CheckboxGroup } from '../checkbox-group';
import AddressListItem, { AddressListAddress } from './AddressListItem';

const [name, bem, t] = createNamespace('address-list');

/**
 * @summary AddressList 地址列表 - 展示地址信息列表
 * @attr {number|string|Array} v-model - 当前选中地址的 id，支持多选（类型为 []）
 * @attr {AddressListAddress[]} list - 地址列表，默认 []
 * @attr {AddressListAddress[]} disabled-list - 不可配送地址列表，默认 []
 * @attr {string} disabled-text - 不可配送提示文案
 * @attr {boolean} switchable - 是否允许切换地址，默认 true
 * @attr {boolean} show-add-button - 是否显示底部按钮，默认 true
 * @attr {string} add-button-text - 底部按钮文字，默认 新增地址
 * @attr {string} default-tag-text - 默认地址标签文字
 * @attr {string} right-icon - 右侧图标名称或图片链接，默认 edit
 * @slot default - 在列表下方插入内容
 * @slot top - 在顶部插入内容
 * @slot item-bottom - 在列表项底部插入内容
 * @slot tag - 自定义列表项标签内容
 * @event add - 点击新增按钮时触发
 * @event edit - 点击编辑按钮时触发，参数：item: AddressListAddress, index: number
 * @event select - 切换选中的地址时触发，参数：item: AddressListAddress, index: number
 * @event edit-disabled - 编辑不可配送的地址时触发，参数：item: AddressListAddress, index: number
 * @event select-disabled - 选中不可配送的地址时触发，参数：item: AddressListAddress, index: number
 * @event click-item - 点击任意地址时触发，参数：item: AddressListAddress, index: number, { event }
 */
export const addressListProps = {
  list: makeArrayProp<AddressListAddress>(),
  modelValue: [...numericProp, Array] as PropType<
    string | number | Array<string | number>
  >,
  switchable: truthProp,
  disabledText: String,
  disabledList: makeArrayProp<AddressListAddress>(),
  showAddButton: truthProp,
  addButtonText: String,
  defaultTagText: String,
  rightIcon: makeStringProp('edit'),
};

export type AddressListProps = ExtractPropTypes<typeof addressListProps>;

export default defineComponent({
  name,

  props: addressListProps,

  emits: [
    'add',
    'edit',
    'select',
    'clickItem',
    'editDisabled',
    'selectDisabled',
    'update:modelValue',
  ],

  setup(props, { slots, emit }) {
    const singleChoice = computed(() => !Array.isArray(props.modelValue));

    const renderItem = (
      item: AddressListAddress,
      index: number,
      disabled?: boolean,
    ) => {
      const onEdit = () =>
        emit(disabled ? 'editDisabled' : 'edit', item, index);

      const onClick = (event: MouseEvent) =>
        emit('clickItem', item, index, { event });

      const onSelect = () => {
        emit(disabled ? 'selectDisabled' : 'select', item, index);

        if (!disabled) {
          if (singleChoice.value) {
            emit('update:modelValue', item.id);
          } else {
            const value = props.modelValue as Array<string | number>;
            if (value.includes(item.id)) {
              emit(
                'update:modelValue',
                value.filter((id) => id !== item.id),
              );
            } else {
              emit('update:modelValue', [...value, item.id]);
            }
          }
        }
      };

      return (
        <AddressListItem
          v-slots={{
            bottom: slots['item-bottom'],
            tag: slots.tag,
          }}
          key={item.id}
          address={item}
          disabled={disabled}
          switchable={props.switchable}
          singleChoice={singleChoice.value}
          defaultTagText={props.defaultTagText}
          rightIcon={props.rightIcon}
          onEdit={onEdit}
          onClick={onClick}
          onSelect={onSelect}
        />
      );
    };

    const renderList = (list: AddressListAddress[], disabled?: boolean) => {
      if (list) {
        return list.map((item, index) => renderItem(item, index, disabled));
      }
    };

    const renderBottom = () =>
      props.showAddButton ? (
        <div class={[bem('bottom'), 'van-safe-area-bottom']}>
          <Button
            round
            block
            type="primary"
            text={props.addButtonText || t('add')}
            class={bem('add')}
            onClick={() => emit('add')}
          />
        </div>
      ) : undefined;

    return () => {
      const List = renderList(props.list);
      const DisabledList = renderList(props.disabledList, true);
      const DisabledText = props.disabledText && (
        <div class={bem('disabled-text')}>{props.disabledText}</div>
      );

      return (
        <div class={bem()}>
          {slots.top?.()}
          {!singleChoice.value && Array.isArray(props.modelValue) ? (
            <CheckboxGroup modelValue={props.modelValue}>{List}</CheckboxGroup>
          ) : (
            <RadioGroup modelValue={props.modelValue}>{List}</RadioGroup>
          )}
          {DisabledText}
          {DisabledList}
          {slots.default?.()}
          {renderBottom()}
        </div>
      );
    };
  },
});
