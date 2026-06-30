import { computed, defineComponent, type ExtractPropTypes } from 'vue';
import {
  addUnit,
  truthProp,
  numericProp,
  createNamespace,
  type Numeric,
} from '../utils';

const [name, bem] = createNamespace('progress');

/**
 * @summary Progress 进度条 - 用于展示操作的当前进度
 * @attr {number|string} percentage - 进度百分比，默认 0
 * @attr {number|string} stroke-width - 进度条粗细，默认单位为 px，默认 4px
 * @attr {string} color - 进度条颜色，默认 #1989fa
 * @attr {string} track-color - 轨道颜色，默认 #e5e5e5
 * @attr {string} pivot-text - 进度文字内容，默认百分比
 * @attr {string} pivot-color - 进度文字背景色，默认同进度条颜色
 * @attr {string} text-color - 进度文字颜色，默认 white
 * @attr {boolean} inactive - 是否置灰，默认 false
 * @attr {boolean} show-pivot - 是否显示进度文字，默认 true
 * @slot pivot - 自定义进度文字
 */
export const progressProps = {
  color: String,
  inactive: Boolean,
  pivotText: String,
  textColor: String,
  showPivot: truthProp,
  pivotColor: String,
  trackColor: String,
  strokeWidth: numericProp,
  percentage: {
    type: numericProp,
    default: 0,
    validator: (value: Numeric) => +value >= 0 && +value <= 100,
  },
};

export type ProgressProps = ExtractPropTypes<typeof progressProps>;

export default defineComponent({
  name,

  props: progressProps,

  setup(props, { slots }) {
    const background = computed(() =>
      props.inactive ? undefined : props.color,
    );

    const format = (rate: Numeric) => Math.min(Math.max(+rate, 0), 100);

    const renderPivot = () => {
      const { textColor, pivotText, pivotColor, percentage } = props;
      const safePercentage = format(percentage);
      const text = pivotText ?? `${safePercentage}%`;

      if (props.showPivot && (slots.pivot || text)) {
        const style = {
          color: textColor,
          left: `${safePercentage}%`,
          transform: `translate(-${safePercentage}%,-50%)`,
          background: pivotColor || background.value,
        };

        return (
          <span
            style={style}
            class={bem('pivot', { inactive: props.inactive })}
          >
            {slots.pivot ? slots.pivot({ percentage: safePercentage }) : text}
          </span>
        );
      }
    };

    return () => {
      const { trackColor, percentage, strokeWidth } = props;
      const safePercentage = format(percentage);
      const rootStyle = {
        background: trackColor,
        height: addUnit(strokeWidth),
      };
      const portionStyle = {
        width: `${safePercentage}%`,
        background: background.value,
      };

      return (
        <div class={bem()} style={rootStyle}>
          <span
            class={bem('portion', { inactive: props.inactive })}
            style={portionStyle}
          />
          {renderPivot()}
        </div>
      );
    };
  },
});
