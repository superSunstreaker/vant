import { defineComponent, type PropType, type ExtractPropTypes } from 'vue';

// Utils
import {
  isDef,
  truthProp,
  makeArrayProp,
  makeStringProp,
  createNamespace,
} from '../utils';

// Components
import { Cell } from '../cell';

// Types
import type { CouponInfo } from '../coupon';

const [name, bem, t] = createNamespace('coupon-cell');

/**
 * @summary CouponCell 优惠券单元格 - 以单元格形式展示当前选中的优惠券
 * @attr {string} title - 单元格标题，默认 优惠券
 * @attr {number|number[]} chosen-coupon - 当前选中优惠券的索引，默认 -1
 * @attr {CouponInfo[]} coupons - 可用优惠券列表，默认 []
 * @attr {boolean} editable - 能否切换优惠券，默认 true
 * @attr {boolean} border - 是否显示内边框，默认 true
 * @attr {string} currency - 货币符号，默认 ¥
 */
export const couponCellProps = {
  title: String,
  border: truthProp,
  editable: truthProp,
  coupons: makeArrayProp<CouponInfo>(),
  currency: makeStringProp('¥'),
  chosenCoupon: {
    type: [Number, Array] as PropType<number | number[]>,
    default: -1,
  },
};

export type CouponCellProps = ExtractPropTypes<typeof couponCellProps>;

const getValue = (coupon: CouponInfo) => {
  const { value, denominations } = coupon;
  if (isDef(value)) {
    return value;
  }
  if (isDef(denominations)) {
    return denominations;
  }
  return 0;
};

function formatValue({ coupons, chosenCoupon, currency }: CouponCellProps) {
  let value = 0;
  let isExist = false;

  (Array.isArray(chosenCoupon) ? chosenCoupon : [chosenCoupon]).forEach((i) => {
    const coupon = coupons[+i];
    if (coupon) {
      isExist = true;
      value += getValue(coupon);
    }
  });

  if (isExist) {
    return `-${currency} ${(value / 100).toFixed(2)}`;
  }
  return coupons.length === 0 ? t('noCoupon') : t('count', coupons.length);
}

export default defineComponent({
  name,

  props: couponCellProps,

  setup(props) {
    return () => {
      const selected = Array.isArray(props.chosenCoupon)
        ? props.chosenCoupon.length
        : props.coupons[+props.chosenCoupon];
      return (
        <Cell
          class={bem()}
          value={formatValue(props)}
          title={props.title || t('title')}
          border={props.border}
          isLink={props.editable}
          valueClass={bem('value', { selected })}
        />
      );
    };
  },
});
