import {
  Transition,
  defineComponent,
  type PropType,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';
import {
  truthProp,
  makeStringProp,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';
import { Icon } from '../icon';
import type { TagType, TagSize } from './types';

const [name, bem] = createNamespace('tag');

/**
 * @summary Tag 标签 - 用于标记和选择
 * @attr {string} size - 标签大小，可选值为 large / medium，默认与内容一致
 * @attr {string} type - 标签类型，可选值为 primary / success / warning / danger，默认 default
 * @attr {string} color - 标签颜色
 * @attr {string} text-color - 文本颜色，优先级高于 color 属性
 * @attr {boolean} mark - 是否为圆角样式，默认 false
 * @attr {boolean} plain - 是否为空心样式，默认 false
 * @attr {boolean} round - 是否为圆形样式，默认 false
 * @attr {boolean} show - 是否显示标签，默认 true
 * @attr {boolean} closeable - 是否为可关闭标签，默认 false
 * @slot default - 标签显示内容
 * @event close - 关闭标签时触发，参数：event: MouseEvent
 */
export const tagProps = {
  size: String as PropType<TagSize>,
  mark: Boolean,
  show: truthProp,
  type: makeStringProp<TagType>('default'),
  color: String,
  plain: Boolean,
  round: Boolean,
  textColor: String,
  closeable: Boolean,
};

export type TagProps = ExtractPropTypes<typeof tagProps>;

export default defineComponent({
  name,

  props: tagProps,

  emits: ['close'],

  setup(props, { slots, emit }) {
    const onClose = (event: MouseEvent) => {
      event.stopPropagation();
      emit('close', event);
    };

    const getStyle = (): CSSProperties => {
      if (props.plain) {
        return {
          color: props.textColor || props.color,
          borderColor: props.color,
        };
      }
      return {
        color: props.textColor,
        background: props.color,
      };
    };

    const renderTag = () => {
      const { type, mark, plain, round, size, closeable } = props;

      const classes: Record<string, unknown> = {
        mark,
        plain,
        round,
      };
      if (size) {
        classes[size] = size;
      }

      const CloseIcon = closeable && (
        <Icon
          name="cross"
          class={[bem('close'), HAPTICS_FEEDBACK]}
          onClick={onClose}
        />
      );

      return (
        <span style={getStyle()} class={bem([classes, type])}>
          {slots.default?.()}
          {CloseIcon}
        </span>
      );
    };

    return () => (
      <Transition name={props.closeable ? 'van-fade' : undefined}>
        {props.show ? renderTag() : null}
      </Transition>
    );
  },
});
