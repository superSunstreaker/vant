import {
  ref,
  reactive,
  withKeys,
  defineComponent,
  type PropType,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  noop,
  pick,
  extend,
  addUnit,
  truthProp,
  isFunction,
  BORDER_TOP,
  BORDER_LEFT,
  unknownProp,
  numericProp,
  makeStringProp,
  callInterceptor,
  createNamespace,
  type ComponentInstance,
} from '../utils';
import { popupSharedProps, popupSharedPropKeys } from '../popup/shared';

// Components
import { Popup } from '../popup';
import { Button } from '../button';
import { ActionBar } from '../action-bar';
import { ActionBarButton } from '../action-bar-button';

// Types
import type {
  DialogTheme,
  DialogAction,
  DialogMessage,
  DialogMessageAlign,
} from './types';

const [name, bem, t] = createNamespace('dialog');

/**
 * @summary Dialog 弹出框 - 弹出模态框，常用于消息提示、消息确认，或在当前页面内完成特定的交互操作
 * @attr {string} title - 标题
 * @attr {DialogTheme} theme - 样式风格，可选值为 round-button，默认 default
 * @attr {number|string} width - 弹窗宽度，默认单位为 px，默认 320px
 * @attr {string|Function} message - 文本内容，支持通过 \n 换行
 * @attr {boolean} allow-html - 是否允许 message 内容中渲染 HTML，默认 false
 * @attr {string} message-align - 内容水平对齐方式，可选值为 left / right / justify，默认 center
 * @attr {boolean} show-confirm-button - 是否展示确认按钮，默认 true
 * @attr {boolean} show-cancel-button - 是否展示取消按钮，默认 false
 * @attr {string} confirm-button-text - 确认按钮文案，默认 确认
 * @attr {string} confirm-button-color - 确认按钮颜色，默认 #ee0a24
 * @attr {boolean} confirm-button-disabled - 是否禁用确认按钮，默认 false
 * @attr {string} cancel-button-text - 取消按钮文案，默认 取消
 * @attr {string} cancel-button-color - 取消按钮颜色，默认 black
 * @attr {boolean} cancel-button-disabled - 是否禁用取消按钮，默认 false
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 true
 * @attr {boolean} close-on-click-overlay - 是否在点击遮罩层后关闭弹窗，默认 false
 * @attr {boolean} keyboard-enabled - 是否启用键盘能力，默认 true
 * @attr {boolean} destroy-on-close - 是否在关闭时销毁内容，默认 false
 * @attr {Function} callback - 点击按钮时的回调函数
 * @slot default - 自定义内容
 * @slot title - 自定义标题
 * @slot footer - 自定义底部按钮区域
 * @event confirm - 点击确认按钮时触发
 * @event cancel - 点击取消按钮时触发
 */
export const dialogProps = extend({}, popupSharedProps, {
  title: String,
  theme: String as PropType<DialogTheme>,
  width: numericProp,
  message: [String, Function] as PropType<DialogMessage>,
  callback: Function as PropType<(action?: DialogAction) => void>,
  allowHtml: Boolean,
  className: unknownProp,
  transition: makeStringProp('van-dialog-bounce'),
  messageAlign: String as PropType<DialogMessageAlign>,
  closeOnPopstate: truthProp,
  showCancelButton: Boolean,
  cancelButtonText: String,
  cancelButtonColor: String,
  cancelButtonDisabled: Boolean,
  confirmButtonText: String,
  confirmButtonColor: String,
  confirmButtonDisabled: Boolean,
  showConfirmButton: truthProp,
  closeOnClickOverlay: Boolean,
  keyboardEnabled: truthProp,
  destroyOnClose: Boolean,
});

export type DialogProps = ExtractPropTypes<typeof dialogProps>;

const popupInheritKeys = [
  ...popupSharedPropKeys,
  'transition',
  'closeOnPopstate',
  'destroyOnClose',
] as const;

