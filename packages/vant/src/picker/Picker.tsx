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
  pick,
  extend,
  unitToPx,
  truthProp,
  isSameValue,
  makeArrayProp,
  preventDefault,
  makeStringProp,
  makeNumericProp,
  BORDER_UNSET_TOP_BOTTOM,
  type Numeric,
} from '../utils';
import {
  bem,
  name,
  isOptionExist,
  getColumnsType,
  findOptionByValue,
  assignDefaultFields,
  formatCascadeColumns,
  getFirstEnabledOption,
} from './utils';

// Composables
import { useChildren, useEventListener, useParent } from '@vant/use';
import { useExpose } from '../composables/use-expose';

// Components
import { Loading } from '../loading';
import Column, { PICKER_KEY } from './PickerColumn';
import Toolbar, {
  pickerToolbarPropKeys,
  pickerToolbarProps,
  pickerToolbarSlots,
} from './PickerToolbar';

// Types
import type {
  PickerColumn,
  PickerExpose,
  PickerOption,
  PickerFieldNames,
  PickerToolbarPosition,
} from './types';
import { PICKER_GROUP_KEY } from '../picker-group/PickerGroup';

/**
 * @summary Picker 选择器 - 提供多个选项集合供用户选择，支持单列选择、多列选择和级联选择，通常与弹出层组件配合使用
 * @attr {Array} v-model - 当前选中项对应的 value，默认 []
 * @attr {Array} columns - 对象数组，配置每一列显示的数据，默认 []
 * @attr {PickerFieldNames} columns-field-names - 自定义 columns 结构中的字段
 * @attr {string} title - 顶部栏标题
 * @attr {string} confirm-button-text - 确认按钮文字，默认 确认
 * @attr {string} cancel-button-text - 取消按钮文字，默认 取消
 * @attr {PickerToolbarPosition} toolbar-position - 顶部栏位置，可选值为 bottom，默认 top
 * @attr {boolean} loading - 是否显示加载状态，默认 false
 * @attr {boolean} readonly - 是否为只读状态，只读状态下无法切换选项，默认 false
 * @attr {number|string} option-height - 选项高度，支持 px vw vh rem 单位，默认 44
 * @attr {number|string} visible-option-num - 可见的选项个数，默认 6
 * @attr {number|string} swipe-duration - 快速滑动时惯性滚动的时长，单位 ms，默认 1000
 * @slot toolbar - 自定义整个顶部栏的内容
 * @slot title - 自定义标题内容
 * @slot confirm - 自定义确认按钮内容
 * @slot cancel - 自定义取消按钮内容
 * @slot option - 自定义选项内容
 * @slot columns-top - 自定义选项上方内容
 * @slot columns-bottom - 自定义选项下方内容
 * @event confirm - 点击完成按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event cancel - 点击取消按钮时触发，参数：{ selectedValues, selectedOptions, selectedIndexes }
 * @event change - 选项改变时触发，参数：{ selectedValues, selectedOptions, selectedIndexes, columnIndex }
 */
export const pickerSharedProps = extend(
  {
    loading: Boolean,
    readonly: Boolean,
    allowHtml: Boolean,
    optionHeight: makeNumericProp(44),
    showToolbar: truthProp,
    swipeDuration: makeNumericProp(1000),
    visibleOptionNum: makeNumericProp(6),
  },
  pickerToolbarProps,
);

export const pickerProps = extend({}, pickerSharedProps, {
  columns: makeArrayProp<PickerOption | PickerColumn>(),
  modelValue: makeArrayProp<Numeric>(),
  toolbarPosition: makeStringProp<PickerToolbarPosition>('top'),
  columnsFieldNames: Object as PropType<PickerFieldNames>,
});

export type PickerProps = ExtractPropTypes<typeof pickerProps>;

