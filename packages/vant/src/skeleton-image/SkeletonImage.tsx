import { defineComponent, type ExtractPropTypes } from 'vue';

import {
  numericProp,
  getSizeStyle,
  makeStringProp,
  createNamespace,
} from '../utils';

import { Icon } from '../icon';

const [name, bem] = createNamespace('skeleton-image');

export type SkeletonImageShape = 'square' | 'round';

/**
 * @summary SkeletonImage 骨架屏图片 - 用于在内容加载时显示图片占位
 * @attr {number|string} image-size - 图片大小
 * @attr {string} image-shape - 图片形状，可选值为 round，默认 square
 */
export const skeletonImageProps = {
  imageSize: numericProp,
  imageShape: makeStringProp<SkeletonImageShape>('square'),
};

export type SkeletonImageProps = ExtractPropTypes<typeof skeletonImageProps>;

export default defineComponent({
  name,

  props: skeletonImageProps,

  setup(props) {
    return () => (
      <div
        class={bem([props.imageShape])}
        style={getSizeStyle(props.imageSize)}
      >
        <Icon name={'photo'} class={bem('icon')} />
      </div>
    );
  },
});
