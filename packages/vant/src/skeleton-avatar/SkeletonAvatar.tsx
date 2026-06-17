import { defineComponent, ExtractPropTypes } from 'vue';

// Utils
import {
  numericProp,
  getSizeStyle,
  makeStringProp,
  createNamespace,
} from '../utils';

export type SkeletonAvatarShape = 'square' | 'round';

const [name, bem] = createNamespace('skeleton-avatar');

/**
 * @summary SkeletonAvatar 骨架屏头像 - 用于在内容加载时显示头像占位
 * @attr {number|string} avatar-size - 头像大小
 * @attr {string} avatar-shape - 头像形状，可选值为 square，默认 round
 */
export const skeletonAvatarProps = {
  avatarSize: numericProp,
  avatarShape: makeStringProp<SkeletonAvatarShape>('round'),
};

export type SkeletonAvatarProps = ExtractPropTypes<typeof skeletonAvatarProps>;

export default defineComponent({
  name,

  props: skeletonAvatarProps,

  setup(props) {
    return () => (
      <div
        class={bem([props.avatarShape])}
        style={getSizeStyle(props.avatarSize)}
      />
    );
  },
});
