import { defineComponent, type ExtractPropTypes, type InjectionKey } from 'vue';
import { makeStringProp, makeNumericProp, createNamespace } from '../utils';
import { useChildren } from '@vant/use';

const [name, bem] = createNamespace('steps');

export type StepsDirection = 'horizontal' | 'vertical';

/**
 * @summary Steps 步骤条 - 用于展示操作流程的各个环节，让用户了解当前的操作在整体流程中的位置
 * @attr {number|string} active - 当前步骤对应的索引值，默认 0
 * @attr {StepsDirection} direction - 步骤条方向，可选值为 vertical，默认 horizontal
 * @attr {string} active-icon - 当前步骤对应的底部图标，默认 checked
 * @attr {string} inactive-icon - 非当前步骤对应的底部图标
 * @attr {string} finish-icon - 已完成步骤对应的底部图标，优先级高于 inactive-icon
 * @attr {string} active-color - 当前步骤和已完成步骤的颜色，默认 #1989fa
 * @attr {string} inactive-color - 未激活步骤的颜色，默认 #969799
 * @attr {string} icon-prefix - 图标类名前缀，默认 van-icon
 * @slot default - 默认插槽，用于放置 Step
 * @event click-step - 点击步骤的标题或图标时触发，参数：index: number
 */
export const stepsProps = {
  active: makeNumericProp(0),
  direction: makeStringProp<StepsDirection>('horizontal'),
  activeIcon: makeStringProp('checked'),
  iconPrefix: String,
  finishIcon: String,
  activeColor: String,
  inactiveIcon: String,
  inactiveColor: String,
};

export type StepsProps = ExtractPropTypes<typeof stepsProps>;

export type StepsProvide = {
  props: StepsProps;
  onClickStep: (index: number) => void;
};

export const STEPS_KEY: InjectionKey<StepsProvide> = Symbol(name);

export default defineComponent({
  name,

  props: stepsProps,

  emits: ['clickStep'],

  setup(props, { emit, slots }) {
    const { linkChildren } = useChildren(STEPS_KEY);

    const onClickStep = (index: number) => emit('clickStep', index);

    linkChildren({
      props,
      onClickStep,
    });

    return () => (
      <div class={bem([props.direction])}>
        <div class={bem('items')}>{slots.default?.()}</div>
      </div>
    );
  },
});
