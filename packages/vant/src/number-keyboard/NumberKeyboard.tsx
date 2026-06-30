import {
  ref,
  watch,
  computed,
  Teleport,
  Transition,
  defineComponent,
  type Slot,
  type PropType,
  type TeleportProps,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  truthProp,
  numericProp,
  getZIndexStyle,
  makeStringProp,
  makeNumericProp,
  stopPropagation,
  createNamespace,
  HAPTICS_FEEDBACK,
  type Numeric,
} from '../utils';

// Composables
import { useClickAway } from '@vant/use';

// Components
import NumberKeyboardKey, { KeyType } from './NumberKeyboardKey';

const [name, bem] = createNamespace('number-keyboard');

export type NumberKeyboardTheme = 'default' | 'custom';

type KeyConfig = {
  text?: Numeric;
  type?: KeyType;
  color?: string;
  wider?: boolean;
};

/**
 * @summary NumberKeyboard 数字键盘 - 虚拟数字键盘，可以配合密码输入框组件或自定义的输入框组件使用
 * @attr {string} v-model - 当前输入值
 * @attr {boolean} show - 是否显示键盘
 * @attr {string} title - 键盘标题
 * @attr {NumberKeyboardTheme} theme - 样式风格，可选值为 custom，默认 default
 * @attr {number|string} maxlength - 输入值最大长度，默认 Infinity
 * @attr {boolean} transition - 是否开启过场动画，默认 true
 * @attr {number|string} z-index - 键盘 z-index 层级，默认 100
 * @attr {string|string[]} extra-key - 底部额外按键的内容，默认 ''
 * @attr {string} close-button-text - 关闭按钮文字，空则不展示
 * @attr {string} delete-button-text - 删除按钮文字，空则展示删除图标
 * @attr {boolean} close-button-loading - 是否将关闭按钮设置为加载中状态，仅在 theme="custom" 时有效，默认 false
 * @attr {boolean} show-delete-key - 是否展示删除图标，默认 true
 * @attr {boolean} blur-on-close - 是否在点击关闭按钮时触发 blur 事件，默认 true
 * @attr {boolean} hide-on-click-outside - 是否在点击外部时收起键盘，默认 true
 * @attr {string|Element} teleport - 指定挂载的节点
 * @attr {boolean} safe-area-inset-bottom - 是否开启底部安全区适配，默认 true
 * @attr {boolean} random-key-order - 是否通过随机顺序展示按键，默认 false
 * @slot delete - 自定义删除按键内容
 * @slot extra-key - 自定义左下角按键内容
 * @slot title-left - 自定义标题栏左侧内容
 * @event input - 点击按键时触发，参数：key: string
 * @event delete - 点击删除键时触发
 * @event close - 点击关闭按钮时触发
 * @event blur - 点击关闭按钮或非键盘区域时触发
 * @event show - 键盘完全弹出时触发
 * @event hide - 键盘完全收起时触发
 */
export const numberKeyboardProps = {
  show: Boolean,
  title: String,
  theme: makeStringProp<NumberKeyboardTheme>('default'),
  zIndex: numericProp,
  teleport: [String, Object] as PropType<TeleportProps['to']>,
  maxlength: makeNumericProp(Infinity),
  modelValue: makeStringProp(''),
  transition: truthProp,
  blurOnClose: truthProp,
  showDeleteKey: truthProp,
  randomKeyOrder: Boolean,
  closeButtonText: String,
  deleteButtonText: String,
  closeButtonLoading: Boolean,
  hideOnClickOutside: truthProp,
  safeAreaInsetBottom: truthProp,
  extraKey: {
    type: [String, Array] as PropType<string | string[]>,
    default: '',
  },
};

export type NumberKeyboardProps = ExtractPropTypes<typeof numberKeyboardProps>;

