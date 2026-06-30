import { computed, defineComponent, ref, type ExtractPropTypes } from 'vue';

// Utils
import {
  addUnit,
  truthProp,
  numericProp,
  preventDefault,
  makeStringProp,
  makeNumberProp,
  makeNumericProp,
  createNamespace,
} from '../utils';

// Composables
import { useRect, useCustomFieldValue, useEventListener } from '@vant/use';
import { useRefs } from '../composables/use-refs';
import { useTouch } from '../composables/use-touch';

// Components
import { Icon } from '../icon';

const [name, bem] = createNamespace('rate');

type RateStatus = 'full' | 'half' | 'void';

type RateListItem = {
  value: number;
  status: RateStatus;
};

function getRateStatus(
  value: number,
  index: number,
  allowHalf: boolean,
  readonly: boolean,
): RateListItem {
  if (value >= index) {
    return { status: 'full', value: 1 };
  }

  if (value + 0.5 >= index && allowHalf && !readonly) {
    return { status: 'half', value: 0.5 };
  }

  if (value + 1 >= index && allowHalf && readonly) {
    const cardinal = 10 ** 10;
    return {
      status: 'half',
      value: Math.round((value - index + 1) * cardinal) / cardinal,
    };
  }

  return { status: 'void', value: 0 };
}

/**
 * @summary Rate 评分 - 用于对事物进行评级操作
 * @attr {number} v-model - 当前分值
 * @attr {number|string} count - 图标总数，默认 5
 * @attr {number|string} size - 图标大小，默认单位为 px，默认 20px
 * @attr {number|string} gutter - 图标间距，默认单位为 px，默认 4px
 * @attr {string} color - 选中时的颜色，默认 #ee0a24
 * @attr {string} void-color - 未选中时的颜色，默认 #c8c9cc
 * @attr {string} disabled-color - 禁用时的颜色，默认 #c8c9cc
 * @attr {string} icon - 选中时的图标名称或图片链接，默认 star
 * @attr {string} void-icon - 未选中时的图标名称或图片链接，默认 star-o
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @attr {boolean} allow-half - 是否允许半选，默认 false
 * @attr {boolean} clearable - 是否允许再次点击后清除，默认 false
 * @attr {boolean} readonly - 是否为只读状态，只读状态下无法修改评分，默认 false
 * @attr {boolean} disabled - 是否禁用评分，默认 false
 * @attr {boolean} touchable - 是否可以通过滑动手势选择评分，默认 true
 * @event change - 当前分值变化时触发的事件，参数：currentValue: number
 */
export const rateProps = {
  size: numericProp,
  icon: makeStringProp('star'),
  color: String,
  count: makeNumericProp(5),
  gutter: numericProp,
  clearable: Boolean,
  readonly: Boolean,
  disabled: Boolean,
  voidIcon: makeStringProp('star-o'),
  allowHalf: Boolean,
  voidColor: String,
  touchable: truthProp,
  iconPrefix: String,
  modelValue: makeNumberProp(0),
  disabledColor: String,
};

export type RateProps = ExtractPropTypes<typeof rateProps>;

