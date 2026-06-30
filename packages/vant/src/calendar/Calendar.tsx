import {
  ref,
  watch,
  computed,
  defineComponent,
  type PropType,
  type TeleportProps,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  pick,
  isDate,
  truthProp,
  numericProp,
  getScrollTop,
  makeStringProp,
  makeNumericProp,
} from '../utils';
import {
  t,
  bem,
  name,
  getToday,
  cloneDate,
  cloneDates,
  getPrevDay,
  getNextDay,
  compareDay,
  calcDateNum,
  compareMonth,
  getDayByOffset,
  getMonthByOffset,
} from './utils';

// Composables
import { raf, useRect, onMountedOrActivated } from '@vant/use';
import { useRefs } from '../composables/use-refs';
import { useExpose } from '../composables/use-expose';

// Components
import { Popup, PopupPosition } from '../popup';
import { Button } from '../button';
import { showToast } from '../toast';
import CalendarMonth from './CalendarMonth';
import CalendarHeader from './CalendarHeader';

// Types
import type {
  CalendarType,
  CalendarSwitchMode,
  CalendarExpose,
  CalendarDayItem,
  CalendarMonthInstance,
} from './types';

/**
 * @summary Calendar 日历 - 日历组件用于选择日期或日期区间
 * @attr {boolean} v-model:show - 是否显示日历弹窗，默认 false
 * @attr {CalendarType} type - 选择类型，可选值为 multiple / range，默认 single
 * @attr {CalendarSwitchMode} switch-mode - 切换模式，可选值为 month / year-month，默认 none
 * @attr {string} title - 日历标题，默认 日期选择
 * @attr {string} color - 主题色，对底部按钮和选中日期生效，默认 #1989fa
 * @attr {Date} min-date - 可选择的最小日期
 * @attr {Date} max-date - 可选择的最大日期
 * @attr {Date|Date[]|null} default-date - 默认选中的日期，默认今天
 * @attr {number|string} row-height - 日期行高，默认 64
 * @attr {Function} formatter - 日期格式化函数
 * @attr {boolean} poppable - 是否以弹层的形式展示日历，默认 true
 * @attr {boolean} lazy-render - 是否只渲染可视区域的内容，默认 true
 * @attr {boolean} show-mark - 是否显示月份背景水印，默认 true
 * @attr {boolean} show-title - 是否展示日历标题，默认 true
 * @attr {boolean} show-subtitle - 是否展示日历副标题，默认 true
 * @attr {boolean} show-confirm - 是否展示确认按钮，默认 true
 * @attr {boolean} readonly - 是否为只读状态，只读状态下不能选择日期，默认 false
 * @attr {string} confirm-text - 确认按钮的文字，默认 确认
 * @attr {string} confirm-disabled-text - 确认按钮处于禁用状态时的文字，默认 确认
 * @attr {number} first-day-of-week - 设置周起始日，0-6，默认 0
 * @attr {string} position - 弹出位置，可选值为 top / right / left，默认 bottom
 * @attr {boolean} round - 是否显示圆角弹窗，默认 true
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 true
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭，默认 true
 * @attr {boolean} safe-area-inset-top - 是否开启顶部安全区适配，默认 false
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @attr {string|Element} teleport - 指定挂载的节点
 * @attr {number|string} max-range - 日期区间最多可选天数
 * @attr {string} range-prompt - 范围选择超过最多可选天数时的提示文案
 * @attr {boolean} show-range-prompt - 范围选择超过最多可选天数时，是否展示提示文案，默认 true
 * @attr {boolean} allow-same-day - 是否允许日期范围的起止时间为同一天，默认 false
 * @slot title - 自定义标题
 * @slot subtitle - 自定义日历副标题
 * @slot footer - 自定义底部区域内容
 * @slot confirm-text - 自定义确认按钮的内容
 * @slot top-info - 自定义日期上方的提示信息
 * @slot bottom-info - 自定义日期下方的提示信息
 * @slot text - 自定义日期内容
 * @event select - 点击并选中任意日期时触发，参数：value: Date | Date[]
 * @event confirm - 日期选择完成后触发，参数：value: Date | Date[]
 * @event unselect - 当 type 为 multiple 时，取消选中日期时触发，参数：value: Date
 * @event month-show - 当某个月份进入可视区域时触发，参数：{ date: Date, title: string }
 * @event over-range - 范围选择超过最多可选天数时触发
 * @event click-subtitle - 点击日历副标题时触发，参数：event: MouseEvent
 * @event click-disabled-date - 点击禁用日期时触发，参数：value: Date | Date[]
 * @event panel-change - 日历面板切换时触发，参数：{ date: Date }
 */
