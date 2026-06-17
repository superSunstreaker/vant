import { defineComponent, ExtractPropTypes } from 'vue';

import { createNamespace, numericProp } from '../utils';

export const DEFAULT_ROW_WIDTH = '100%';

/**
 * @summary SkeletonParagraph 骨架屏段落 - 用于在内容加载时显示段落占位
 * @attr {boolean} round - 是否显示圆角，默认 false
 * @attr {number|string} row-width - 段落宽度，默认 100%
 */
export const skeletonParagraphProps = {
  round: Boolean,
  rowWidth: {
    type: numericProp,
    default: DEFAULT_ROW_WIDTH,
  },
};

export type SkeletonParagraphProps = ExtractPropTypes<
  typeof skeletonParagraphProps
>;

const [name, bem] = createNamespace('skeleton-paragraph');

export default defineComponent({
  name,

  props: skeletonParagraphProps,

  setup(props) {
    return () => (
      <div
        class={bem([{ round: props.round }])}
        style={{ width: props.rowWidth }}
      />
    );
  },
});
