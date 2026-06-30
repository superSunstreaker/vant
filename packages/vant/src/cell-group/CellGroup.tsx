import { defineComponent, type ExtractPropTypes } from 'vue';
import { truthProp, createNamespace, BORDER_TOP_BOTTOM } from '../utils';
import { useScopeId } from '../composables/use-scope-id';

const [name, bem] = createNamespace('cell-group');

/**
 * @summary CellGroup 单元格组 - 用于将多个 Cell 组合在一起，可提供上下外边框
 * @attr {string} title - 分组标题
 * @attr {boolean} inset - 是否展示为圆角卡片风格，默认 false
 * @attr {boolean} border - 是否显示外边框，默认 true
 * @slot default - 默认插槽
 * @slot title - 自定义分组标题
 */
export const cellGroupProps = {
  title: String,
  inset: Boolean,
  border: truthProp,
};

export type CellGroupProps = ExtractPropTypes<typeof cellGroupProps>;

export default defineComponent({
  name,

  inheritAttrs: false,

  props: cellGroupProps,

  setup(props, { slots, attrs }) {
    const renderGroup = () => (
      <div
        class={[
          bem({ inset: props.inset }),
          { [BORDER_TOP_BOTTOM]: props.border && !props.inset },
        ]}
        {...attrs}
        {...useScopeId()}
      >
        {slots.default?.()}
      </div>
    );

    const renderTitle = () => (
      <div class={bem('title', { inset: props.inset })}>
        {slots.title ? slots.title() : props.title}
      </div>
    );

    return () => {
      if (props.title || slots.title) {
        return (
          <>
            {renderTitle()}
            {renderGroup()}
          </>
        );
      }

      return renderGroup();
    };
  },
});