export default defineComponent({
  name,

  props: rateProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit }) {
    const touch = useTouch();
    const [itemRefs, setItemRefs] = useRefs();
    const groupRef = ref<Element>();

    const unselectable = computed(() => props.readonly || props.disabled);

    const untouchable = computed(() => unselectable.value || !props.touchable);

    const list = computed<RateListItem[]>(() =>
      Array(+props.count)
        .fill('')
        .map((_, i) =>
          getRateStatus(
            props.modelValue,
            i + 1,
            props.allowHalf,
            props.readonly,
          ),
        ),
    );

    let ranges: Array<{
      left: number;
      top: number;
      height: number;
      score: number;
    }>;

    let groupRefRect: DOMRect;
    let minRectTop = Number.MAX_SAFE_INTEGER;
    let maxRectTop = Number.MIN_SAFE_INTEGER;

    const updateRanges = () => {
      groupRefRect = useRect(groupRef);

      const rects = itemRefs.value.map(useRect);

      ranges = [];
      rects.forEach((rect, index) => {
        minRectTop = Math.min(rect.top, minRectTop);
        maxRectTop = Math.max(rect.top, maxRectTop);

        if (props.allowHalf) {
          ranges.push(
            {
              score: index + 0.5,
              left: rect.left,
              top: rect.top,
              height: rect.height,
            },
            {
              score: index + 1,
              left: rect.left + rect.width / 2,
              top: rect.top,
              height: rect.height,
            },
          );
        } else {
          ranges.push({
            score: index + 1,
            left: rect.left,
            top: rect.top,
            height: rect.height,
          });
        }
      });
    };

    const getScoreByPosition = (x: number, y: number) => {
      for (let i = ranges.length - 1; i > 0; i--) {
        if (y >= groupRefRect.top && y <= groupRefRect.bottom) {
          if (
            x > ranges[i].left &&
            y >= ranges[i].top &&
            y <= ranges[i].top + ranges[i].height
          ) {
            return ranges[i].score;
          }
        } else {
          const curTop = y < groupRefRect.top ? minRectTop : maxRectTop;

          if (x > ranges[i].left && ranges[i].top === curTop) {
            return ranges[i].score;
          }
        }
      }
      return props.allowHalf ? 0.5 : 1;
    };

    const select = (value: number) => {
      if (unselectable.value || value === props.modelValue) return;
      emit('update:modelValue', value);
      emit('change', value);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (untouchable.value) {
        return;
      }

      touch.start(event);
      updateRanges();
    };

    const onTouchMove = (event: TouchEvent) => {
      if (untouchable.value) {
        return;
      }

      touch.move(event);

      if (touch.isHorizontal() && !touch.isTap.value) {
        const { clientX, clientY } = event.touches[0];
        preventDefault(event);
        select(getScoreByPosition(clientX, clientY));
      }
    };

    const renderStar = (item: RateListItem, index: number) => {
      const {
        icon,
        size,
        color,
        count,
        gutter,
        voidIcon,
        disabled,
        voidColor,
        allowHalf,
        iconPrefix,
        disabledColor,
      } = props;
      const score = index + 1;
      const isFull = item.status === 'full';
      const isVoid = item.status === 'void';
      const renderHalf = allowHalf && item.value > 0 && item.value < 1;

      let style;
      if (gutter && score !== +count) {
        style = {
          paddingRight: addUnit(gutter),
        };
      }

      const onClickItem = (event: MouseEvent) => {
        updateRanges();
        let value = allowHalf
          ? getScoreByPosition(event.clientX, event.clientY)
          : score;
        if (
          props.clearable &&
          touch.isTap.value &&
          value === props.modelValue
        ) {
          value = 0;
        }
        select(value);
      };

      return (
        <div
          key={index}
          ref={setItemRefs(index)}
          role="radio"
          style={style}
          class={bem('item')}
          tabindex={disabled ? undefined : 0}
          aria-setsize={count}
          aria-posinset={score}
          aria-checked={!isVoid}
          onClick={onClickItem}
        >
          <Icon
            size={size}
            name={isFull ? icon : voidIcon}
            class={bem('icon', { disabled, full: isFull })}
            color={disabled ? disabledColor : isFull ? color : voidColor}
            classPrefix={iconPrefix}
          />
          {renderHalf && (
            <Icon
              size={size}
              style={{ width: item.value + 'em' }}
              name={isVoid ? voidIcon : icon}
              class={bem('icon', ['half', { disabled, full: !isVoid }])}
              color={disabled ? disabledColor : isVoid ? voidColor : color}
              classPrefix={iconPrefix}
            />
          )}
        </div>
      );
    };

    useCustomFieldValue(() => props.modelValue);

    // useEventListener will set passive to `false` to eliminate the warning of Chrome
    useEventListener('touchmove', onTouchMove, {
      target: groupRef,
    });

    return () => (
      <div
        ref={groupRef}
        role="radiogroup"
        class={bem({
          readonly: props.readonly,
          disabled: props.disabled,
        })}
        tabindex={props.disabled ? undefined : 0}
        aria-disabled={props.disabled}
        aria-readonly={props.readonly}
        onTouchstartPassive={onTouchStart}
      >
        {list.value.map(renderStar)}
      </div>
    );
  },
});
