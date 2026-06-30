import {
  ref,
  defineComponent,
  type CSSProperties,
  type ExtractPropTypes,
} from 'vue';

// Utils
import {
  truthProp,
  numericProp,
  BORDER_BOTTOM,
  getZIndexStyle,
  createNamespace,
  HAPTICS_FEEDBACK,
} from '../utils';

// Composables
import { usePlaceholder } from '../composables/use-placeholder';

// Components
import { Icon } from '../icon';

const [name, bem] = createNamespace('nav-bar');

/**
 * @summary NavBar 导航栏 - 为页面提供导航功能，常用于页面顶部
 * @attr {string} title - 标题
 * @attr {string} left-text - 左侧文案
 * @attr {string} right-text - 右侧文案
 * @attr {boolean} left-disabled - 是否禁用左侧按钮，默认 false
 * @attr {boolean} right-disabled - 是否禁用右侧按钮，默认 false
 * @attr {boolean} left-arrow - 是否显示左侧箭头，默认 false
 * @attr {boolean} border - 是否显示下边框，默认 true
 * @attr {boolean} fixed - 是否固定在顶部，默认 false
 * @attr {boolean} placeholder - 固定在顶部时，是否在标签位置生成一个等高的占位元素，默认 false
 * @attr {number|string} z-index - 导航栏 z-index，默认 1
 * @attr {boolean} safe-area-inset-top - 是否开启顶部安全区适配，默认 false
 * @attr {boolean} clickable - 是否开启两侧按钮的点击反馈，默认 true
 * @slot title - 自定义标题
 * @slot left - 自定义左侧区域内容
 * @slot right - 自定义右侧区域内容
 * @event click-left - 点击左侧按钮时触发，参数：event: MouseEvent
 * @event click-right - 点击右侧按钮时触发，参数：event: MouseEvent
 */
export const navBarProps = {
  title: String,
  fixed: Boolean,
  zIndex: numericProp,
  border: truthProp,
  leftText: String,
  rightText: String,
  leftDisabled: Boolean,
  rightDisabled: Boolean,
  leftArrow: Boolean,
  placeholder: Boolean,
  safeAreaInsetTop: Boolean,
  clickable: truthProp,
};

export type NavBarProps = ExtractPropTypes<typeof navBarProps>;

export default defineComponent({
  name,

  props: navBarProps,

  emits: ['clickLeft', 'clickRight'],

  setup(props, { emit, slots }) {
    const navBarRef = ref<HTMLElement>();
    const renderPlaceholder = usePlaceholder(navBarRef, bem);

    const onClickLeft = (event: MouseEvent) => {
      if (!props.leftDisabled) {
        emit('clickLeft', event);
      }
    };
    const onClickRight = (event: MouseEvent) => {
      if (!props.rightDisabled) {
        emit('clickRight', event);
      }
    };

    const renderLeft = () => {
      if (slots.left) {
        return slots.left();
      }

      return [
        props.leftArrow && <Icon class={bem('arrow')} name="arrow-left" />,
        props.leftText && <span class={bem('text')}>{props.leftText}</span>,
      ];
    };

    const renderRight = () => {
      if (slots.right) {
        return slots.right();
      }

      return <span class={bem('text')}>{props.rightText}</span>;
    };

    const renderNavBar = () => {
      const { title, fixed, border, zIndex } = props;
      const style: CSSProperties = getZIndexStyle(zIndex);

      const hasLeft = props.leftArrow || props.leftText || slots.left;
      const hasRight = props.rightText || slots.right;

      return (
        <div
          ref={navBarRef}
          style={style}
          class={[
            bem({ fixed }),
            {
              [BORDER_BOTTOM]: border,
              'van-safe-area-top': props.safeAreaInsetTop,
            },
          ]}
        >
          <div class={bem('content')}>
            {hasLeft && (
              <div
                class={[
                  bem('left', { disabled: props.leftDisabled }),
                  props.clickable && !props.leftDisabled
                    ? HAPTICS_FEEDBACK
                    : '',
                ]}
                onClick={onClickLeft}
              >
                {renderLeft()}
              </div>
            )}
            <div class={[bem('title'), 'van-ellipsis']}>
              {slots.title ? slots.title() : title}
            </div>
            {hasRight && (
              <div
                class={[
                  bem('right', { disabled: props.rightDisabled }),
                  props.clickable && !props.rightDisabled
                    ? HAPTICS_FEEDBACK
                    : '',
                ]}
                onClick={onClickRight}
              >
                {renderRight()}
              </div>
            )}
          </div>
        </div>
      );
    };

    return () => {
      if (props.fixed && props.placeholder) {
        return renderPlaceholder(renderNavBar);
      }
      return renderNavBar();
    };
  },
});
