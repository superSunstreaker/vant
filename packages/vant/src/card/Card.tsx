import { defineComponent, type ExtractPropTypes } from 'vue';

// Utils
import { isDef, numericProp, makeStringProp, createNamespace } from '../utils';

// Components
import { Tag } from '../tag';
import { Image } from '../image';

const [name, bem] = createNamespace('card');

/**
 * @summary Card 卡片 - 商品卡片，用于展示商品的图片、价格等信息
 * @attr {string} thumb - 左侧图片 URL
 * @attr {string} title - 标题
 * @attr {string} desc - 描述
 * @attr {string} tag - 图片角标
 * @attr {number|string} num - 商品数量
 * @attr {number|string} price - 商品价格
 * @attr {number|string} origin-price - 商品划线原价
 * @attr {boolean} centered - 内容是否垂直居中，默认 false
 * @attr {string} currency - 货币符号，默认 ¥
 * @attr {string} thumb-link - 点击左侧图片后跳转的链接地址
 * @attr {boolean} lazy-load - 是否开启图片懒加载，须配合 Lazyload 组件使用，默认 false
 * @slot title - 自定义标题
 * @slot desc - 自定义描述
 * @slot num - 自定义数量
 * @slot price - 自定义价格
 * @slot origin-price - 自定义商品原价
 * @slot price-top - 自定义价格上方区域
 * @slot bottom - 自定义价格下方区域
 * @slot thumb - 自定义图片
 * @slot tag - 自定义图片角标
 * @slot tags - 自定义描述下方标签区域
 * @slot footer - 自定义右下角内容
 * @event click-thumb - 点击自定义图片时触发，参数：event: MouseEvent
 */
export const cardProps = {
  tag: String,
  num: numericProp,
  desc: String,
  thumb: String,
  title: String,
  price: numericProp,
  centered: Boolean,
  lazyLoad: Boolean,
  currency: makeStringProp('¥'),
  thumbLink: String,
  originPrice: numericProp,
};

export type CardProps = ExtractPropTypes<typeof cardProps>;

export default defineComponent({
  name,

  props: cardProps,

  emits: ['clickThumb'],

  setup(props, { slots, emit }) {
    const renderTitle = () => {
      if (slots.title) {
        return slots.title();
      }

      if (props.title) {
        return (
          <div class={[bem('title'), 'van-multi-ellipsis--l2']}>
            {props.title}
          </div>
        );
      }
    };

    const renderThumbTag = () => {
      if (slots.tag || props.tag) {
        return (
          <div class={bem('tag')}>
            {slots.tag ? (
              slots.tag()
            ) : (
              <Tag mark type="primary">
                {props.tag}
              </Tag>
            )}
          </div>
        );
      }
    };

    const renderThumbImage = () => {
      if (slots.thumb) {
        return slots.thumb();
      }

      return (
        <Image
          src={props.thumb}
          fit="cover"
          width="100%"
          height="100%"
          lazyLoad={props.lazyLoad}
        />
      );
    };

    const renderThumb = () => {
      if (slots.thumb || props.thumb) {
        return (
          <a
            href={props.thumbLink}
            class={bem('thumb')}
            onClick={(event: MouseEvent) => emit('clickThumb', event)}
          >
            {renderThumbImage()}
            {renderThumbTag()}
          </a>
        );
      }
    };

    const renderDesc = () => {
      if (slots.desc) {
        return slots.desc();
      }
      if (props.desc) {
        return <div class={[bem('desc'), 'van-ellipsis']}>{props.desc}</div>;
      }
    };

    const renderPriceText = () => {
      const priceArr = props.price!.toString().split('.');
      return (
        <div>
          <span class={bem('price-currency')}>{props.currency}</span>
          <span class={bem('price-integer')}>{priceArr[0]}</span>
          {priceArr.length > 1 && (
            <>
              .<span class={bem('price-decimal')}>{priceArr[1]}</span>
            </>
          )}
        </div>
      );
    };

    return () => {
      const showNum = slots.num || isDef(props.num);
      const showPrice = slots.price || isDef(props.price);
      const showOriginPrice = slots['origin-price'] || isDef(props.originPrice);
      const showBottom =
        showNum || showPrice || showOriginPrice || slots.bottom;

      const Price = showPrice && (
        <div class={bem('price')}>
          {slots.price ? slots.price() : renderPriceText()}
        </div>
      );

      const OriginPrice = showOriginPrice && (
        <div class={bem('origin-price')}>
          {slots['origin-price']
            ? slots['origin-price']()
            : `${props.currency} ${props.originPrice}`}
        </div>
      );

      const Num = showNum && (
        <div class={bem('num')}>
          {slots.num ? slots.num() : `x${props.num}`}
        </div>
      );

      const Footer = slots.footer && (
        <div class={bem('footer')}>{slots.footer()}</div>
      );

      const Bottom = showBottom && (
        <div class={bem('bottom')}>
          {slots['price-top']?.()}
          {Price}
          {OriginPrice}
          {Num}
          {slots.bottom?.()}
        </div>
      );

      return (
        <div class={bem()}>
          <div class={bem('header')}>
            {renderThumb()}
            <div class={bem('content', { centered: props.centered })}>
              <div>
                {renderTitle()}
                {renderDesc()}
                {slots.tags?.()}
              </div>
              {Bottom}
            </div>
          </div>
          {Footer}
        </div>
      );
    };
  },
});
