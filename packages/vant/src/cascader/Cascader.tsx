import {
  ref,
  watch,
  nextTick,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';
import {
  extend,
  truthProp,
  numericProp,
  makeArrayProp,
  makeStringProp,
  createNamespace,
  HAPTICS_FEEDBACK,
  type Numeric,
} from '../utils';

// Composables
import { useRefs } from '../composables/use-refs';

// Components
import { Tab } from '../tab';
import { Tabs } from '../tabs';
import { Icon } from '../icon';

// Types
import type { TabsClickTabEventParams } from '../tabs/types';
import type { CascaderTab, CascaderOption, CascaderFieldNames } from './types';

const [name, bem, t] = createNamespace('cascader');

/**
 * @summary Cascader 级联选择 - 级联选择框，用于多层级数据的选择，典型场景为省市区选择
 * @attr {string|number} v-model - 选中项的值
 * @attr {string} title - 顶部标题
 * @attr {CascaderOption[]} options - 可选项数据源，默认 []
 * @attr {string} placeholder - 未选中时的提示文案，默认 请选择
 * @attr {string} active-color - 选中状态的高亮颜色，默认 #1989fa
 * @attr {boolean} swipeable - 是否开启手势左右滑动切换，默认 true
 * @attr {boolean} closeable - 是否显示关闭图标，默认 true
 * @attr {boolean} show-header - 是否展示标题栏，默认 true
 * @attr {string} close-icon - 关闭图标名称或图片链接，默认 cross
 * @attr {CascaderFieldNames} field-names - 自定义 options 结构中的字段
 * @slot title - 自定义顶部标题
 * @slot option - 自定义选项文字
 * @slot options-top - 自定义选项上方的内容
 * @slot options-bottom - 自定义选项下方的内容
 * @event change - 选中项变化时触发，参数：{ value, selectedOptions, tabIndex }
 * @event finish - 全部选项选择完成后触发，参数：{ value, selectedOptions, tabIndex }
 * @event close - 点击关闭图标时触发
 * @event click-tab - 点击标签时触发，参数：tabIndex, title
 */
export const cascaderProps = {
  title: String,
  options: makeArrayProp<CascaderOption>(),
  closeable: truthProp,
  swipeable: truthProp,
  closeIcon: makeStringProp('cross'),
  showHeader: truthProp,
  modelValue: numericProp,
  fieldNames: Object as PropType<CascaderFieldNames>,
  placeholder: String,
  activeColor: String,
};

export type CascaderProps = ExtractPropTypes<typeof cascaderProps>;

export default defineComponent({
  name,

  props: cascaderProps,

  emits: ['close', 'change', 'finish', 'clickTab', 'update:modelValue'],

  setup(props, { slots, emit }) {
    const tabs = ref<CascaderTab[]>([]);
    const activeTab = ref(0);
    const [selectedElementRefs, setSelectedElementRefs] =
      useRefs<HTMLElement>();

    const {
      text: textKey,
      value: valueKey,
      children: childrenKey,
    } = extend(
      {
        text: 'text',
        value: 'value',
        children: 'children',
      },
      props.fieldNames,
    );

    const getSelectedOptionsByValue = (
      options: CascaderOption[],
      value: Numeric,
    ): CascaderOption[] | undefined => {
      for (const option of options) {
        if (option[valueKey] === value) {
          return [option];
        }

        if (option[childrenKey]) {
          const selectedOptions = getSelectedOptionsByValue(
            option[childrenKey],
            value,
          );
          if (selectedOptions) {
            return [option, ...selectedOptions];
          }
        }
      }
    };

    const updateTabs = () => {
      const { options, modelValue } = props;

      if (modelValue !== undefined) {
        const selectedOptions = getSelectedOptionsByValue(options, modelValue);

        if (selectedOptions) {
          let optionsCursor = options;

          tabs.value = selectedOptions.map((option) => {
            const tab = {
              options: optionsCursor,
              selected: option,
            };

            const next = optionsCursor.find(
              (item) => item[valueKey] === option[valueKey],
            );
            if (next) {
              optionsCursor = next[childrenKey];
            }

            return tab;
          });

          if (optionsCursor) {
            tabs.value.push({
              options: optionsCursor,
              selected: null,
            });
          }

          nextTick(() => {
            activeTab.value = tabs.value.length - 1;
          });

          return;
        }
      }

      tabs.value = [
        {
          options,
          selected: null,
        },
      ];
    };

    const onSelect = (option: CascaderOption, tabIndex: number) => {
      if (option.disabled) {
        return;
      }

      tabs.value[tabIndex].selected = option;

      if (tabs.value.length > tabIndex + 1) {
        tabs.value = tabs.value.slice(0, tabIndex + 1);
      }

      if (option[childrenKey]) {
        const nextTab = {
          options: option[childrenKey],
          selected: null,
        };

        if (tabs.value[tabIndex + 1]) {
          tabs.value[tabIndex + 1] = nextTab;
        } else {
          tabs.value.push(nextTab);
        }

        nextTick(() => {
          activeTab.value++;
        });
      }

      const selectedOptions = tabs.value
        .map((tab) => tab.selected)
        .filter(Boolean);

      emit('update:modelValue', option[valueKey]);

      const params = {
        value: option[valueKey],
        tabIndex,
        selectedOptions,
      };
      emit('change', params);

      if (!option[childrenKey]) {
        emit('finish', params);
      }
    };

    const onClose = () => emit('close');

    const onClickTab = ({ name, title }: TabsClickTabEventParams) =>
      emit('clickTab', name, title);

    const renderHeader = () =>
      props.showHeader ? (
        <div class={bem('header')}>
          <h2 class={bem('title')}>
            {slots.title ? slots.title() : props.title}
          </h2>
          {props.closeable ? (
            <Icon
              name={props.closeIcon}
              class={[bem('close-icon'), HAPTICS_FEEDBACK]}
              onClick={onClose}
            />
          ) : null}
        </div>
      ) : null;

    const renderOption = (
      option: CascaderOption,
      selectedOption: CascaderOption | null,
      tabIndex: number,
    ) => {
      const { disabled } = option;
      const selected = !!(
        selectedOption && option[valueKey] === selectedOption[valueKey]
      );
      const color = option.color || (selected ? props.activeColor : undefined);

      const Text = slots.option ? (
        slots.option({ option, selected })
      ) : (
        <span>{option[textKey]}</span>
      );

      return (
        <li
          ref={selected ? setSelectedElementRefs(tabIndex) : undefined}
          role="menuitemradio"
          class={[bem('option', { selected, disabled }), option.className]}
          style={{ color }}
          tabindex={disabled ? undefined : selected ? 0 : -1}
          aria-checked={selected}
          aria-disabled={disabled || undefined}
          onClick={() => onSelect(option, tabIndex)}
        >
          {Text}
          {selected ? (
            <Icon name="success" class={bem('selected-icon')} />
          ) : null}
        </li>
      );
    };

    const renderOptions = (
      options: CascaderOption[],
      selectedOption: CascaderOption | null,
      tabIndex: number,
    ) => (
      <ul role="menu" class={bem('options')}>
        {options.map((option) =>
          renderOption(option, selectedOption, tabIndex),
        )}
      </ul>
    );

    const renderTab = (tab: CascaderTab, tabIndex: number) => {
      const { options, selected } = tab;
      const placeholder = props.placeholder || t('select');
      const title = selected ? selected[textKey] : placeholder;

      return (
        <Tab
          title={title}
          titleClass={bem('tab', {
            unselected: !selected,
          })}
        >
          {slots['options-top']?.({ tabIndex })}
          {renderOptions(options, selected, tabIndex)}
          {slots['options-bottom']?.({ tabIndex })}
        </Tab>
      );
    };

    const renderTabs = () => (
      <Tabs
        v-model:active={activeTab.value}
        shrink
        animated
        class={bem('tabs')}
        color={props.activeColor}
        swipeable={props.swipeable}
        onClickTab={onClickTab}
      >
        {tabs.value.map(renderTab)}
      </Tabs>
    );

    const scrollIntoView = (el: HTMLElement) => {
      const scrollParent = el.parentElement;

      if (scrollParent) {
        scrollParent.scrollTop =
          el.offsetTop - (scrollParent.offsetHeight - el.offsetHeight) / 2;
      }
    };

    updateTabs();
    watch(activeTab, (value) => {
      const el = selectedElementRefs.value[value];
      if (el) scrollIntoView(el);
    });
    watch(() => props.options, updateTabs, { deep: true });
    watch(
      () => props.modelValue,
      (value) => {
        if (value !== undefined) {
          const values = tabs.value.map((tab) => tab.selected?.[valueKey]);
          if (values.includes(value)) {
            return;
          }
        }
        updateTabs();
      },
    );

    return () => (
      <div class={bem()}>
        {renderHeader()}
        {renderTabs()}
      </div>
    );
  },
});
