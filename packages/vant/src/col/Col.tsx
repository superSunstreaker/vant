import { computed, defineComponent, type ExtractPropTypes } from 'vue';
import {
  numericProp,
  createNamespace,
  makeNumericProp,
  makeStringProp,
  extend,
} from '../utils';
import { useParent } from '@vant/use';
import { ROW_KEY } from '../row/Row';

const [name, bem] = createNamespace('col');

/**
 * @summary Col 列 - 用于栅格布局中的列
 * @attr {number|string} span - 列元素宽度
 * @attr {number|string} offset - 列元素偏移距离
 * @attr {string} tag - 自定义元素标签，默认 div
 * @slot default - 默认插槽
 */
export const colProps = {
  tag: makeStringProp<keyof HTMLElementTagNameMap>('div'),
  span: makeNumericProp(0),
  offset: numericProp,
};

export type ColProps = ExtractPropTypes<typeof colProps>;

export default defineComponent({
  name,

  props: colProps,

  setup(props, { slots }) {
    const { parent, index } = useParent(ROW_KEY);

    const style = computed(() => {
      if (!parent) {
        return;
      }

      const { spaces, verticalSpaces } = parent;
      let styles = {};
      if (spaces && spaces.value && spaces.value[index.value]) {
        const { left, right } = spaces.value[index.value];
        styles = {
          paddingLeft: left ? `${left}px` : null,
          paddingRight: right ? `${right}px` : null,
        };
      }

      const { bottom } = verticalSpaces.value[index.value] || {};

      return extend(styles, {
        marginBottom: bottom ? `${bottom}px` : null,
      });
    });

    return () => {
      const { tag, span, offset } = props;

      return (
        <tag
          style={style.value}
          class={bem({ [span]: span, [`offset-${offset}`]: offset })}
        >
          {slots.default?.()}
        </tag>
      );
    };
  },
});