export default defineComponent({
  name,

  props: pickerProps,

  emits: [
    'confirm',
    'cancel',
    'change',
    'scrollInto',
    'clickOption',
    'update:modelValue',
  ],

  setup(props, { emit, slots }) {
    const columnsRef = ref<HTMLElement>();
    const selectedValues = ref(props.modelValue.slice(0));

    const { parent } = useParent(PICKER_GROUP_KEY);
    const { children, linkChildren } = useChildren(PICKER_KEY);

    linkChildren();

    const fields = computed(() => assignDefaultFields(props.columnsFieldNames));
    const optionHeight = computed(() => unitToPx(props.optionHeight));
    const columnsType = computed(() =>
      getColumnsType(props.columns, fields.value),
    );

    const currentColumns = computed<PickerColumn[]>(() => {
      const { columns } = props;
      switch (columnsType.value) {
        case 'multiple':
          return columns as PickerColumn[];
        case 'cascade':
          return formatCascadeColumns(columns, fields.value, selectedValues);
        default:
          return [columns];
      }
    });

    const hasOptions = computed(() =>
      currentColumns.value.some((options) => options.length),
    );

    const selectedOptions = computed(() =>
      currentColumns.value.map((options, index) =>
        findOptionByValue(options, selectedValues.value[index], fields.value),
      ),
    );

    const selectedIndexes = computed(() =>
      currentColumns.value.map((options, index) =>
        options.findIndex(
          (option) =>
            option[fields.value.value] === selectedValues.value[index],
        ),
      ),
    );

    const setValue = (index: number, value: Numeric) => {
      if (selectedValues.value[index] !== value) {
        const newValues = selectedValues.value.slice(0);
        newValues[index] = value;
        selectedValues.value = newValues;
      }
    };

    const getEventParams = () => ({
      selectedValues: selectedValues.value.slice(0),
      selectedOptions: selectedOptions.value,
      selectedIndexes: selectedIndexes.value,
    });

    const onChange = (value: Numeric, columnIndex: number) => {
      setValue(columnIndex, value);

      if (columnsType.value === 'cascade') {
        // reset values after cascading
        selectedValues.value.forEach((value, index) => {
          const options = currentColumns.value[index];
          if (!isOptionExist(options, value, fields.value)) {
            setValue(
              index,
              options.length ? options[0][fields.value.value] : undefined,
            );
          }
        });
      }

      nextTick(() => {
        emit('change', extend({ columnIndex }, getEventParams()));
      });
    };

    const onClickOption = (
      currentOption: PickerOption,
      columnIndex: number,
    ) => {
      const params = { columnIndex, currentOption };
      emit('clickOption', extend(getEventParams(), params));
      emit('scrollInto', params);
    };

    const confirm = () => {
      children.forEach((child) => child.stopMomentum());
      const params = getEventParams();

      // wait nextTick to ensure the model value is update to date
      // when confirm event is emitted
      nextTick(() => {
        const params = getEventParams();
        emit('confirm', params);
      });

      return params;
    };

    const cancel = () => emit('cancel', getEventParams());

    const renderColumnItems = () =>
      currentColumns.value.map((options, columnIndex) => (
        <Column
          v-slots={{ option: slots.option }}
          value={selectedValues.value[columnIndex]}
          fields={fields.value}
          options={options}
          readonly={props.readonly}
          allowHtml={props.allowHtml}
          optionHeight={optionHeight.value}
          swipeDuration={props.swipeDuration}
          visibleOptionNum={props.visibleOptionNum}
          onChange={(value: Numeric) => onChange(value, columnIndex)}
          onClickOption={(option: PickerOption) =>
            onClickOption(option, columnIndex)
          }
          onScrollInto={(option: PickerOption) => {
            emit('scrollInto', {
              currentOption: option,
              columnIndex,
            });
          }}
        />
      ));

    const renderMask = (wrapHeight: number) => {
      if (hasOptions.value) {
        const frameStyle = { height: `${optionHeight.value}px` };
        const maskStyle = {
          backgroundSize: `100% ${(wrapHeight - optionHeight.value) / 2}px`,
        };
        return [
          <div class={bem('mask')} style={maskStyle} />,
          <div
            class={[BORDER_UNSET_TOP_BOTTOM, bem('frame')]}
            style={frameStyle}
          />,
        ];
      }
    };

    const renderColumns = () => {
      const wrapHeight = optionHeight.value * +props.visibleOptionNum;
      const columnsStyle = { height: `${wrapHeight}px` };

      if (!props.loading && !hasOptions.value && slots.empty) {
        return slots.empty();
      }

      return (
        <div ref={columnsRef} class={bem('columns')} style={columnsStyle}>
          {renderColumnItems()}
          {renderMask(wrapHeight)}
        </div>
      );
    };

    const renderToolbar = () => {
      if (props.showToolbar && !parent) {
        return (
          <Toolbar
            v-slots={pick(slots, pickerToolbarSlots)}
            {...pick(props, pickerToolbarPropKeys)}
            onConfirm={confirm}
            onCancel={cancel}
          />
        );
      }
    };

    const resetSelectedValues = (columns: PickerColumn[]) => {
      columns.forEach((options, index) => {
        if (
          options.length &&
          !isOptionExist(options, selectedValues.value[index], fields.value)
        ) {
          setValue(index, getFirstEnabledOption(options)![fields.value.value]);
        }
      });
    };

    watch(currentColumns, (columns) => resetSelectedValues(columns), {
      immediate: true,
    });

    // preserve last emitted model value
    // when props.modelValue is updated by parent component,
    // the new value should be compared with the last emitted value
    let lastEmittedModelValue: Numeric[];
    watch(
      () => props.modelValue,
      (newValues) => {
        if (
          !isSameValue(newValues, selectedValues.value) &&
          !isSameValue(newValues, lastEmittedModelValue)
        ) {
          selectedValues.value = newValues.slice(0);
          lastEmittedModelValue = newValues.slice(0);
        }

        if (props.modelValue.length === 0) {
          resetSelectedValues(currentColumns.value);
        }
      },
      { deep: true },
    );

    watch(
      selectedValues,
      (newValues) => {
        if (!isSameValue(newValues, props.modelValue)) {
          lastEmittedModelValue = newValues.slice(0);
          emit('update:modelValue', lastEmittedModelValue);
        }
      },
      { immediate: true },
    );

    // useEventListener will set passive to `false` to eliminate the warning of Chrome
    useEventListener('touchmove', preventDefault, {
      target: columnsRef,
    });

    const getSelectedOptions = () => selectedOptions.value;

    useExpose<PickerExpose>({ confirm, getSelectedOptions });

    return () => (
      <div class={bem()}>
        {props.toolbarPosition === 'top' ? renderToolbar() : null}
        {props.loading ? <Loading class={bem('loading')} /> : null}
        {slots['columns-top']?.()}
        {renderColumns()}
        {slots['columns-bottom']?.()}
        {props.toolbarPosition === 'bottom' ? renderToolbar() : null}
      </div>
    );
  },
});
