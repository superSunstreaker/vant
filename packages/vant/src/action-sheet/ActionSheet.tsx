import { nextTick, defineComponent, type ExtractPropTypes } from 'vue';

// Utils
import {
  pick,
  extend,
  truthProp,
  makeArrayProp,
  makeStringProp,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';

// Components
import { Icon } from '../icon';
import { Popup } from '../popup';
import { Loading } from '../loading';
import { popupSharedProps, popupSharedPropKeys } from '../popup/shared';

const [name, bem] = createNamespace('action-sheet');

export type ActionSheetAction = {
  icon?: string;
  name?: string;
  color?: string;
  subname?: string;
  loading?: boolean;
  disabled?: boolean;
  callback?: (action: ActionSheetAction) => void;
  className?: unknown;
};

/**
 * @summary ActionSheet 动作面板 - 底部弹起的模态面板，包含与当前情境相关的多个选项
 * @attr {string} title - 顶部标题
 * @attr {boolean} round - 是否显示圆角，默认 true
 * @attr {ActionSheetAction[]} actions - 面板选项列表，默认 []
 * @attr {string} close-icon - 关闭图标名称或图片链接，默认 cross
 * @attr {boolean} closeable - 是否显示关闭图标，默认 true
 * @attr {string} cancel-text - 取消按钮文字
 * @attr {string} description - 选项上方的描述信息
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 true
 * @attr {boolean} close-on-click-action - 是否在点击选项后关闭，默认 false
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @slot default - 自定义面板的展示内容
 * @slot description - 自定义描述文案
 * @slot cancel - 自定义取消按钮内容
 * @slot action - 自定义选项内容
 * @event select - 点击选项时触发，禁用或加载状态下不会触发，参数：action: ActionSheetAction, index: number
 * @event cancel - 点击取消按钮时触发
 */
export const actionSheetProps = extend({}, popupSharedProps, {
  title: String,
  round: truthProp,
  actions: makeArrayProp<ActionSheetAction>(),
  closeIcon: makeStringProp('cross'),
  closeable: truthProp,
  cancelText: String,
  description: String,
  closeOnPopstate: truthProp,
  closeOnClickAction: Boolean,
  safeAreaInsetBottom: truthProp,
});

export type ActionSheetProps = ExtractPropTypes<typeof actionSheetProps>;

const popupInheritKeys = [
  ...popupSharedPropKeys,
  'round',
  'closeOnPopstate',
  'safeAreaInsetBottom',
] as const;

export default defineComponent({
  name,

  props: actionSheetProps,

  emits: ['select', 'cancel', 'update:show'],

  setup(props, { slots, emit }) {
    const updateShow = (show: boolean) => emit('update:show', show);

    const onCancel = () => {
      updateShow(false);
      emit('cancel');
    };

    const renderHeader = () => {
      if (props.title) {
        return (
          <div class={bem('header')}>
            {props.title}
            {props.closeable && (
              <Icon
                name={props.closeIcon}
                class={[bem('close'), HAPTICS_FEEDBACK]}
                onClick={onCancel}
              />
            )}
          </div>
        );
      }
    };

    const renderCancel = () => {
      if (slots.cancel || props.cancelText) {
        return [
          <div class={bem('gap')} />,
          <button type="button" class={bem('cancel')} onClick={onCancel}>
            {slots.cancel ? slots.cancel() : props.cancelText}
          </button>,
        ];
      }
    };

    const renderIcon = (action: ActionSheetAction) => {
      if (action.icon) {
        return <Icon class={bem('item-icon')} name={action.icon} />;
      }
    };

    const renderActionContent = (action: ActionSheetAction, index: number) => {
      if (action.loading) {
        return <Loading class={bem('loading-icon')} />;
      }

      if (slots.action) {
        return slots.action({ action, index });
      }

      return [
        <span class={bem('name')}>{action.name}</span>,
        action.subname && <div class={bem('subname')}>{action.subname}</div>,
      ];
    };

    const renderAction = (action: ActionSheetAction, index: number) => {
      const { color, loading, callback, disabled, className } = action;

      const onClick = () => {
        if (disabled || loading) {
          return;
        }

        if (callback) {
          callback(action);
        }

        if (props.closeOnClickAction) {
          updateShow(false);
        }

        nextTick(() => emit('select', action, index));
      };

      return (
        <button
          type="button"
          style={{ color }}
          class={[bem('item', { loading, disabled }), className]}
          onClick={onClick}
        >
          {renderIcon(action)}
          {renderActionContent(action, index)}
        </button>
      );
    };

    const renderDescription = () => {
      if (props.description || slots.description) {
        const content = slots.description
          ? slots.description()
          : props.description;
        return <div class={bem('description')}>{content}</div>;
      }
    };

    return () => (
      <Popup
        class={bem()}
        position="bottom"
        onUpdate:show={updateShow}
        {...pick(props, popupInheritKeys)}
      >
        {renderHeader()}
        {renderDescription()}
        <div class={bem('content')}>
          {props.actions.map(renderAction)}
          {slots.default?.()}
        </div>
        {renderCancel()}
      </Popup>
    );
  },
});
