import { defineComponent, type ExtractPropTypes } from 'vue';
import { truthProp, makeStringProp, createNamespace } from '../utils';

const [name, bem] = createNamespace('divider');

export type DividerContentPosition = 'left' | 'center' | 'right';

/**
 * @summary Divider 分割线 - 用于将内容分隔为多个区域
 * @attr {boolean} dashed - 是否使用虚线，默认 false
 * @attr {boolean} hairline - 是否使用 0.5px 线，默认 true
 * @attr {string} content-position - 内容位置，可选值为 left / right，默认 center
 * @attr {boolean} vertical - 是否使用垂直，默认 false
 * @slot default - 内容
 */
export const dividerProps = {
  dashed: Boolean,
  hairline: truthProp,
  vertical: Boolean,
  contentPosition: makeStringProp<DividerContentPosition>('center'),
};

export type DividerProps = ExtractPropTypes<typeof dividerProps>;

export default defineComponent({
  name,

  props: dividerProps,

  setup(props, { slots }) {
    return () => (
      <div
        role="separator"
        class={bem({
          dashed: props.dashed,
          hairline: props.hairline,
          vertical: props.vertical,
          [`content-${props.contentPosition}`]:
            !!slots.default && !props.vertical,
        })}
      >
        {!props.vertical && slots.default?.()}
      </div>
    );
  },
});
