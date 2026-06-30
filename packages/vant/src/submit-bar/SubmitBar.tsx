import {
  ref,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';
import {
  truthProp,
  makeStringProp,
  makeNumericProp,
  createNamespace,
} from '../utils';

// Components
import { Icon } from '../icon';
import { Button, ButtonType } from '../button';
import { usePlaceholder } from '../composables/use-placeholder';

const [name, bem, t] = createNamespace('submit-bar');

export type SubmitBarTextAlign = 'left' | 'right';

/**
 * @summary SubmitBar 提交订单栏 - 用于展示订单金额与提交订单
 * @attr {number} price - 金额（单位分）
 * @attr {number|string} decimal-length - 金额小数点位数，默认 2
 * @attr {string} label - 金额左侧文案，默认 合计：
 * @attr {string} suffix-label - 金额右侧文案
 * @attr {SubmitBarTextAlign} text-align - 金额文案对齐方向，可选值为 left，默认 right
 * @attr {string} button-text - 按钮文字
 * @attr {string} button-type - 按钮类型，默认 danger
 * @attr {string} button-color - 自定义按钮颜色
 * @attr {string} tip - 在订单栏上方的提示文案
 * @attr {string} tip-icon - 提示文案左侧的图标名称或图片链接
 * @attr {string} currency - 货币符号，默认 ¥
 * @attr {boolean} disabled - 是否禁用按钮，默认 false
 * @attr {boolean} loading - 是否显示将按钮显示为加载中状态，默认 false
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @attr {boolean} placeholder - 是否在标签位置生成一个等高的占位元素，默认 false
 * @slot default - 自定义订单栏左侧内容
 * @slot button - 自定义按钮
 * @slot top - 自定义订单栏上方内容
 * @slot tip - 提示文案中的额外内容
 * @event submit - 按钮点击事件回调
 */
export const submitBarProps = {
  tip: String,
  label: String,
  price: Number,
  tipIcon: String,
  loading: Boolean,
  currency: makeStringProp('¥'),
  disabled: Boolean,
  textAlign: String as PropType<SubmitBarTextAlign>,
  buttonText: String,
  buttonType: makeStringProp<ButtonType>('danger'),
  buttonColor: String,
  suffixLabel: String,
  placeholder: Boolean,
  decimalLength: makeNumericProp(2),
  safeAreaInsetBottom: truthProp,
};

export type SubmitBarProps = ExtractPropTypes<typeof submitBarProps>;

export default defineComponent({
  name,

  props: submitBarProps,

  emits: ['submit'],

  setup(props, { emit, slots }) {
    const root = ref<HTMLElement>();
    const renderPlaceholder = usePlaceholder(root, bem);

    const renderText = () => {
      const { price, label, currency, textAlign, suffixLabel, decimalLength } =
        props;

      if (typeof price === 'number') {
        const pricePair = (price / 100).toFixed(+decimalLength).split('.');
        const decimal = decimalLength ? `.${pricePair[1]}` : '';

        return (
          <div class={bem('text')} style={{ textAlign }}>
            <span>{label || t('label')}</span>
            <span class={bem('price')}>
              {currency}
              <span class={bem('price-integer')}>{pricePair[0]}</span>
              {decimal}
            </span>
            {suffixLabel && (
              <span class={bem('suffix-label')}>{suffixLabel}</span>
            )}
          </div>
        );
      }
    };

    const renderTip = () => {
      const { tip, tipIcon } = props;
      if (slots.tip || tip) {
        return (
          <div class={bem('tip')}>
            {tipIcon && <Icon class={bem('tip-icon')} name={tipIcon} />}
            {tip && <span class={bem('tip-text')}>{tip}</span>}
            {slots.tip?.()}
          </div>
        );
      }
    };

    const onClickButton = () => emit('submit');

    const renderButton = () => {
      if (slots.button) {
        return slots.button();
      }

      return (
        <Button
          round
          type={props.buttonType}
          text={props.buttonText}
          class={bem('button', props.buttonType)}
          color={props.buttonColor}
          loading={props.loading}
          disabled={props.disabled}
          onClick={onClickButton}
        />
      );
    };

    const renderSubmitBar = () => (
      <div
        ref={root}
        class={[bem(), { 'van-safe-area-bottom': props.safeAreaInsetBottom }]}
      >
        {slots.top?.()}
        {renderTip()}
        <div class={bem('bar')}>
          {slots.default?.()}
          {renderText()}
          {renderButton()}
        </div>
      </div>
    );

    return () => {
      if (props.placeholder) {
        return renderPlaceholder(renderSubmitBar);
      }
      return renderSubmitBar();
    };
  },
});