function shuffle(array: unknown[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

export default defineComponent({
  name,

  inheritAttrs: false,

  props: numberKeyboardProps,

  emits: [
    'show',
    'hide',
    'blur',
    'input',
    'close',
    'delete',
    'update:modelValue',
  ],

  setup(props, { emit, slots, attrs }) {
    const root = ref<HTMLElement>();

    const genBasicKeys = () => {
      const keys: KeyConfig[] = Array(9)
        .fill('')
        .map((_, i) => ({ text: i + 1 }));

      if (props.randomKeyOrder) {
        shuffle(keys);
      }

      return keys;
    };

    const genDefaultKeys = (): KeyConfig[] => [
      ...genBasicKeys(),
      { text: props.extraKey as string, type: 'extra' },
      { text: 0 },
      {
        text: props.showDeleteKey ? props.deleteButtonText : '',
        type: props.showDeleteKey ? 'delete' : '',
      },
    ];

    const genCustomKeys = () => {
      const keys = genBasicKeys();
      const { extraKey } = props;
      const extraKeys = Array.isArray(extraKey) ? extraKey : [extraKey];

      if (extraKeys.length === 0) {
        keys.push({ text: 0, wider: true });
      } else if (extraKeys.length === 1) {
        keys.push(
          { text: 0, wider: true },
          { text: extraKeys[0], type: 'extra' },
        );
      } else if (extraKeys.length === 2) {
        keys.push(
          { text: extraKeys[0], type: 'extra' },
          { text: 0 },
          { text: extraKeys[1], type: 'extra' },
        );
      }

      return keys;
    };

    const keys = computed(() =>
      props.theme === 'custom' ? genCustomKeys() : genDefaultKeys(),
    );

    const onBlur = () => {
      if (props.show) {
        emit('blur');
      }
    };

    const onClose = () => {
      emit('close');

      if (props.blurOnClose) {
        onBlur();
      }
    };

    const onAnimationEnd = () => emit(props.show ? 'show' : 'hide');

    const onPress = (text: string, type: KeyType) => {
      if (text === '') {
        if (type === 'extra') {
          onBlur();
        }
        return;
      }

      const value = props.modelValue;

      if (type === 'delete') {
        emit('delete');
        emit('update:modelValue', value.slice(0, value.length - 1));
      } else if (type === 'close') {
        onClose();
      } else if (value.length < +props.maxlength) {
        emit('input', text);
        emit('update:modelValue', value + text);
      }
    };

    const renderTitle = () => {
      const { title, theme, closeButtonText } = props;
      const leftSlot = slots['title-left'];
      const showClose = closeButtonText && theme === 'default';
      const showTitle = title || showClose || leftSlot;

      if (!showTitle) {
        return;
      }

      return (
        <div class={bem('header')}>
          {leftSlot && <span class={bem('title-left')}>{leftSlot()}</span>}
          {title && <h2 class={bem('title')}>{title}</h2>}
          {showClose && (
            <button
              type="button"
              class={[bem('close'), HAPTICS_FEEDBACK]}
              onClick={onClose}
            >
              {closeButtonText}
            </button>
          )}
        </div>
      );
    };

    const renderKeys = () =>
      keys.value.map((key) => {
        const keySlots: Record<string, Slot | undefined> = {};

        if (key.type === 'delete') {
          keySlots.default = slots.delete;
        }
        if (key.type === 'extra') {
          keySlots.default = slots['extra-key'];
        }

        return (
          <NumberKeyboardKey
            v-slots={keySlots}
            key={key.text}
            text={key.text}
            type={key.type}
            wider={key.wider}
            color={key.color}
            onPress={onPress}
          />
        );
      });

    const renderSidebar = () => {
      if (props.theme === 'custom') {
        return (
          <div class={bem('sidebar')}>
            {props.showDeleteKey && (
              <NumberKeyboardKey
                v-slots={{ default: slots.delete }}
                large
                text={props.deleteButtonText}
                type="delete"
                onPress={onPress}
              />
            )}
            <NumberKeyboardKey
              large
              text={props.closeButtonText}
              type="close"
              color="blue"
              loading={props.closeButtonLoading}
              onPress={onPress}
            />
          </div>
        );
      }
    };

    watch(
      () => props.show,
      (value) => {
        if (!props.transition) {
          emit(value ? 'show' : 'hide');
        }
      },
    );

    if (props.hideOnClickOutside) {
      useClickAway(root, onBlur, { eventName: 'touchstart' });
    }

    return () => {
      const Title = renderTitle();
      const Content = (
        <Transition name={props.transition ? 'van-slide-up' : ''}>
          <div
            v-show={props.show}
            ref={root}
            style={getZIndexStyle(props.zIndex)}
            class={bem({
              unfit: !props.safeAreaInsetBottom,
              'with-title': !!Title,
            })}
            onAnimationend={onAnimationEnd}
            onTouchstartPassive={stopPropagation}
            {...attrs}
          >
            {Title}
            <div class={bem('body')}>
              <div class={bem('keys')}>{renderKeys()}</div>
              {renderSidebar()}
            </div>
          </div>
        </Transition>
      );

      if (props.teleport) {
        return <Teleport to={props.teleport}>{Content}</Teleport>;
      }

      return Content;
    };
  },
});
