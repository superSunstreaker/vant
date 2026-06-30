import {
  defineComponent,
  Comment,
  Fragment,
  type InjectionKey,
  type ExtractPropTypes,
  type VNode,
} from 'vue';

// Utils
import {
  flat,
  pick,
  extend,
  makeArrayProp,
  makeNumericProp,
  createNamespace,
  truthProp,
} from '../utils';

// Composables
import { useChildren } from '@vant/use';
import { useSyncPropRef } from '../composables/use-sync-prop-ref';

// Components
import { Tab } from '../tab';
import { Tabs } from '../tabs';
import Toolbar, {
  pickerToolbarProps,
  pickerToolbarSlots,
} from '../picker/PickerToolbar';

const [name, bem] = createNamespace('picker-group');

export type PickerGroupProvide = Record<string, string>;

export const PICKER_GROUP_KEY: InjectionKey<PickerGroupProvide> = Symbol(name);

/**
 * @summary PickerGroup 选择器组 - 用于结合多个 Picker 选择器组件，在一次交互中完成多个值的选择
 * @attr {string[]} tabs - 标签页的标题列表，默认 []
 * @attr {number|string} v-model:active-tab - 当前选中的标签页索引，默认 0
 * @attr {string} next-step-text - 下一步按钮的文字
 * @attr {string} title - 顶部栏标题
 * @attr {string} confirm-button-text - 确认按钮文字，默认 确认
 * @attr {string} cancel-button-text - 取消按钮文字，默认 取消
 * @slot default - 默认插槽，用于放置 Picker / DatePicker / TimePicker 等组件
 * @slot toolbar - 自定义整个顶部栏的内容
 * @slot title - 自定义标题内容
 * @slot confirm - 自定义确认按钮内容
 * @slot cancel - 自定义取消按钮内容
 * @event confirm - 点击确认按钮时触发
 * @event cancel - 点击取消按钮时触发
 */
export const pickerGroupProps = extend(
  {
    tabs: makeArrayProp<string>(),
    activeTab: makeNumericProp(0),
    nextStepText: String,
    showToolbar: truthProp,
  },
  pickerToolbarProps,
);

export type PickerGroupProps = ExtractPropTypes<typeof pickerGroupProps>;

export default defineComponent({
  name,

  props: pickerGroupProps,

  emits: ['confirm', 'cancel', 'update:activeTab'],

  setup(props, { emit, slots }) {
    const activeTab = useSyncPropRef(
      () => props.activeTab,
      (value) => emit('update:activeTab', value),
    );
    const { children, linkChildren } = useChildren(PICKER_GROUP_KEY);

    linkChildren();

    const showNextButton = () =>
      +activeTab.value < props.tabs.length - 1 && props.nextStepText;

    const onConfirm = () => {
      if (showNextButton()) {
        activeTab.value = +activeTab.value + 1;
      } else {
        emit(
          'confirm',
          children.map((item) => item.confirm()),
        );
      }
    };

    const onCancel = () => emit('cancel');

    return () => {
      let childNodes = slots
        .default?.()
        ?.filter((node) => node.type !== Comment)
        .map((node) => {
          if (node.type === Fragment) {
            return node.children as VNode[];
          }

          return node;
        });

      if (childNodes) {
        childNodes = flat(childNodes);
      }

      const confirmButtonText = showNextButton()
        ? props.nextStepText
        : props.confirmButtonText;

      return (
        <div class={bem()}>
          {props.showToolbar ? (
            <Toolbar
              v-slots={pick(slots, pickerToolbarSlots)}
              title={props.title}
              cancelButtonText={props.cancelButtonText}
              confirmButtonText={confirmButtonText}
              onConfirm={onConfirm}
              onCancel={onCancel}
            />
          ) : null}
          <Tabs
            v-model:active={activeTab.value}
            class={bem('tabs')}
            shrink
            animated
            lazyRender={false}
          >
            {props.tabs.map((title, index) => (
              <Tab title={title} titleClass={bem('tab-title')}>
                {childNodes?.[index]}
              </Tab>
            ))}
          </Tabs>
        </div>
      );
    };
  },
});