export const calendarProps = {
  show: Boolean,
  type: makeStringProp<CalendarType>('single'),
  switchMode: makeStringProp<CalendarSwitchMode>('none'),
  title: String,
  color: String,
  round: truthProp,
  readonly: Boolean,
  poppable: truthProp,
  maxRange: makeNumericProp(null),
  position: makeStringProp<PopupPosition>('bottom'),
  teleport: [String, Object] as PropType<TeleportProps['to']>,
  showMark: truthProp,
  showTitle: truthProp,
  formatter: Function as PropType<(item: CalendarDayItem) => CalendarDayItem>,
  rowHeight: numericProp,
  confirmText: String,
  rangePrompt: String,
  lazyRender: truthProp,
  showConfirm: truthProp,
  defaultDate: [Date, Array] as PropType<Date | Date[] | null>,
  allowSameDay: Boolean,
  showSubtitle: truthProp,
  closeOnPopstate: truthProp,
  showRangePrompt: truthProp,
  confirmDisabledText: String,
  closeOnClickOverlay: truthProp,
  safeAreaInsetTop: Boolean,
  safeAreaInsetBottom: truthProp,
  minDate: {
    type: Date,
    validator: isDate,
  },
  maxDate: {
    type: Date,
    validator: isDate,
  },
  firstDayOfWeek: {
    type: numericProp,
    default: 0,
    validator: (val: number) => val >= 0 && val <= 6,
  },
};

export type CalendarProps = ExtractPropTypes<typeof calendarProps>;

