import { defineComponent, type ExtractPropTypes } from 'vue';

import { createNamespace, numericProp, addUnit } from '../utils';

const [name, bem] = createNamespace('skeleton-title');

/**
 * @summary SkeletonTitle 骨架屏标题 - 用于在内容加载时显示标题占位
 * @attr {boolean} round - 是否显示圆角，默认 false
 * @attr {number|string} title-width - 标题宽度
 */
export const skeletonTitleProps = {
  round: Boolean,
  titleWidth: numericProp,
};

export type SkeletonTitleProps = ExtractPropTypes<typeof skeletonTitleProps>;

export default defineComponent({
  name,

  props: skeletonTitleProps,

  setup(props) {
    return () => (
      <h3
        class={bem([{ round: props.round }])}
        style={{ width: addUnit(props.titleWidth) }}
      />
    );
  },
});
