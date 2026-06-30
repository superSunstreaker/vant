import { defineComponent, type ExtractPropTypes } from 'vue';
import {
  pick,
  extend,
  numericProp,
  unknownProp,
  makeStringProp,
  createNamespace,
} from '../utils';
import { Popup } from '../popup';
import { popupSharedProps } from '../popup/shared';
import type { NotifyType, NotifyPosition } from './types';

const [name, bem] = createNamespace('notify');

const popupInheritProps = [
  'lockScroll',
  'position',
  'show',
  'teleport',
  'zIndex',
] as const;

/**
 * @summary Notify 消息提示 - 在页面顶部展示消息提示，支持组件调用和函数调用两种方式
 * @attr {NotifyType} type - 提示类型，可选值为 primary / success / warning / danger，默认 danger
 * @attr {string} message - 文本内容
 * @attr {string} color - 字体颜色
 * @attr {string} background - 背景颜色
 * @attr {NotifyPosition} position - 展示位置，可选值为 bottom，默认 top
 * @attr {string|Array|object} class-name - 自定义类名
 * @attr {boolean} lock-scroll - 是否锁定背景滚动，默认 false
 * @slot default - 自定义内容
 */
export const notifyProps = extend({}, popupSharedProps, {
  type: makeStringProp<NotifyType>('danger'),
  color: String,
  message: numericProp,
  position: makeStringProp<NotifyPosition>('top'),
  className: unknownProp,
  background: String,
  lockScroll: Boolean,
});

export type NotifyProps = ExtractPropTypes<typeof notifyProps>;

export default defineComponent({
  name,

  props: notifyProps,

  emits: ['update:show'],

  setup(props, { emit, slots }) {
    const updateShow = (show: boolean) => emit('update:show', show);

    return () => (
      <Popup
        class={[bem([props.type]), props.className]}
        style={{
          color: props.color,
          background: props.background,
        }}
        overlay={false}
        duration={0.2}
        onUpdate:show={updateShow}
        {...pick(props, popupInheritProps)}
      >
        {slots.default ? slots.default() : props.message}
      </Popup>
    );
  },
});