export default defineComponent({
  name,

  props: dialogProps,

  emits: ['confirm', 'cancel', 'keydown', 'update:show'],

  setup(props, { emit, slots }) {
    const root = ref<ComponentInstance>();
    const loading = reactive({
      confirm: false,
      cancel: false,
    });

    const updateShow = (value: boolean) => emit('update:show', value);

    const close = (action: DialogAction) => {
      updateShow(false);
      props.callback?.(action);
    };

    const getActionHandler = (action: DialogAction) => () => {
      // should not trigger close event when hidden
      if (!props.show) {
        return;
      }

      emit(action);

      if (props.beforeClose) {
        loading[action] = true;
        callInterceptor(props.beforeClose, {
          args: [action],
          done() {
            close(action);
            loading[action] = false;
          },
          canceled() {
            loading[action] = false;
          },
        });
      } else {
        close(action);
      }
    };

    const onCancel = getActionHandler('cancel');
    const onConfirm = getActionHandler('confirm');
    const onKeydown = withKeys(
      (event: KeyboardEvent) => {
        if (!props.keyboardEnabled) {
          return;
        }
        // skip keyboard events of child elements
        if (event.target !== root.value?.popupRef?.value) {
          return;
        }

        const onEventType: Record<string, () => void> = {
          Enter: props.showConfirmButton ? onConfirm : noop,
          Escape: props.showCancelButton ? onCancel : noop,
        };

        onEventType[event.key]();
        emit('keydown', event);
      },
      ['enter', 'esc'],
    );

    const renderTitle = () => {
      const title = slots.title ? slots.title() : props.title;
      if (title) {
        return (
          <div
            class={bem('header', {
              isolated: !props.message && !slots.default,
            })}
          >
            {title}
          </div>
        );
      }
    };

    const renderMessage = (hasTitle: boolean) => {
      const { message, allowHtml, messageAlign } = props;
      const classNames = bem('message', {
        'has-title': hasTitle,
        [messageAlign as string]: messageAlign,
      });

      const content = isFunction(message) ? message() : message;

      if (allowHtml && typeof content === 'string') {
        return <div class={classNames} innerHTML={content} />;
      }

      return <div class={classNames}>{content}</div>;
    };

    const renderContent = () => {
      if (slots.default) {
        return <div class={bem('content')}>{slots.default()}</div>;
      }

      const { title, message, allowHtml } = props;
      if (message) {
        const hasTitle = !!(title || slots.title);
        return (
          <div
            // add key to force re-render
            // see: https://github.com/vant-ui/vant/issues/7963
            key={allowHtml ? 1 : 0}
            class={bem('content', { isolated: !hasTitle })}
          >
            {renderMessage(hasTitle)}
          </div>
        );
      }
    };

    const renderButtons = () => (
      <div class={[BORDER_TOP, bem('footer')]}>
        {props.showCancelButton && (
          <Button
            size="large"
            text={props.cancelButtonText || t('cancel')}
            class={bem('cancel')}
            style={{ color: props.cancelButtonColor }}
            loading={loading.cancel}
            disabled={props.cancelButtonDisabled}
            onClick={onCancel}
          />
        )}
        {props.showConfirmButton && (
          <Button
            size="large"
            text={props.confirmButtonText || t('confirm')}
            class={[bem('confirm'), { [BORDER_LEFT]: props.showCancelButton }]}
            style={{ color: props.confirmButtonColor }}
            loading={loading.confirm}
            disabled={props.confirmButtonDisabled}
            onClick={onConfirm}
          />
        )}
      </div>
    );

    const renderRoundButtons = () => (
      <ActionBar class={bem('footer')}>
        {props.showCancelButton && (
          <ActionBarButton
            type="warning"
            text={props.cancelButtonText || t('cancel')}
            class={bem('cancel')}
            color={props.cancelButtonColor}
            loading={loading.cancel}
            disabled={props.cancelButtonDisabled}
            onClick={onCancel}
          />
        )}
        {props.showConfirmButton && (
          <ActionBarButton
            type="danger"
            text={props.confirmButtonText || t('confirm')}
            class={bem('confirm')}
            color={props.confirmButtonColor}
            loading={loading.confirm}
            disabled={props.confirmButtonDisabled}
            onClick={onConfirm}
          />
        )}
      </ActionBar>
    );

    const renderFooter = () => {
      if (slots.footer) {
        return slots.footer();
      }
      return props.theme === 'round-button'
        ? renderRoundButtons()
        : renderButtons();
    };

    return () => {
      const { width, title, theme, message, className } = props;
      return (
        <Popup
          ref={root}
          role="dialog"
          class={[bem([theme]), className]}
          style={{ width: addUnit(width) }}
          tabindex={0}
          aria-labelledby={title || message}
          onKeydown={onKeydown}
          onUpdate:show={updateShow}
          {...pick(props, popupInheritKeys)}
        >
          {renderTitle()}
          {renderContent()}
          {renderFooter()}
        </Popup>
      );
    };
  },
});
