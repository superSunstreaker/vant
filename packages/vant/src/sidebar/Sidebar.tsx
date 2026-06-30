import { defineComponent, type InjectionKey, type ExtractPropTypes } from 'vue';
import { makeNumericProp, createNamespace } from '../utils';
import { useChildren } from '@vant/use';

const [name, bem] = createNamespace('sidebar');

export type SidebarProvide = {
  getActive: () => number;
  setActive: (value: number) => void;
};

export const SIDEBAR_KEY: InjectionKey<SidebarProvide> = Symbol(name);

/**
 * @summary Sidebar 侧边导航 - 垂直展示的导航栏，用于在不同的内容区域之间进行切换
 * @attr {number|string} v-model - 当前导航项的索引，默认 0
 * @slot default - 默认插槽，用于放置 SidebarItem
 * @event change - 切换导航项时触发，参数：index: number
 */
export const sidebarProps = {
  modelValue: makeNumericProp(0),
};

export type SidebarProps = ExtractPropTypes<typeof sidebarProps>;

export default defineComponent({
  name,

  props: sidebarProps,

  emits: ['change', 'update:modelValue'],

  setup(props, { emit, slots }) {
    const { linkChildren } = useChildren(SIDEBAR_KEY);

    const getActive = () => +props.modelValue;

    const setActive = (value: number) => {
      if (value !== getActive()) {
        emit('update:modelValue', value);
        emit('change', value);
      }
    };

    linkChildren({
      getActive,
      setActive,
    });

    return () => (
      <div role="tablist" class={bem()}>
        {slots.default?.()}
      </div>
    );
  },
});
