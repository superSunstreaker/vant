import { defineComponent, ref, type ExtractPropTypes } from 'vue';
import { truthProp, createNamespace } from '../utils';
import { useChildren } from '@vant/use';
import { usePlaceholder } from '../composables/use-placeholder';

const [name, bem] = createNamespace('action-bar');

export const ACTION_BAR_KEY = Symbol(name);

/**
 * @summary ActionBar 动作栏 - 用于为页面相关操作提供便捷交互
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @attr {boolean} placeholder - 是否在标签位置生成一个等高的占位元素，默认 false
 * @slot default - 默认插槽，用于放置 ActionBarIcon 和 ActionBarButton
 */
export const actionBarProps = {
  placeholder: Boolean,
  safeAreaInsetBottom: truthProp,
};

export type ActionBarProps = ExtractPropTypes<typeof actionBarProps>;

export default defineComponent({
  name,

  props: actionBarProps,

  setup(props, { slots }) {
    const root = ref<HTMLElement>();
    const renderPlaceholder = usePlaceholder(root, bem);
    const { linkChildren } = useChildren(ACTION_BAR_KEY);

    linkChildren();

    const renderActionBar = () => (
      <div
        ref={root}
        class={[bem(), { 'van-safe-area-bottom': props.safeAreaInsetBottom }]}
      >
        {slots.default?.()}
      </div>
    );

    return () => {
      if (props.placeholder) {
        return renderPlaceholder(renderActionBar);
      }
      return renderActionBar();
    };
  },
});