export default defineComponent({
  name,

  props: calendarProps,

  emits: [
    'select',
    'confirm',
    'unselect',
    'monthShow',
    'overRange',
    'update:show',
    'clickSubtitle',
    'clickDisabledDate',
    'clickOverlay',
    'panelChange',
  ],

  setup(props, { emit, slots }) {
    const canSwitch = computed(() => props.switchMode !== 'none');

    const minDate = computed(() => {
      if (!props.minDate && !canSwitch.value) {
        return getToday();
      }

      return props.minDate;
    });

    const maxDate = computed(() => {
      if (!props.maxDate && !canSwitch.value) {
        return getMonthByOffset(getToday(), 6);
      }

      return props.maxDate;
    });

    const limitDateRange = (
      date: Date,
      min = minDate.value,
      max = maxDate.value,
    ) => {
      if (min && compareDay(date, min) === -1) {
        return min;
      }
      if (max && compareDay(date, max) === 1) {
        return max;
      }
      return date;
    };

    const getInitialDate = (defaultDate = props.defaultDate) => {
      const { type, allowSameDay } = props;

      if (defaultDate === null) {
        return defaultDate;
      }

      const now = getToday();

      if (type === 'range') {
        if (!Array.isArray(defaultDate)) {
          defaultDate = [];
        }

        // reset invalid default date
        if (defaultDate.length === 1 && compareDay(defaultDate[0], now) === 1) {
          defaultDate = [];
        }

        const min = minDate.value;
        const max = maxDate.value;

        const start = limitDateRange(
          defaultDate[0] || now,
          min,
          max ? (allowSameDay ? max : getPrevDay(max)) : undefined,
        );

        const end = limitDateRange(
          defaultDate[1] || (allowSameDay ? now : getNextDay(now)),
          min ? (allowSameDay ? min : getNextDay(min)) : undefined,
        );

        return [start, end];
      }

      if (type === 'multiple') {
        if (Array.isArray(defaultDate)) {
          return defaultDate.map((date) => limitDateRange(date));
        }
        return [limitDateRange(now)];
      }

      if (!defaultDate || Array.isArray(defaultDate)) {
        defaultDate = now;
      }
      return limitDateRange(defaultDate);
    };

    const getInitialPanelDate = () => {
      const date = Array.isArray(currentDate.value)
        ? currentDate.value[0]
        : currentDate.value;

      return date ? date : limitDateRange(getToday());
    };

    let bodyHeight: number;

    const bodyRef = ref<HTMLElement>();

    const currentDate = ref(getInitialDate());

    const currentPanelDate = ref<Date>(getInitialPanelDate());

    const currentMonthRef = ref<CalendarMonthInstance>();

    const [monthRefs, setMonthRefs] = useRefs<CalendarMonthInstance>();

    const dayOffset = computed(() =>
      props.firstDayOfWeek ? +props.firstDayOfWeek % 7 : 0,
    );

    const months = computed(() => {
      const months: Date[] = [];

      if (!minDate.value || !maxDate.value) {
        return months;
      }

      const cursor = new Date(minDate.value);

      cursor.setDate(1);

      do {
        months.push(new Date(cursor));
        cursor.setMonth(cursor.getMonth() + 1);
      } while (compareMonth(cursor, maxDate.value) !== 1);

      return months;
    });

    const buttonDisabled = computed(() => {
      if (currentDate.value) {
        if (props.type === 'range') {
          return (
            !(currentDate.value as Date[])[0] ||
            !(currentDate.value as Date[])[1]
          );
        }
        if (props.type === 'multiple') {
          return !(currentDate.value as Date[]).length;
        }
      }
      return !currentDate.value;
    });

    const getSelectedDate = () => currentDate.value;

    // calculate the position of the elements
    // and find the elements that needs to be rendered
    const onScroll = () => {
      const top = getScrollTop(bodyRef.value!);
      const bottom = top + bodyHeight;

      const heights = months.value.map((item, index) =>
        monthRefs.value[index].getHeight(),
      );
      const heightSum = heights.reduce((a, b) => a + b, 0);

      // iOS scroll bounce may exceed the range
      if (bottom > heightSum && top > 0) {
        return;
      }

      let height = 0;
      let currentMonth;
      const visibleRange = [-1, -1];

      for (let i = 0; i < months.value.length; i++) {
        const month = monthRefs.value[i];
        const visible = height <= bottom && height + heights[i] >= top;

        if (visible) {
          visibleRange[1] = i;

          if (!currentMonth) {
            currentMonth = month;
            visibleRange[0] = i;
          }

          if (!monthRefs.value[i].showed) {
            monthRefs.value[i].showed = true;
            emit('monthShow', {
              date: month.date,
              title: month.getTitle(),
            });
          }
        }

        height += heights[i];
      }

      months.value.forEach((month, index) => {
        const visible =
          index >= visibleRange[0] - 1 && index <= visibleRange[1] + 1;
        monthRefs.value[index].setVisible(visible);
      });

      /* istanbul ignore else */
      if (currentMonth) {
        currentMonthRef.value = currentMonth;
      }
    };

    const scrollToDate = (targetDate: Date) => {
      if (canSwitch.value) {
        currentPanelDate.value = targetDate;
      } else {
        raf(() => {
          months.value.some((month, index) => {
            if (compareMonth(month, targetDate) === 0) {
              if (bodyRef.value) {
                monthRefs.value[index].scrollToDate(bodyRef.value, targetDate);
              }
              return true;
            }

            return false;
          });

          onScroll();
        });
      }
    };

    const scrollToCurrentDate = () => {
      if (props.poppable && !props.show) {
        return;
      }

      if (currentDate.value) {
        const targetDate =
          props.type === 'single'
            ? (currentDate.value as Date)
            : (currentDate.value as Date[])[0];
        if (isDate(targetDate)) {
          scrollToDate(targetDate);
        }
      } else if (!canSwitch.value) {
        raf(onScroll);
      }
    };

    const init = () => {
      if (props.poppable && !props.show) {
        return;
      }

      if (!canSwitch.value) {
        raf(() => {
          // add Math.floor to avoid decimal height issues
          // https://github.com/vant-ui/vant/issues/5640
          bodyHeight = Math.floor(useRect(bodyRef).height);
        });
      }

      scrollToCurrentDate();
    };

    const reset = (date = getInitialDate()) => {
      currentDate.value = date;
      scrollToCurrentDate();
    };

    const checkRange = (date: [Date, Date]) => {
      const { maxRange, rangePrompt, showRangePrompt } = props;

      if (maxRange && calcDateNum(date) > +maxRange) {
        if (showRangePrompt) {
          showToast(rangePrompt || t('rangePrompt', maxRange));
        }
        emit('overRange');
        return false;
      }

      return true;
    };

    const onPanelChange = (date: Date) => {
      currentPanelDate.value = date;
      emit('panelChange', { date });
    };

    const onConfirm = () =>
      emit('confirm', currentDate.value ?? cloneDates(currentDate.value!));

    const select = (date: Date | Date[], complete?: boolean) => {
      const setCurrentDate = (date: Date | Date[]) => {
        currentDate.value = date;
        emit('select', cloneDates(date));
      };

      if (complete && props.type === 'range') {
        const valid = checkRange(date as [Date, Date]);

        if (!valid) {
          // auto selected to max range
          setCurrentDate([
            (date as Date[])[0],
            getDayByOffset((date as Date[])[0], +props.maxRange - 1),
          ]);
          return;
        }
      }

      setCurrentDate(date);

      if (complete && !props.showConfirm) {
        onConfirm();
      }
    };

    // get first disabled calendarDay between date range
    const getDisabledDate = (
      disabledDays: CalendarDayItem[],
      startDay: Date,
      date: Date,
    ): Date | undefined =>
      disabledDays.find(
        (day) =>
          compareDay(startDay, day.date!) === -1 &&
          compareDay(day.date!, date) === -1,
      )?.date;

    // disabled calendarDay
    const disabledDays = computed(() =>
      monthRefs.value.reduce((arr, ref) => {
        arr.push(...(ref.disabledDays?.value ?? []));
        return arr;
      }, [] as CalendarDayItem[]),
    );

    const onClickDay = (item: CalendarDayItem) => {
      if (props.readonly || !item.date) {
        return;
      }

      const { date } = item;
      const { type } = props;

      if (type === 'range') {
        if (!currentDate.value) {
          select([date]);
          return;
        }

        const [startDay, endDay] = currentDate.value as [Date, Date];

        if (startDay && !endDay) {
          const compareToStart = compareDay(date, startDay);

          if (compareToStart === 1) {
            const disabledDay = getDisabledDate(
              disabledDays.value,
              startDay,
              date,
            );

            if (disabledDay) {
              const endDay = getPrevDay(disabledDay);
              if (compareDay(startDay, endDay) === -1) {
                select([startDay, endDay]);
              } else {
                select([date]);
              }
            } else {
              select([startDay, date], true);
            }
          } else if (compareToStart === -1) {
            select([date]);
          } else if (props.allowSameDay) {
            select([date, date], true);
          }
        } else {
          select([date]);
        }
      } else if (type === 'multiple') {
        if (!currentDate.value) {
          select([date]);
          return;
        }
        const dates = currentDate.value as Date[];

        const selectedIndex = dates.findIndex(
          (dateItem: Date) => compareDay(dateItem, date) === 0,
        );

        if (selectedIndex !== -1) {
          const [unselectedDate] = dates.splice(selectedIndex, 1);
          emit('unselect', cloneDate(unselectedDate));
        } else if (props.maxRange && dates.length >= +props.maxRange) {
          showToast(props.rangePrompt || t('rangePrompt', props.maxRange));
        } else {
          select([...dates, date]);
        }
      } else {
        select(date, true);
      }
    };

    const onClickOverlay = (event: MouseEvent) => emit('clickOverlay', event);

    const updateShow = (value: boolean) => emit('update:show', value);

    const renderMonth = (date: Date, index: number) => {
      const showMonthTitle = index !== 0 || !props.showSubtitle;
      return (
        <CalendarMonth
          v-slots={pick(slots, [
            'top-info',
            'bottom-info',
            'month-title',
            'text',
          ])}
          ref={canSwitch.value ? currentMonthRef : setMonthRefs(index)}
          date={date}
          currentDate={currentDate.value}
          showMonthTitle={showMonthTitle}
          firstDayOfWeek={dayOffset.value}
          lazyRender={canSwitch.value ? false : props.lazyRender}
          maxDate={maxDate.value}
          minDate={minDate.value}
          {...pick(props, [
            'type',
            'color',
            'showMark',
            'formatter',
            'rowHeight',
            'showSubtitle',
            'allowSameDay',
          ])}
          onClick={onClickDay}
          onClickDisabledDate={(item) => emit('clickDisabledDate', item)}
        />
      );
    };

    const renderFooterButton = () => {
      if (slots.footer) {
        return slots.footer();
      }

      if (props.showConfirm) {
        const slot = slots['confirm-text'];
        const disabled = buttonDisabled.value;
        const text = disabled ? props.confirmDisabledText : props.confirmText;
        return (
          <Button
            round
            block
            type="primary"
            color={props.color}
            class={bem('confirm')}
            disabled={disabled}
            nativeType="button"
            onClick={onConfirm}
          >
            {slot ? slot({ disabled }) : text || t('confirm')}
          </Button>
        );
      }
    };

    const renderFooter = () => (
      <div
        class={[
          bem('footer'),
          { 'van-safe-area-bottom': props.safeAreaInsetBottom },
        ]}
      >
        {renderFooterButton()}
      </div>
    );

    const renderCalendar = () => (
      <div class={bem()}>
        <CalendarHeader
          v-slots={pick(slots, [
            'title',
            'subtitle',
            'prev-month',
            'prev-year',
            'next-month',
            'next-year',
          ])}
          date={currentMonthRef.value?.date}
          maxDate={maxDate.value}
          minDate={minDate.value}
          title={props.title}
          subtitle={currentMonthRef.value?.getTitle()}
          showTitle={props.showTitle}
          showSubtitle={props.showSubtitle}
          switchMode={props.switchMode}
          firstDayOfWeek={dayOffset.value}
          onClickSubtitle={(event: MouseEvent) => emit('clickSubtitle', event)}
          onPanelChange={onPanelChange}
        />
        <div
          ref={bodyRef}
          class={bem('body')}
          onScroll={canSwitch.value ? undefined : onScroll}
        >
          {canSwitch.value
            ? renderMonth(currentPanelDate.value, 0)
            : months.value.map(renderMonth)}
        </div>
        {renderFooter()}
      </div>
    );

    watch(() => props.show, init);
    watch(
      () => [props.type, props.minDate, props.maxDate, props.switchMode],
      () => reset(getInitialDate(currentDate.value)),
    );
    watch(
      () => props.defaultDate,
      (value) => {
        reset(value);
      },
    );

    useExpose<CalendarExpose>({
      reset,
      scrollToDate,
      getSelectedDate,
    });

    onMountedOrActivated(init);

    return () => {
      if (props.poppable) {
        return (
          <Popup
            v-slots={{ default: renderCalendar }}
            show={props.show}
            class={bem('popup')}
            round={props.round}
            position={props.position}
            closeable={props.showTitle || props.showSubtitle}
            teleport={props.teleport}
            closeOnPopstate={props.closeOnPopstate}
            safeAreaInsetTop={props.safeAreaInsetTop}
            closeOnClickOverlay={props.closeOnClickOverlay}
            onClickOverlay={onClickOverlay}
            onUpdate:show={updateShow}
          />
        );
      }

      return renderCalendar();
    };
  },
});
