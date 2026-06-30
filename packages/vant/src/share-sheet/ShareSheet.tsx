import { defineComponent, type ExtractPropTypes } from 'vue';

// Utils
import {
  pick,
  extend,
  truthProp,
  makeArrayProp,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';
import { popupSharedProps, popupSharedPropKeys } from '../popup/shared';

// Components
import { Icon } from '../icon';
import { Popup } from '../popup';

export type ShareSheetOption = {
  name: string;
  icon: string;
  className?: string;
  description?: string;
};

export type ShareSheetOptions = ShareSheetOption[] | ShareSheetOption[][];

const isImage = (name?: string) => name?.includes('/');

const popupInheritKeys = [
  ...popupSharedPropKeys,
  'round',
  'closeOnPopstate',
  'safeAreaInsetBottom',
] as const;

const iconMap: Record<string, string> = {
  qq: 'qq',
  link: 'link-o',
  weibo: 'weibo',
  qrcode: 'qr',
  poster: 'photo-o',
  wechat: 'wechat',
  'weapp-qrcode': 'miniprogram-o',
  'wechat-moments': 'wechat-moments',
};

const [name, bem, t] = createNamespace('share-sheet');

/**
 * @summary ShareSheet 分享面板 - 底部弹起的分享面板，用于展示各分享渠道对应的操作按钮，不含具体的分享逻辑
 * @attr {boolean} v-model:show - 是否显示分享面板，默认 false
 * @attr {ShareSheetOption[]} options - 分享选项，默认 []
 * @attr {string} title - 顶部标题
 * @attr {string} cancel-text - 取消按钮文字，传入空字符串可以隐藏按钮，默认 取消
 * @attr {string} description - 标题下方的辅助描述文字
 * @attr {boolean} round - 是否显示圆角，默认 true
 * @attr {boolean} close-on-popstate - 是否在页面回退时自动关闭，默认 true
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @slot title - 自定义顶部标题
 * @slot description - 自定义描述文字
 * @slot cancel - 自定义取消按钮内容
 * @event select - 点击分享选项时触发，参数：option: ShareSheetOption, index: number
 * @event cancel - 点击取消按钮时触发
 */
export const shareSheetProps = extend({}, popupSharedProps, {
  title: String,
  round: truthProp,
  options: makeArrayProp<ShareSheetOption | ShareSheetOption[]>(),
  cancelText: String,
  description: String,
  closeOnPopstate: truthProp,
  safeAreaInsetBottom: truthProp,
});

export type ShareSheetProps = ExtractPropTypes<typeof shareSheetProps>;

export default defineComponent({
  name,

  props: shareSheetProps,

  emits: ['cancel', 'select', 'update:show'],

  setup(props, { emit, slots }) {
    const updateShow = (value: boolean) => emit('update:show', value);

    const onCancel = () => {
      updateShow(false);
      emit('cancel');
    };

    const onSelect = (option: ShareSheetOption, index: number) =>
      emit('select', option, index);

    const renderHeader = () => {
      const title = slots.title ? slots.title() : props.title;
      const description = slots.description
        ? slots.description()
        : props.description;

      if (title || description) {
        return (
          <div class={bem('header')}>
            {title && <h2 class={bem('title')}>{title}</h2>}
            {description && (
              <span class={bem('description')}>{description}</span>
            )}
          </div>
        );
      }
    };

    const renderIcon = (icon: string) => {
      if (isImage(icon)) {
        return <img src={icon} class={bem('image-icon')} />;
      }
      return (
        <div class={bem('icon', [icon])}>
          <Icon name={iconMap[icon] || icon} />
        </div>
      );
    };

    const renderOption = (option: ShareSheetOption, index: number) => {
      const { name, icon, className, description } = option;
      return (
        <div
          role="button"
          tabindex={0}
          class={[bem('option'), className, HAPTICS_FEEDBACK]}
          onClick={() => onSelect(option, index)}
        >
          {renderIcon(icon)}
          {name && <span class={bem('name')}>{name}</span>}
          {description && (
            <span class={bem('option-description')}>{description}</span>
          )}
        </div>
      );
    };

    const renderOptions = (options: ShareSheetOption[], border?: boolean) => (
      <div class={bem('options', { border })}>{options.map(renderOption)}</div>
    );

    const renderRows = () => {
      const { options } = props;
      if (Array.isArray(options[0])) {
        return (options as ShareSheetOption[][]).map((item, index) =>
          renderOptions(item, index !== 0),
        );
      }
      return renderOptions(options as ShareSheetOption[]);
    };

    const renderCancelButton = () => {
      const cancelText = props.cancelText ?? t('cancel');
      if (slots.cancel || cancelText) {
        return (
          <button type="button" class={bem('cancel')} onClick={onCancel}>
            {slots.cancel ? slots.cancel() : cancelText}
          </button>
        );
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
        {renderRows()}
        {renderCancelButton()}
      </Popup>
    );
  },
});
