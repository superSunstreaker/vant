import {
  inject,
  computed,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';
import {
  addUnit,
  numericProp,
  makeStringProp,
  createNamespace,
} from '../utils';
import { Badge, type BadgeProps } from '../badge';
import { CONFIG_PROVIDER_KEY } from '../config-provider/ConfigProvider';

const [name, bem] = createNamespace('icon');

const isImage = (name?: string) => name?.includes('/');

/**
 * @summary Icon 图标 - 字体图标和图片图标组件
 * @attr {string} name - 图标名称或图片链接
 * @attr {string} dot - 是否显示图标右上角小红点，默认 false
 * @attr {number|string} badge - 图标右上角徽标的内容
 * @attr {string} color - 图标颜色
 * @attr {number|string} size - 图标大小，默认 1em
 * @attr {string} tag - HTML 标签，默认 i
 * @attr {string} class-prefix - 类名前缀，默认 van-icon
 * @slot default - 自定义图标内容
 * @event click - 点击图标时触发，参数：event: MouseEvent
 */
export const iconProps = {
  dot: Boolean,
  tag: makeStringProp<keyof HTMLElementTagNameMap>('i'),
  name: String,
  size: numericProp,
  badge: numericProp,
  color: String,
  badgeProps: Object as PropType<Partial<BadgeProps>>,
  classPrefix: String,
};

export type IconProps = ExtractPropTypes<typeof iconProps>;

export default defineComponent({
  name,

  props: iconProps,

  setup(props, { slots }) {
    const config = inject(CONFIG_PROVIDER_KEY, null);

    const classPrefix = computed(
      () => props.classPrefix || config?.iconPrefix || bem(),
    );

    return () => {
      const { tag, dot, name, size, badge, color } = props;
      const isImageIcon = isImage(name);

      return (
        <Badge
          dot={dot}
          tag={tag}
          class={[
            classPrefix.value,
            isImageIcon ? '' : `${classPrefix.value}-${name}`,
          ]}
          style={{
            color,
            fontSize: addUnit(size),
          }}
          content={badge}
          {...props.badgeProps}
        >
          {slots.default?.()}
          {isImageIcon && <img class={bem('image')} src={name} />}
        </Badge>
      );
    };
  },
});
